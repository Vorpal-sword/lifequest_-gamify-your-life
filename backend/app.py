import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from functools import wraps
import jwt
from datetime import datetime, timedelta, timezone
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import uuid
from dotenv import load_dotenv

# --- ІМПОРТ ДЛЯ AI СЕРВІСУ ---
from ai_quest_service import get_ai_service

# --- КОНФІГУРАЦІЯ ---
load_dotenv()

app = Flask(__name__)
CORS(app) 

MONGO_URI = os.getenv('MONGO_URI')
JWT_SECRET = os.getenv('JWT_SECRET', 'your-default-secret-key')
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')

# --- ПІДКЛЮЧЕННЯ ДО БАЗИ ДАНИХ ---
try:
    client = MongoClient(MONGO_URI)
    db = client.lifequest_db
    users_collection = db.users
    tasks_collection = db.tasks
    habits_collection = db.habits
    groups_collection = db.groups
    print("MongoDB connected successfully!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    exit()

# --- СЕРІАЛІЗАЦІЯ ДАНИХ ---
def serialize_doc(doc):
    if doc is None:
        return None
    doc['_id'] = str(doc['_id'])
    if '_id' in doc:
        doc['id'] = doc.pop('_id')
    return doc

# --- ДЕКОРАТОР ДЛЯ ЗАХИСТУ МАРШРУТІВ (JWT) ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401

        return f(current_user, *args, **kwargs)
    return decorated

# --- МАРШРУТИ API ---

# [POST] /api/auth/google - Автентифікація через Google
@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    data = request.get_json()
    token = data.get('token')
    if not token:
        return jsonify({'message': 'Google token is missing'}), 400

    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        google_user_id = idinfo['sub']

        user = users_collection.find_one({'googleId': google_user_id})
        if not user:
            new_user_data = {
                'googleId': google_user_id,
                'email': idinfo.get('email'),
                'name': idinfo.get('name'),
                'avatarUrl': idinfo.get('picture'),
                'level': 1,
                'xp': 0,
                'xpToNextLevel': 100,
                'currency': 0,
                'badges': [],
                'streaks': {'dailyTasks': 0},
                'friends': [],
                'savedAvatars': [idinfo.get('picture')] if idinfo.get('picture') else [],
                'createdAt': datetime.now(timezone.utc)
            }
            result = users_collection.insert_one(new_user_data)
            user_id = result.inserted_id
        else:
            user_id = user['_id']

        session_token = jwt.encode(
            {'user_id': str(user_id), 'exp': datetime.now(timezone.utc) + timedelta(days=7)},
            JWT_SECRET,
            algorithm="HS256"
        )
        
        user_data = serialize_doc(users_collection.find_one({'_id': ObjectId(user_id)}))
        tasks_data = [serialize_doc(task) for task in tasks_collection.find({'userId': str(user_id)})]
        habits_data = [serialize_doc(habit) for habit in habits_collection.find({'userId': str(user_id)})]
        groups_data = [serialize_doc(group) for group in groups_collection.find({'members': str(user_id)})]
        all_users_data = [serialize_doc(u) for u in users_collection.find({}, {'email': 0})]

        return jsonify({
            'token': session_token,
            'user': user_data,
            'tasks': tasks_data,
            'habits': habits_data,
            'groups': groups_data,
            'allUsers': all_users_data
        })

    except ValueError as e:
        return jsonify({'message': 'Invalid Google token', 'error': str(e)}), 401
    except Exception as e:
        return jsonify({'message': 'An error occurred during authentication', 'error': str(e)}), 500

# [GET] /api/session/restore - Відновити сесію користувача
@app.route('/api/session/restore', methods=['GET'])
@token_required
def restore_session(current_user):
    user_id = str(current_user['_id'])
    user_data = serialize_doc(current_user)
    tasks_data = [serialize_doc(task) for task in tasks_collection.find({'userId': user_id})]
    habits_data = [serialize_doc(habit) for habit in habits_collection.find({'userId': user_id})]
    groups_data = [serialize_doc(group) for group in groups_collection.find({'members': user_id})]
    all_users_data = [serialize_doc(u) for u in users_collection.find({}, {'email': 0})]
    
    return jsonify({
        'user': user_data,
        'tasks': tasks_data,
        'habits': habits_data,
        'groups': groups_data,
        'allUsers': all_users_data
    })


# [GET] /api/user - Отримати дані поточного користувача
@app.route('/api/user', methods=['GET'])
@token_required
def get_user(current_user):
    return jsonify(serialize_doc(current_user))

# [PATCH] /api/user - Оновити профіль користувача
@app.route('/api/user', methods=['PATCH'])
@token_required
def update_user_profile(current_user):
    data = request.get_json()
    update_fields = {}
    if 'name' in data:
        update_fields['name'] = data['name']
    if 'avatarUrl' in data:
        update_fields['avatarUrl'] = data['avatarUrl']
    if 'savedAvatars' in data:
        update_fields['savedAvatars'] = data['savedAvatars']

    if update_fields:
        users_collection.update_one({'_id': current_user['_id']}, {'$set': update_fields})
    
    updated_user = users_collection.find_one({'_id': current_user['_id']})
    return jsonify(serialize_doc(updated_user))


# --- ЗАВДАННЯ (TASKS) ---

# [POST] /api/tasks - Створити нове завдання
@app.route('/api/tasks', methods=['POST'])
@token_required
def create_task(current_user):
    data = request.get_json()
    new_task = {
        'userId': str(current_user['_id']),
        'title': data.get('title'),
        'description': data.get('description', ''),
        'type': data.get('type'), # 'daily' or 'quest'
        'xp': data.get('xp', 10),
        'currencyReward': data.get('currencyReward', 5),
        'completed': False,
        'estimate': data.get('estimate'),
        'isCounter': data.get('isCounter', False),
        'progress': 0 if data.get('isCounter') else None,
        'target': data.get('target') if data.get('isCounter') else None,
        'questOriginGroupId': data.get('questOriginGroupId'), # Посилання на групу, якщо це груповий квест
        'createdAt': datetime.now(timezone.utc)
    }
    result = tasks_collection.insert_one(new_task)
    created_task = tasks_collection.find_one({'_id': result.inserted_id})
    return jsonify(serialize_doc(created_task)), 201

# [PUT] /api/tasks/<task_id>/toggle - Переключити статус виконання завдання
@app.route('/api/tasks/<task_id>/toggle', methods=['PUT'])
@token_required
def toggle_task(current_user, task_id):
    task = tasks_collection.find_one({'_id': ObjectId(task_id)})
    if not task:
        return jsonify({'message': 'Task not found'}), 404
    
    # Дозволити будь-якому члену групи переключати груповий квест
    is_group_quest = task.get('questOriginGroupId')
    if is_group_quest:
        group = groups_collection.find_one({'_id': ObjectId(task['questOriginGroupId'])})
        if not group or str(current_user['_id']) not in group.get('members', []):
            return jsonify({'message': 'Access denied to this group quest'}), 403
    elif task.get('userId') != str(current_user['_id']):
        return jsonify({'message': 'Access denied'}), 403

    new_status = not task.get('completed', False)
    tasks_collection.update_one({'_id': ObjectId(task_id)}, {'$set': {'completed': new_status}})
    return jsonify({'message': 'Task status updated'}), 200

# [PUT] /api/tasks/<task_id>/progress - Оновити прогрес для завдання-лічильника
@app.route('/api/tasks/<task_id>/progress', methods=['PUT'])
@token_required
def update_task_progress_route(current_user, task_id):
    data = request.get_json()
    new_progress = data.get('progress')

    task = tasks_collection.find_one({'_id': ObjectId(task_id)})
    if not task or not task.get('isCounter'):
        return jsonify({'message': 'Counter task not found'}), 404

    is_group_quest = task.get('questOriginGroupId')
    if is_group_quest:
        group = groups_collection.find_one({'_id': ObjectId(task['questOriginGroupId'])})
        if not group or str(current_user['_id']) not in group.get('members', []):
            return jsonify({'message': 'Access denied to this group quest'}), 403
    elif task.get('userId') != str(current_user['_id']):
        return jsonify({'message': 'Access denied'}), 403

    tasks_collection.update_one({'_id': ObjectId(task_id)}, {'$set': {'progress': new_progress}})
    return jsonify({'message': 'Task progress updated'}), 200

# --- ЗВИЧКИ (HABITS) ---

# [POST] /api/habits - Створити нову звичку
@app.route('/api/habits', methods=['POST'])
@token_required
def create_habit(current_user):
    data = request.get_json()
    new_habit = {
        'userId': str(current_user['_id']),
        'title': data.get('title'),
        'description': data.get('description', ''),
        'xpPerDay': data.get('xpPerDay', 5),
        'currencyRewardPerDay': data.get('currencyRewardPerDay', 2),
        'estimatePerDay': data.get('estimatePerDay', 10),
        'startDate': datetime.now(timezone.utc).isoformat(),
        'durationDays': data.get('durationDays', 30),
        'history': {},
        'createdAt': datetime.now(timezone.utc)
    }
    result = habits_collection.insert_one(new_habit)
    created_habit = habits_collection.find_one({'_id': result.inserted_id})
    return jsonify(serialize_doc(created_habit)), 201
    
# [PUT] /api/habits/<habit_id>/toggle - Відмітити день у звичці
@app.route('/api/habits/<habit_id>/toggle', methods=['PUT'])
@token_required
def toggle_habit_day(current_user, habit_id):
    data = request.get_json()
    day_number = str(data.get('dayNumber'))
    
    habit = habits_collection.find_one({'_id': ObjectId(habit_id), 'userId': str(current_user['_id'])})
    if not habit:
        return jsonify({'message': 'Habit not found or access denied'}), 404

    current_status = habit.get('history', {}).get(day_number)
    new_status = 'completed' if current_status != 'completed' else 'pending'
    
    update_query = {f'history.{day_number}': new_status}
    habits_collection.update_one({'_id': ObjectId(habit_id)}, {'$set': update_query})

    return jsonify({'message': 'Habit history updated'}), 200

# --- СОЦІАЛЬНІ ФУНКЦІЇ (ДРУЗІ, ГРУПИ) ---

@app.route('/api/friends', methods=['POST'])
@token_required
def add_friend_route(current_user):
    data = request.get_json()
    friend_id_to_add = data.get('friendId')
    
    if not friend_id_to_add:
        return jsonify({'message': 'Friend ID is required'}), 400
    if str(current_user['_id']) == friend_id_to_add:
        return jsonify({'message': 'Cannot add yourself as a friend'}), 400

    # Додати друга до списку поточного користувача
    users_collection.update_one(
        {'_id': current_user['_id']},
        {'$addToSet': {'friends': friend_id_to_add}}
    )
    # Додати поточного користувача до списку нового друга (взаємна дружба)
    users_collection.update_one(
        {'_id': ObjectId(friend_id_to_add)},
        {'$addToSet': {'friends': str(current_user['_id'])}}
    )
    
    updated_user = users_collection.find_one({'_id': current_user['_id']})
    return jsonify(serialize_doc(updated_user)), 200


@app.route('/api/groups', methods=['POST'])
@token_required
def create_group_route(current_user):
    data = request.get_json()
    user_id = str(current_user['_id'])
    
    new_group_data = {
        'name': data.get('name'),
        'description': data.get('description', ''),
        'leaderId': user_id,
        'members': list(set(data.get('members', []) + [user_id])), # Гарантувати, що лідер є членом
        'activeQuest': data.get('activeQuest'),
        'activeQuestTarget': data.get('activeQuestTarget'),
        'activeQuestEstimate': data.get('activeQuestEstimate'),
        'createdAt': datetime.now(timezone.utc)
    }
    
    result = groups_collection.insert_one(new_group_data)
    created_group = groups_collection.find_one({'_id': result.inserted_id})
    
    # Якщо група має активний квест, створити відповідне завдання
    created_task = None
    if created_group and created_group.get('activeQuest'):
        quest_task_data = {
            'userId': user_id, # Можна призначити творцю
            'title': created_group['activeQuest'],
            'description': f"Group quest for '{created_group['name']}'",
            'type': 'quest',
            'xp': 100, # Приклад значення, може бути динамічним
            'currencyReward': 50, # Приклад значення
            'completed': False,
            'estimate': created_group.get('activeQuestEstimate'),
            'isCounter': True,
            'progress': 0,
            'target': created_group.get('activeQuestTarget'),
            'questOriginGroupId': str(created_group['_id']),
            'createdAt': datetime.now(timezone.utc)
        }
        task_result = tasks_collection.insert_one(quest_task_data)
        created_task = tasks_collection.find_one({'_id': task_result.inserted_id})

    return jsonify({
        'group': serialize_doc(created_group),
        'task': serialize_doc(created_task)
    }), 201


@app.route('/api/groups/<group_id>', methods=['PATCH'])
@token_required
def update_group_route(current_user, group_id):
    group = groups_collection.find_one({'_id': ObjectId(group_id)})
    if not group or group.get('leaderId') != str(current_user['_id']):
        return jsonify({'message': 'Group not found or you are not the leader'}), 404

    data = request.get_json()
    update_fields = {}
    if 'name' in data: update_fields['name'] = data['name']
    if 'description' in data: update_fields['description'] = data['description']
    if 'members' in data: update_fields['members'] = data['members']
    # Можливо, знадобиться складніша логіка для оновлення квестів, наприклад, створення нового завдання
    if 'activeQuest' in data: update_fields['activeQuest'] = data['activeQuest']
    if 'activeQuestTarget' in data: update_fields['activeQuestTarget'] = data['activeQuestTarget']
    
    if update_fields:
        groups_collection.update_one({'_id': ObjectId(group_id)}, {'$set': update_fields})
    
    updated_group = groups_collection.find_one({'_id': ObjectId(group_id)})
    return jsonify(serialize_doc(updated_group)), 200


@app.route('/api/groups/<group_id>/leave', methods=['POST'])
@token_required
def leave_group_route(current_user, group_id):
    user_id = str(current_user['_id'])
    
    # Видалити користувача зі списку членів групи
    result = groups_collection.update_one(
        {'_id': ObjectId(group_id)},
        {'$pull': {'members': user_id}}
    )
    
    if result.matched_count == 0:
        return jsonify({'message': 'Group not found'}), 404
        
    group = groups_collection.find_one({'_id': ObjectId(group_id)})
    # Якщо група стала порожньою або лідер вийшов, видалити її
    if not group.get('members') or group.get('leaderId') == user_id:
        groups_collection.delete_one({'_id': ObjectId(group_id)})
        # Також видалити пов'язане завдання-квест
        tasks_collection.delete_many({'questOriginGroupId': group_id})
        return jsonify({'message': 'Successfully left and deleted empty group'}), 200

    return jsonify({'message': 'Successfully left group'}), 200

# --- МАРШРУТИ ІНТЕГРАЦІЇ AI ---

@app.route('/api/ai/analyze', methods=['POST'])
def ai_analyze():
    """
    AI аналіз користувача
    """
    try:
        # Отримуємо дані з запиту
        user_data = request.get_json()
        
        if not user_data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Отримуємо AI сервіс
        ai_service = get_ai_service()
        
        # Аналізуємо користувача
        recommendations = ai_service.analyze_user(user_data)
        
        return jsonify({
            'success': True,
            'data': recommendations
        }), 200
        
    except Exception as e:
        print(f"Error in AI analysis: {e}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ai/health', methods=['GET'])
def ai_health():
    """Перевірка роботи AI системи"""
    try:
        ai_service = get_ai_service()
        return jsonify({
            'status': 'ok',
            'message': 'AI system is running',
            'rules_count': len(ai_service.kb.rules)
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/ai/test', methods=['GET'])
def ai_test():
    """Тестовий endpoint для перевірки AI"""
    try:
        ai_service = get_ai_service()
        
        # Тестові дані
        test_user = {
            'level': 0,
            'xp': 0,
            'total_tasks': 0,
            'tasks_today': 0,
            'streak_days': 0
        }
        
        result = ai_service.analyze_user(test_user)
        
        return jsonify({
            'success': True,
            'test_data': test_user,
            'result': result
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# --- ЗАПУСК СЕРВЕРА ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)