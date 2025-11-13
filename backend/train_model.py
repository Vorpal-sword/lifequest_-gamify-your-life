import pandas as pd
from sklearn.svm import SVR # Використовуємо регресор (SVR), бо вихід - число 0-100
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import numpy as np

def train_and_save_model():
    """
    Створює фейковий датасет, тренує SVR-модель
    і зберігає її у файл .pkl.
    """
    
    # 1. Створення фейкового датасету (у реальному житті це був би CSV)
    # [stress (1-10), tasks_today (0-10), streak (0+)] -> productivity_score (0-100)
    data = {
        'stress':       [10, 9, 8,  7,  6,  5,  4,  3,  2,  1,  8,  5],
        'tasks_today':  [0,  1,  0,  2,  1,  3,  5,  4,  8,  7,  1,  6],
        'streak_days':  [0,  0,  1,  0,  1,  2,  3,  5,  7,  10, 0,  3],
        'productivity': [10, 20, 15, 40, 35, 70, 80, 85, 95, 100, 25, 75]
    }
    df = pd.DataFrame(data)

    X = df[['stress', 'tasks_today', 'streak_days']]
    y = df['productivity']

    # 2. Масштабування даних (дуже важливо для SVM)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 3. Навчання моделі SVR
    # Ми використовуємо 'rbf' ядро, C=10 - робить модель більш "агресивною"
    model = SVR(kernel='rbf', C=10.0, gamma='auto')
    model.fit(X_scaled, y)

    # 4. Збереження моделі та скейлера
    joblib.dump(model, 'productivity_model.pkl')
    joblib.dump(scaler, 'scaler.pkl')
    
    print("--- Модель ML (SVM/SVR) успішно навчена! ---")
    print("Файли 'productivity_model.pkl' та 'scaler.pkl' створено.")
    
    # 5. Тестовий прогноз
    test_input = np.array([[10, 0, 0]]) # Очікуємо низьку продуктивність
    test_input_scaled = scaler.transform(test_input)
    prediction = model.predict(test_input_scaled)
    print(f"Тестовий прогноз для {test_input}: {prediction[0]:.2f}%")

if __name__ == "__main__":
    train_and_save_model()