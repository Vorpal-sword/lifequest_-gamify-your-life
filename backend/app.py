import os
import datetime
from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import jwt
from pymongo import MongoClient
from pymongo.collection import ReturnDocument

# Завантажуємо змінні середовища з .env файлу
load_dotenv()

# Ініціалізація Flask додатку
app = Flask(__name__)
# Дозволяємо запити з будь-якого джерела (важливо для розробки)
CORS(app)

# Підключення до бази даних MongoDB
try:
    client = MongoClient(os.getenv("MONGO_URI"))
    # Створюємо або підключаємось до бази даних 'lifequest_db'
    db = client.lifequest_db
    # Створюємо або підключаємось до колекції 'users'
    users_collection = db.users
    print("✅ MongoDB connected successfully!")
except Exception as e:
    print(f"❌ Error connecting to MongoDB: {e}")
    client = None

# Завантажуємо секрети з .env
JWT_SECRET = os.getenv("JWT_SECRET")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")


@app.route('/api/auth/google', methods=['POST'])
def auth_google():
    """
    Цей ендпоінт обробляє вхід через Google.
    1. Приймає токен від фронтенду.
    2. Верифікує його з серверами Google.
    3. Знаходить існуючого користувача в MongoDB або створює нового.
    4. Створює наш власний токен сесії (JWT).
    5. Повертає токен сесії та всі дані користувача на фронтенд.
    """
    if not client:
        return jsonify({"message": "Database connection failed"}), 500

    data = request.get_json()
    google_token = data.get('token')

    if not google_token:
        return jsonify({"message": "Missing Google token"}), 400

    try:
        # Крок 2: Верифікація токену
        id_info = id_token.verify_oauth2_token(
            google_token, google_requests.Request(), GOOGLE_CLIENT_ID
        )

        email = id_info['email']
        name = id_info['name']
        avatar_url = id_info['picture']
        google_id = id_info['sub']

        # Крок 3: Знаходимо або створюємо користувача
        # find_one_and_update з upsert=True - це ідеальний спосіб зробити це одним запитом
        user_data = users_collection.find_one_and_update(
            {'email': email},
            {
                '$setOnInsert': {
                    'googleId': google_id,
                    'name': name,
                    'email': email,
                    'avatarUrl': avatar_url,
                    'level': 1,
                    'xp': 0,
                    'xpToNextLevel': 100,
                    'currency': 0,
                    'badges': [],
                    'streaks': {'dailyTasks': 0},
                    'friends': [],
                    'savedAvatars': [avatar_url]
                }
            },
            upsert=True,
            return_document=ReturnDocument.AFTER
        )

        # Конвертуємо ObjectId в рядок для JSON і перейменовуємо '_id' в 'id'
        user_data['id'] = str(user_data.pop('_id'))

        # Крок 4: Створюємо наш токен сесії, який буде жити 7 днів
        session_token = jwt.encode(
            {
                'userId': user_data['id'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
            },
            JWT_SECRET,
            algorithm="HS256"
        )

        # Крок 5: Повертаємо дані на фронтенд
        # TODO: В майбутньому тут потрібно буде завантажувати реальні таски, групи і т.д.
        return jsonify({
            "token": session_token,
            "user": user_data,
            "tasks": [],
            "habits": [],
            "groups": [],
            "allUsers": []
        })

    except ValueError as e:
        print(f"❌ Token verification failed: {e}")
        return jsonify({"message": "Invalid Google token"}), 401
    except Exception as e:
        print(f"❌ An error occurred: {e}")
        return jsonify({"message": "An internal server error occurred"}), 500

# Цей блок запускає сервер, коли ви виконуєте 'python app.py'
if __name__ == '__main__':
    # debug=True автоматично перезавантажує сервер при змінах у коді
    app.run(debug=True, port=8080)