"""
AI Quest Service для LifeQuest
* ФІНАЛЬНА ВЕРСІЯ: ВИПРАВЛЕНО CRITICAL Key Error: 'message' -> 'text'.
"""
import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

# ФІКС: Правильні імпорти для Fuzzy Logic
from rule_engine import FuzzyKnowledgeBase, FuzzyInferenceEngine 

class AIQuestService:
    
    def __init__(self, rule_engine: FuzzyInferenceEngine, kb: FuzzyKnowledgeBase):
        self.engine = rule_engine
        self.kb = kb
    
    def analyze_user(self, user_data: Dict[str, Any], ml_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Аналізує користувача, використовуючи нечітку логіку (Fuzzy Logic).
        """
        
        # 1. Готуємо ЧІТКІ вхідні дані для Fuzzy Engine
        inputs = {
            "stress": user_data.get('stress_level', 5),
            "sitting": user_data.get('sitting_hours', 0),
            "productivity": min(user_data.get('tasks_completed_today', 0) * 2, 10), 
            "level": user_data.get('level', 1),
            "time_of_day": user_data.get('current_hour', datetime.now().hour),
            "ml_prediction": ml_results.get('predicted_productivity_score', 50) 
        }
        
        # 2. Виконуємо логічне виведення
        fuzzy_results = self.engine.evaluate(inputs)
        
        # 3. Форматуємо результат для фронтенду
        recommendations = self._format_recommendations(user_data, fuzzy_results)
        
        return recommendations
    
    
    def _format_recommendations(self, user_data: Dict, fuzzy_results: List[Dict]) -> Dict[str, Any]:
        """
        Форматує результати нечіткого виведення для фронтенду.
        * Застосовує "Winner Takes All" (Топ-1) для UI. *
        """
        
        recommendations = {
            'status': f"Рівень {user_data.get('level', 1)}",
            'quests': [],
            'health_tips': [],
            'notifications': [],
            'analytics': {
                'rules_fired': 0,
                'fuzzy_results_for_teacher': fuzzy_results # Звіт для викладача
            }
        }
        
        if not fuzzy_results: return recommendations

        top_result = fuzzy_results[0]
        all_advice = top_result.get('all_advice', [])
        
        recommendations['analytics']['rules_fired'] = len(all_advice)

        if not all_advice: return recommendations

        # Конвертуємо "Пріоритет Поради" у візуальне представлення
        priority_score = top_result.get('crisp_score', 0)
        priority_level = "low"
        if priority_score >= 70: priority_level = "high"
        elif priority_score >= 40: priority_level = "medium"

        # --- Тимчасові списки для сегментації ---
        health_and_wellness_tips = []
        status_and_progress_notifications = []
        
        # 1. СЕГМЕНТАЦІЯ ВСІХ ПОРАД
        for advice in all_advice:
            
            advice_text_lower = advice['text'].lower()
            # ✅ ФІКС: Використовуємо 'text' як основний ключ
            tip_data = {'message': advice['text'], 'confidence': advice['confidence']}
            
            # 1.1. ЛОГІКА КВЕСТУ: Якщо порада містить 'квест' або 'звичку'
            if any(k in advice_text_lower for k in ['квест', 'завдання', 'звичку']):
                quest_name = advice['text'].replace('Ви вже Дослідник! Час створити ', '').replace('.', '').strip()
                recommendations['quests'].append({
                    'id': f'q_{hash(quest_name)}',
                    'name': quest_name,
                    'difficulty': self._determine_quest_difficulty(quest_name),
                    'xp_reward': self._calculate_quest_xp(quest_name),
                    'category': 'progress',
                    'suggested': True,
                    'confidence': advice['confidence']
                })
            
            # 1.2. ЗДОРОВ'Я/СТРЕС:
            elif any(k in advice_text_lower for k in ['стрес', 'розслаб', 'сидите', 'прогулянка', 'перерва', 'вигорання']):
                health_and_wellness_tips.append(tip_data)
            
            # 1.3. СТАТУС/МОТИВАЦІЯ/ПРОГРЕС:
            elif any(k in advice_text_lower for k in ['вітаємо', 'дослідник', 'продуктивність', 'ml-аналіз', 'сплануйте']):
                status_and_progress_notifications.append(tip_data)


        # 2. ФІЛЬТРАЦІЯ "WINNER TAKES ALL" (по категоріях)

        # А) ЗДОРОВ'Я/СТРЕС: Winner Takes All (Топ-1)
        health_and_wellness_tips.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        if health_and_wellness_tips:
            top_health_tip = health_and_wellness_tips[0]
            recommendations['health_tips'].append({
                'id': 'health_tip_final',
                'type': f"Порада (Здоров'я, Пріоритет: {priority_score:.0f}%)",
                # ✅ ФІКС: Використовуємо 'message'
                'message': top_health_tip['message'],
                'priority': priority_level,
                # ✅ ФІКС: Використовуємо 'message' для перевірки
                'icon': '🧘' if 'стрес' in top_health_tip['message'].lower() else '💪',
                'confidence': top_health_tip['confidence']
            })
        
        # Б) СТАТУС/ПРОГРЕС: Winner Takes All (Топ-1)
        status_and_progress_notifications.sort(key=lambda x: x.get('confidence', 0), reverse=True)

        if status_and_progress_notifications:
            top_status_tip = status_and_progress_notifications[0]
            recommendations['notifications'].append({
                'id': 'status_notif_final',
                'type': "Ваш Прогрес",
                'title': "Ваше Нагадування",
                'message': top_status_tip['message'],
                'priority': priority_level,
                'icon': '✨',
                'confidence': top_status_tip['confidence']
            })
        
        return recommendations

    # --- ДОПОМІЖНІ ФУНКЦІЇ ---

    def _determine_quest_difficulty(self, quest_name: str) -> str:
        if not quest_name: return 'easy'
        quest_name = str(quest_name).lower()
        if 'перше' in quest_name or 'знайомство' in quest_name or '5 хв' in quest_name:
            return 'easy'
        elif 'майстер' in quest_name or 'марафон' in quest_name:
            return 'hard'
        return 'medium'
    
    def _calculate_quest_xp(self, quest_name: str) -> int:
        difficulty = self._determine_quest_difficulty(quest_name)
        difficulty_xp = {'easy': 10, 'medium': 25, 'hard': 50}
        return difficulty_xp.get(difficulty, 25)
    
    def _determine_quest_category(self, quest_name: str) -> str:
        if not quest_name: return 'general'
        quest_name = str(quest_name).lower()
        if 'команд' in quest_name:
            return 'team'
        elif 'челендж' in quest_name:
            return 'challenge'
        elif 'продуктивн' in quest_name:
            return 'productivity'
        return 'general'


# --- Глобальний інстанс (без змін) ---
_ai_service_instance = None

def load_kb_and_engine():
    from rule_engine import FuzzyKnowledgeBase, FuzzyInferenceEngine
    
    rules_file_path = Path(__file__).parent / 'data' / 'lifequest_rules.json'
    with open(rules_file_path, 'r', encoding='utf-8') as f:
        rules_json = json.load(f)
        
        kb_new = FuzzyKnowledgeBase(rules_json)
        engine_new = FuzzyInferenceEngine(kb_new)
        return engine_new, kb_new

def get_ai_service():
    global _ai_service_instance
    if _ai_service_instance is None:
        engine_new, kb_new = load_kb_and_engine()
        _ai_service_instance = AIQuestService(engine_new, kb_new)
    return _ai_service_instance