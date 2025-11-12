"""
ДОДАЙТЕ ЦЕЙ КОД В ВАШ app.py
"""

# ============================================
# КРОК 1: Додайте імпорти на початку файлу
# ============================================

from ai_quest_service import get_ai_service
from flask_cors import CORS  # Якщо ще немає

# ============================================
# КРОК 2: Додайте CORS (якщо ще немає)
# ============================================

# Після app = Flask(__name__)
CORS(app)  # Дозволяє запити з фронтенду

# ============================================
# КРОК 3: Додайте ці endpoints
# ============================================

@app.route('/api/ai/analyze', methods=['POST'])
def ai_analyze():
    """
    AI аналіз користувача
    
    Request Body:
    {
        "user_id": 123,
        "level": 2,
        "xp": 150,
        "total_tasks": 25,
        "tasks_today": 3,
        "streak_days": 5,
        "work_hours_today": 4,
        "sitting_hours": 6,
        "stress_level": 5
    }
    
    Response:
    {
        "success": true,
        "data": {
            "status": "Досвідчений",
            "achievements": [...],
            "quests": [...],
            "health_tips": [...],
            "notifications": [...],
            "rewards": {...}
        }
    }
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
