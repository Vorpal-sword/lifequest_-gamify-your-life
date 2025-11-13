"""
AI Quest Service для LifeQuest
* ОНОВЛЕНО ДЛЯ ЛАБОРАТОРНОЇ 2 *
- Інтегрується з rule_engine.py, що підтримує Коефіцієнти Упевненості (CF)
- Конвертує вхідні дані в факти з CF
- Форматує висновки (поради, квести, статуси) для фронтенду
"""
import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime


class AIQuestService:
    """Сервіс для AI рекомендацій в LifeQuest"""
    
    def __init__(self, rule_engine, kb):
        """
        Args:
            rule_engine: інстанс вашого існуючого rule_engine
            kb: інстанс вашої knowledge base
        """
        self.engine = rule_engine
        self.kb = kb
    
    def analyze_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Аналізує користувача та повертає рекомендації
        """
        # 1. Очищаємо попередній стан
        self.kb.clear_facts()
        self.kb.reset_rule_counters()
        
        # 2. Конвертуємо дані користувача у факти (вже з CF)
        facts = self._convert_user_data_to_facts(user_data)
        
        # 3. Додаємо факти в базу знань
        for fact in facts:
            self.kb.add_fact(fact)
        
        # 4. Виконуємо логічне виведення (з CF)
        result = self.engine.forward_chain()
        
        # 5. Форматуємо результат для фронтенду
        recommendations = self._format_recommendations(result)
        
        return recommendations
    
    def _convert_user_data_to_facts(self, user_data: Dict) -> List:
        """
        Конвертує дані користувача у факти для rule engine.
        * Оновлено для Лаб. 2: додає Коефіцієнти Упевненості (CF) *
        """
        from rule_engine import Fact
        
        facts = []
        
        # --- Об'єктивні факти (CF = 1.0) ---
        facts.append(Fact('user_level', user_data.get('level', 1), confidence=1.0))
        facts.append(Fact('user_xp', user_data.get('xp', 0), confidence=1.0))
        facts.append(Fact('total_tasks', user_data.get('total_tasks', 0), confidence=1.0))
        facts.append(Fact('tasks_completed_today', user_data.get('tasks_completed_today', 0), confidence=1.0))
        facts.append(Fact('tasks_completed_this_week', user_data.get('tasks_completed_this_week', 0), confidence=1.0))
        facts.append(Fact('streak_days', user_data.get('streak_days', 0), confidence=1.0))
        facts.append(Fact('friends_count', user_data.get('friends_count', 0), confidence=1.0))
        facts.append(Fact('account_age_days', user_data.get('account_age_days', 1), confidence=1.0))

        # --- Суб'єктивні факти (CF < 1.0) ---
        # (Припускаємо, що дані від користувача не є 100% точними)
        facts.append(Fact('stress_level', user_data.get('stress_level'), confidence=0.9)) # Ми на 90% впевнені
        facts.append(Fact('sitting_hours', user_data.get('sitting_hours'), confidence=0.8)) # На 80% впевнені
        facts.append(Fact('physical_activity_today', user_data.get('physical_activity_today', 0), confidence=0.8))

        # --- Контекстні факти (CF = 1.0) ---
        facts.append(Fact('current_hour', datetime.now().hour, confidence=1.0))
        
        return facts
    
    # В файлі ai_quest_service.py

    def _format_recommendations(self, inference_result: Dict) -> Dict[str, Any]:
        """
        Форматує результати виведення для фронтенду.
        * ОНОВЛЕНО: Фільтрує поради, залишаючи тільки НАЙВАЖЛИВІШІ (Top-1). *
        """
        recommendations = {
            'status': None,
            'quests': [],
            'health_tips': [],
            'notifications': [],
            'analytics': {
                'rules_fired': len(inference_result.get('rules_fired', [])),
                'new_facts': inference_result.get('new_facts_count', 0),
                'final_facts': inference_result.get('final_facts', {})
            }
        }
        
        def get_fact_data(name):
            if self.kb.has_fact(name):
                fact = self.kb.get_fact(name)
                return fact.value, fact.confidence
            return None, 0.0

        # --- 1. Статус користувача ---
        status, status_conf = get_fact_data('user_status')
        if status:
            recommendations['status'] = f"{status} (Впевненість: {status_conf*100:.0f}%)"

        # --- 2. Рекомендовані квести ---
        quests_val, quest_conf = get_fact_data('available_quests')
        if isinstance(quests_val, list):
            for i, quest_name in enumerate(quests_val):
                if not any(q['name'] == quest_name for q in recommendations['quests']):
                    recommendations['quests'].append({
                        'id': f'quest_avail_{i}',
                        'name': quest_name,
                        'difficulty': self._determine_quest_difficulty(quest_name),
                        'xp_reward': self._calculate_quest_xp(quest_name),
                        'category': self._determine_quest_category(quest_name),
                        'confidence': quest_conf
                    })
        
        suggested_quests_list, sg_conf = get_fact_data('suggested_quest')
        if isinstance(suggested_quests_list, list):
            # ✅ СОРТУВАННЯ КВЕСТІВ: Можемо показати топ-2 квести
            # (тут логіка простіша, бо квестів може бути декілька)
            for i, quest_name in enumerate(suggested_quests_list):
                 if not any(q['name'] == quest_name for q in recommendations['quests']):
                    recommendations['quests'].append({
                        'id': f'quest_suggested_{i}',
                        'name': quest_name,
                        'difficulty': 'easy', 
                        'xp_reward': 10, 
                        'category': 'health',
                        'suggested': True, 
                        'confidence': sg_conf
                    })

        # --- 3. ПОРАДИ (ЛОГІКА "WINNER TAKES ALL") ---
        
        all_potential_tips = []

        # Збираємо поради про здоров'я
        health_tips_list, ht_conf = get_fact_data('health_tips')
        if isinstance(health_tips_list, list):
            for msg in health_tips_list:
                all_potential_tips.append({
                    'type': "Порада про здоров'я",
                    'message': msg,
                    'priority': 'high', 'icon': '💪',
                    'confidence': ht_conf
                })
        
        # Збираємо поради про самопочуття (wellness)
        wellness_tips_list, wt_conf = get_fact_data('wellness_tips')
        if isinstance(wellness_tips_list, list):
            for msg in wellness_tips_list:
                all_potential_tips.append({
                    'type': 'Порада про самопочуття',
                    'message': msg,
                    'priority': 'medium', 'icon': '🧘',
                    'confidence': wt_conf
                })

        # ✅ СОРТУВАННЯ: Від найвищої впевненості до найнижчої
        all_potential_tips.sort(key=lambda x: x['confidence'], reverse=True)

        # ✅ ВІДБІР: Беремо тільки ОДНУ найкращу пораду (slice [:1])
        # Якщо хочете дві, змініть на [:2]
        top_tips = all_potential_tips[:1]

        # Додаємо у фінальний список
        for i, tip in enumerate(top_tips):
            recommendations['health_tips'].append({
                'id': f'tip_{i}',
                'type': tip['type'],
                'message': tip['message'],
                'priority': tip['priority'],
                'icon': tip['icon'],
                'confidence': tip['confidence']
            })

        # --- 4. Сповіщення (теж можна відфільтрувати, якщо хочете) ---
        notifications_list, notif_conf = get_fact_data('notifications')
        if isinstance(notifications_list, list):
            # Тут поки залишаємо всі, але теж можна зробити slice [:1]
            for i, message in enumerate(notifications_list):
                recommendations['notifications'].append({
                    'id': f'notification_{i}',
                    'type': 'info', 'title': 'AI Помічник',
                    'message': message,
                    'priority': 'medium', 'icon': '🔔',
                    'confidence': notif_conf
                })
            
        return recommendations
    # --- Допоміжні функції (з Лаб. 1) ---
    
    def _determine_quest_difficulty(self, quest_name: str) -> str:
        if 'Перше' in quest_name or 'Знайомство' in quest_name or '5 хв' in quest_name:
            return 'easy'
        elif 'Майстер' in quest_name or 'Марафон' in quest_name:
            return 'hard'
        return 'medium'
    
    def _calculate_quest_xp(self, quest_name: str) -> int:
        difficulty_xp = {
            'easy': 10,
            'medium': 25,
            'hard': 50
        }
        difficulty = self._determine_quest_difficulty(quest_name)
        return difficulty_xp.get(difficulty, 25)
    
    def _determine_quest_category(self, quest_name: str) -> str:
        if 'команд' in quest_name.lower():
            return 'team'
        elif 'челендж' in quest_name.lower():
            return 'challenge'
        elif 'продуктивн' in quest_name.lower():
            return 'productivity'
        return 'general'
    
    def _get_health_message(self, health_type: str) -> str:
        messages = {
            'Ви довго сидите': 'Ви занадто довго сидите. Час встати і порухатись!',
            'Найкращий спосіб зняти стрес - рух': 'Фізична активність - чудовий спосіб боротьби зі стресом.'
        }
        return messages.get(health_type, 'Подбайте про своє здоров\'я')
    
    def _get_wellness_message(self, wellness_type: str) -> str:
        messages = {
            'Час розслабитись': 'Високий рівень стресу. Спробуйте 5-хвилинну медитацію, щоб очистити розум.',
            'Чудовий настрій!': 'Ви виглядаєте розслабленим. Чудова робота з керування стресом!'
        }
        return messages.get(wellness_type, 'Подбайте про своє самопочуття')


# --- Глобальний інстанс (без змін) ---
_ai_service_instance = None

def get_ai_service(rule_engine=None, kb=None):
    """Отримує або створює глобальний інстанс AI сервісу"""
    global _ai_service_instance
    
    if _ai_service_instance is None:
        if rule_engine is None or kb is None:
            # Імпортуємо та створюємо нову систему
            from rule_engine import create_rule_based_system, RuleParser
            import json
            from pathlib import Path
            
            kb_new, engine_new = create_rule_based_system()
            
            # Завантажуємо правила (шлях вже виправлено)
            rules_file = Path(__file__).parent / 'data' / 'lifequest_rules.json'
            with open(rules_file, 'r', encoding='utf-8') as f:
                rules_data = json.load(f)
                rules = RuleParser.parse_json_rules(rules_data)
                kb_new.add_rules(rules)
                print(f"--- AI SERVICE: Успішно завантажено {len(kb_new.rules)} правил.")
            
            _ai_service_instance = AIQuestService(engine_new, kb_new)
        else:
            _ai_service_instance = AIQuestService(rule_engine, kb)
    
    return _ai_service_instance