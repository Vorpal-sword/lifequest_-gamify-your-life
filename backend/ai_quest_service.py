"""
AI Quest Service для LifeQuest
Інтегрується з існуючим rule_engine.py
"""
import json
from pathlib import Path
from typing import Dict, List, Any


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
        
        Args:
            user_data: дані з frontend, наприклад:
            {
                'user_id': 123,
                'level': 2,
                'xp': 150,
                'total_tasks': 25,
                'tasks_today': 3,
                'streak_days': 5,
                ...
            }
        
        Returns:
            {
                'status': 'Досвідчений',
                'achievements': [...],
                'quests': [...],
                'health_tips': [...],
                'notifications': [...],
                'rewards': {...}
            }
        """
        # Очищаємо попередній стан
        self.kb.clear_facts()
        self.kb.reset_rule_counters()
        
        # Конвертуємо дані користувача у факти
        facts = self._convert_user_data_to_facts(user_data)
        
        # Додаємо факти в базу знань
        for fact in facts:
            self.kb.add_fact(fact)
        
        # Виконуємо логічне виведення
        result = self.engine.forward_chain()
        
        # Форматуємо результат для фронтенду
        recommendations = self._format_recommendations(result)
        
        return recommendations
    
    def _convert_user_data_to_facts(self, user_data: Dict) -> List:
        """Конвертує дані користувача у факти для rule engine"""
        from rule_engine import Fact
        
        facts = []
        
        # Маппінг полів (адаптуйте під вашу структуру)
        field_mapping = {
            'level': 'user_level',
            'xp': 'user_xp',
            'total_tasks': 'total_tasks_completed',
            'tasks_today': 'tasks_completed_today',
            'tasks_this_week': 'tasks_completed_this_week',
            'streak_days': 'streak_days',
            'work_hours_today': 'work_hours_today',
            'sitting_hours': 'sitting_hours_today',
            'physical_activity': 'physical_activity_today',
            'stress_level': 'stress_level',
            'friends_count': 'friends_count',
        }
        
        for frontend_key, backend_key in field_mapping.items():
            if frontend_key in user_data:
                facts.append(Fact(backend_key, user_data[frontend_key]))
        
        # Додаємо додаткові факти (значення за замовчуванням)
        default_facts = {
            'has_achievement_first_steps': False,
            'has_badge_early_bird': False,
            'meditation_done_today': False,
            'anniversary_celebrated': False,
            'prefers_team_quests': user_data.get('prefers_team_quests', False),
            'career_goal_active': user_data.get('career_goal_active', False),
        }
        
        for key, value in default_facts.items():
            if key not in [f.name for f in facts]:
                facts.append(Fact(key, value))
        
        return facts
    
    def _format_recommendations(self, inference_result: Dict) -> Dict[str, Any]:
        """Форматує результати виведення для фронтенду"""
        recommendations = {
            'status': None,
            'level_info': {},
            'achievements': [],
            'quests': [],
            'health_tips': [],
            'notifications': [],
            'rewards': {},
            'analytics': {
                'rules_fired': len(inference_result.get('rules_fired', [])),
                'new_facts': inference_result.get('new_facts_count', 0)
            }
        }
        
        # Статус користувача
        if self.kb.has_fact('user_status'):
            recommendations['status'] = self.kb.get_fact('user_status').value
        
        # Інформація про рівень
        if self.kb.has_fact('user_level'):
            recommendations['level_info']['current_level'] = self.kb.get_fact('user_level').value
        
        if self.kb.has_fact('user_xp'):
            recommendations['level_info']['current_xp'] = self.kb.get_fact('user_xp').value
        
        if self.kb.has_fact('level_up_reward'):
            recommendations['level_info']['level_up_reward'] = self.kb.get_fact('level_up_reward').value
        
        # Досягнення
        if self.kb.has_fact('achievement_earned'):
            achievement_name = self.kb.get_fact('achievement_earned').value
            achievement_xp = self.kb.get_fact('user_xp').value if self.kb.has_fact('user_xp') else 0
            
            recommendations['achievements'].append({
                'id': f'achievement_{len(recommendations["achievements"])}',
                'name': achievement_name,
                'xp_reward': achievement_xp,
                'icon': '🏆',
                'timestamp': 'now'
            })
        
        # Бейджі
        if self.kb.has_fact('badge_earned'):
            badge_name = self.kb.get_fact('badge_earned').value
            recommendations['achievements'].append({
                'id': f'badge_{len(recommendations["achievements"])}',
                'name': badge_name,
                'type': 'badge',
                'icon': '🎖️',
                'timestamp': 'now'
            })
        
        # Квести
        if self.kb.has_fact('available_quests'):
            quests_value = self.kb.get_fact('available_quests').value
            if isinstance(quests_value, list):
                for quest_name in quests_value:
                    recommendations['quests'].append({
                        'id': f'quest_{len(recommendations["quests"])}',
                        'name': quest_name,
                        'difficulty': self._determine_quest_difficulty(quest_name),
                        'xp_reward': self._calculate_quest_xp(quest_name),
                        'category': self._determine_quest_category(quest_name)
                    })
        
        # Додатковий запропонований квест
        if self.kb.has_fact('suggested_quest'):
            suggested = self.kb.get_fact('suggested_quest').value
            recommendations['quests'].append({
                'id': f'quest_suggested',
                'name': suggested,
                'difficulty': 'medium',
                'xp_reward': 20,
                'category': 'health',
                'suggested': True
            })
        
        # Рекомендації здоров'я
        if self.kb.has_fact('health_recommendation'):
            health_type = self.kb.get_fact('health_recommendation').value
            health_quest = self.kb.get_fact('suggested_quest').value if self.kb.has_fact('suggested_quest') else None
            
            recommendations['health_tips'].append({
                'id': f'health_{len(recommendations["health_tips"])}',
                'type': health_type,
                'message': self._get_health_message(health_type),
                'quest': health_quest,
                'priority': 'high',
                'icon': '💪'
            })
        
        # Wellness рекомендації
        if self.kb.has_fact('wellness_recommendation'):
            wellness_type = self.kb.get_fact('wellness_recommendation').value
            wellness_quest = self.kb.get_fact('wellness_quest').value if self.kb.has_fact('wellness_quest') else None
            
            recommendations['health_tips'].append({
                'id': f'wellness_{len(recommendations["health_tips"])}',
                'type': wellness_type,
                'message': self._get_wellness_message(wellness_type),
                'quest': wellness_quest,
                'priority': 'medium',
                'icon': '🧘'
            })
        
        # Нагадування
        if self.kb.has_fact('reminder_type'):
            reminder_type = self.kb.get_fact('reminder_type').value
            reminder_action = self.kb.get_fact('suggested_activity').value if self.kb.has_fact('suggested_activity') else None
            
            recommendations['notifications'].append({
                'id': f'reminder_{len(recommendations["notifications"])}',
                'type': 'reminder',
                'title': reminder_type,
                'message': reminder_action or 'Подбайте про себе!',
                'priority': 'high',
                'icon': '🔔'
            })
        
        # Серії та бонуси
        if self.kb.has_fact('streak_milestone'):
            streak_msg = self.kb.get_fact('streak_milestone').value
            recommendations['notifications'].append({
                'id': 'streak_notification',
                'type': 'achievement',
                'title': 'Вітаємо!',
                'message': streak_msg,
                'priority': 'medium',
                'icon': '🔥'
            })
        
        # Винагороди
        if self.kb.has_fact('level_up_reward'):
            recommendations['rewards']['level_up'] = self.kb.get_fact('level_up_reward').value
        
        if self.kb.has_fact('streak_bonus_active'):
            recommendations['rewards']['streak_bonus'] = True
            recommendations['rewards']['xp_multiplier'] = self.kb.get_fact('xp_multiplier').value if self.kb.has_fact('xp_multiplier') else 1.0
        
        if self.kb.has_fact('daily_bonus'):
            recommendations['rewards']['daily_bonus'] = self.kb.get_fact('daily_bonus').value
        
        return recommendations
    
    def _determine_quest_difficulty(self, quest_name: str) -> str:
        """Визначає складність квесту"""
        if 'Перше' in quest_name or 'Знайомство' in quest_name:
            return 'easy'
        elif 'Майстер' in quest_name or 'Марафон' in quest_name:
            return 'hard'
        return 'medium'
    
    def _calculate_quest_xp(self, quest_name: str) -> int:
        """Розраховує XP за квест"""
        difficulty_xp = {
            'easy': 10,
            'medium': 25,
            'hard': 50
        }
        difficulty = self._determine_quest_difficulty(quest_name)
        return difficulty_xp.get(difficulty, 25)
    
    def _determine_quest_category(self, quest_name: str) -> str:
        """Визначає категорію квесту"""
        if 'команд' in quest_name.lower():
            return 'team'
        elif 'челендж' in quest_name.lower():
            return 'challenge'
        elif 'продуктивн' in quest_name.lower():
            return 'productivity'
        return 'general'
    
    def _get_health_message(self, health_type: str) -> str:
        """Повертає повідомлення для рекомендації здоров'я"""
        messages = {
            'Рекомендована фізична активність': 'Ви довго сидите. Час порухатись!',
            'Перерва': 'Зробіть коротку перерву для відновлення енергії',
        }
        return messages.get(health_type, 'Подбайте про своє здоров\'я')
    
    def _get_wellness_message(self, wellness_type: str) -> str:
        """Повертає повідомлення для wellness рекомендації"""
        messages = {
            'Медитація': 'Високий рівень стресу. Спробуйте медитацію.',
            'Релаксація': 'Час відпочити та розслабитись',
        }
        return messages.get(wellness_type, 'Подбайте про своє самопочуття')


# Глобальний інстанс для використання в app.py
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
            
            # Завантажуємо правила
            rules_file = Path(__file__).parent / 'data' / 'lifequest_rules.json'
            with open(rules_file, 'r', encoding='utf-8') as f:
                rules = RuleParser.parse_json_rules(json.load(f))
                kb_new.add_rules(rules)
            
            _ai_service_instance = AIQuestService(engine_new, kb_new)
        else:
            _ai_service_instance = AIQuestService(rule_engine, kb)
    
    return _ai_service_instance
