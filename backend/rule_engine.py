"""
Rule-Based System Engine для LifeQuest
* ОНОВЛЕНО ДЛЯ ЛАБОРАТОРНОЇ 2 (ПОВНА ВЕРСІЯ) *
- Додано підтримку коефіцієнтів упевненості (Certainty Factors, CF)
- Реалізовано формули комбінування доказів (MYCIN-style)
- ВИПРАВЛЕНО: Коректна обробка списків (щоб уникнути list-in-list)
"""

from typing import List, Dict, Any, Set, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
import json
import re


class InferenceMode(Enum):
    FORWARD = "forward"
    BACKWARD = "backward"


@dataclass
class Fact:
    name: str
    value: Any
    confidence: float = 1.0 
    
    def __hash__(self):
        return hash(self.name)
    
    def __eq__(self, other):
        if isinstance(other, Fact):
            return self.name == other.name
        return False
    
    def __repr__(self):
        return f"Fact({self.name}={self.value}, conf={self.confidence:.2f})"


@dataclass
class Condition:
    fact_name: str
    operator: str
    value: Any
    
    def evaluate(self, facts: Dict[str, Fact]) -> float:
        if self.fact_name not in facts:
            return 0.0
        
        fact = facts[self.fact_name]
        fact_value = fact.value
        
        operators = {
            '==': lambda a, b: a == b, '!=': lambda a, b: a != b,
            '>': lambda a, b: a > b, '<': lambda a, b: a < b,
            '>=': lambda a, b: a >= b, '<=': lambda a, b: a <= b,
            'in': lambda a, b: a in b, 'not_in': lambda a, b: a not in b,
            'contains': lambda a, b: b in a,
        }
        
        if self.operator in operators:
            try:
                if operators[self.operator](fact_value, self.value):
                    return fact.confidence
                else:
                    return 0.0
            except:
                return 0.0
        
        return 0.0
    
    def __repr__(self):
        return f"{self.fact_name} {self.operator} {self.value}"


@dataclass
class Action:
    fact_name: str
    value: Any
    confidence: float = 1.0
    
    def execute(self) -> Fact:
        return Fact(self.fact_name, self.value, self.confidence)
    
    def __repr__(self):
        return f"ADD {self.fact_name}={self.value} (RuleCF={self.confidence:.2f})"


@dataclass
class Rule:
    rule_id: str
    conditions: List[Condition]
    actions: List[Action]
    priority: int = 0
    description: str = ""
    fired_count: int = 0
    
    def calculate_premise_confidence(self, facts: Dict[str, Fact]) -> float:
        if not self.conditions:
            return 1.0

        condition_confidences = []
        for cond in self.conditions:
            cf = cond.evaluate(facts)
            if cf == 0.0:
                return 0.0
            condition_confidences.append(cf)
            
        if not condition_confidences:
             return 0.0
             
        return min(condition_confidences)
    
    def fire(self, facts: Dict[str, Fact]) -> List[Fact]:
        premise_cf = self.calculate_premise_confidence(facts)
        
        if premise_cf == 0.0:
            return []
            
        self.fired_count += 1
        new_facts = []
        
        for action in self.actions:
            new_fact = action.execute()
            new_fact.confidence = premise_cf * action.confidence
            new_facts.append(new_fact)
            
        return new_facts
    
    def __repr__(self):
        conds = " AND ".join(str(c) for c in self.conditions)
        acts = ", ".join(str(a) for a in self.actions)
        return f"Rule[{self.rule_id}]: IF {conds} THEN {acts}"


class KnowledgeBase:
    """База знань - зберігає факти та правила"""
    
    def __init__(self):
        self.facts: Dict[str, Fact] = {}
        self.rules: List[Rule] = []
        self.inference_history: List[Dict] = []
    
    # ✅ ЦЕ ПОВНІСТЮ ОНОВЛЕНИЙ МЕТОД 'add_fact'
    def add_fact(self, new_fact: Fact) -> bool:
        """
        Додає факт до бази знань.
        * Підтримує комбінування CF (MYCIN) та СПИСКИ порад (виправлено). *
        """
        name = new_fact.name
        
        # --- 1. ЛОГІКА ДЛЯ СПИСКІВ ---
        list_facts = ['available_quests', 'health_tips', 'notifications', 'wellness_tips', 'suggested_quest']

        if name in list_facts:
            # Переконуємось, що нове значення - це список
            new_values = new_fact.value if isinstance(new_fact.value, list) else [new_fact.value]
            new_confidence = new_fact.confidence
            
            if name not in self.facts:
                # Це перша порада/квест, створюємо список
                self.facts[name] = Fact(name, new_values, new_confidence)
                return True
            else:
                # Це вже друга (або більше) порада. Додаємо до списку.
                existing_fact = self.facts[name]
                
                # Переконуємось, що існуюче значення - це список
                if not isinstance(existing_fact.value, list):
                     existing_fact.value = [existing_fact.value] 

                items_added = False
                for val in new_values:
                    if val not in existing_fact.value:
                        existing_fact.value.append(val)
                        items_added = True
                
                if items_added:
                    # Комбінуємо CF (беремо середнє)
                    count = len(existing_fact.value)
                    if count > 1:
                        existing_fact.confidence = ((existing_fact.confidence * (count-1)) + new_confidence) / count
                    else:
                        existing_fact.confidence = new_confidence
                    return True
                    
                return False # Такий елемент вже є у списку

        # --- 2. ЛОГІКА ДЛЯ ЗВИЧАЙНИХ ФАКТІВ (CF) ---
        if name not in self.facts:
            self.facts[name] = new_fact
            return True
        
        existing_fact = self.facts[name]
        
        if existing_fact.value != new_fact.value:
            # Конфлікт значень: перемагає факт з вищим CF
            if new_fact.confidence > existing_fact.confidence:
                self.facts[name] = new_fact
                return True
            else:
                return False 
        
        # Значення однакові, комбінуємо коефіцієнти впевненості
        cf1 = existing_fact.confidence
        cf2 = new_fact.confidence
        
        if cf1 >= 1.0:
            return False
            
        combined_cf = cf1 + cf2 * (1 - cf1)
        
        if abs(combined_cf - cf1) > 1e-9:
            existing_fact.confidence = min(combined_cf, 1.0)
            return True
        
        return False
    
    def add_facts(self, facts: List[Fact]) -> None:
        for fact in facts:
            self.add_fact(fact)
    
    def get_fact(self, name: str) -> Optional[Fact]:
        return self.facts.get(name)
    
    def has_fact(self, name: str) -> bool:
        return name in self.facts
    
    def add_rule(self, rule: Rule) -> None:
        self.rules.append(rule)
        self.rules.sort(key=lambda r: r.priority, reverse=True)
    
    def add_rules(self, rules: List[Rule]) -> None:
        for rule in rules:
            self.add_rule(rule)
    
    def clear_facts(self) -> None:
        self.facts.clear()
        self.inference_history.clear()
    
    def reset_rule_counters(self) -> None:
        for rule in self.rules:
            rule.fired_count = 0
    
    def __repr__(self):
        return f"KB(facts={len(self.facts)}, rules={len(self.rules)})"


class InferenceEngine:
    """Механізм логічного виведення"""
    
    def __init__(self, kb: KnowledgeBase):
        self.kb = kb
        self.max_iterations = 50
    
    def forward_chain(self) -> Dict[str, Any]:
        iterations = 0
        rules_fired_log = []
        fired_rules_this_session = set() 
        
        while iterations < self.max_iterations:
            iterations += 1
            facts_updated_this_cycle = False
            
            for rule in self.kb.rules:
                
                if rule.rule_id in fired_rules_this_session:
                    continue 
                    
                new_facts = rule.fire(self.kb.facts)
                
                if not new_facts:
                    continue
                
                fired_rules_this_session.add(rule.rule_id)
                
                for fact in new_facts:
                    was_updated = self.kb.add_fact(fact)
                    
                    if was_updated:
                        facts_updated_this_cycle = True
                        
                        rules_fired_log.append({
                            'iteration': iterations,
                            'rule_id': rule.rule_id,
                            'description': rule.description,
                            'new_fact': str(fact)
                        })

            if not facts_updated_this_cycle:
                break
        
        return {
            'mode': 'forward_chain',
            'iterations': iterations,
            'rules_fired': rules_fired_log,
            'new_facts_count': len(rules_fired_log),
            'final_facts': {f.name: str(f) for f in self.kb.facts.values()}
        }


class RuleParser:
    """Парсер для завантаження правил з JSON"""
    
    @staticmethod
    def parse_json_rules(json_data: str) -> List[Rule]:
        data = json.loads(json_data) if isinstance(json_data, str) else json_data
        rules = []
        
        for rule_data in data.get('rules', []):
            conditions = [
                Condition(
                    fact_name=cond['fact'],
                    operator=cond['operator'],
                    value=cond['value']
                )
                for cond in rule_data.get('conditions', [])
            ]
            
            actions = [
                Action(
                    fact_name=act['fact'],
                    value=act['value'],
                    confidence=act.get('confidence', 1.0)
                )
                for act in rule_data.get('actions', [])
            ]
            
            rule = Rule(
                rule_id=rule_data['id'],
                conditions=conditions,
                actions=actions,
                priority=rule_data.get('priority', 0),
                description=rule_data.get('description', '')
            )
            rules.append(rule)
        
        return rules
    
    @staticmethod
    def parse_json_facts(json_data: str) -> List[Fact]:
        data = json.loads(json_data) if isinstance(json_data, str) else json_data
        facts = []
        
        for fact_data in data.get('facts', []):
            fact = Fact(
                name=fact_data['name'],
                value=fact_data['value'],
                confidence=fact_data.get('confidence', 1.0)
            )
            facts.append(fact)
        
        return facts


def create_rule_based_system() -> Tuple[KnowledgeBase, InferenceEngine]:
    """Фабрика для створення rule-based системи"""
    kb = KnowledgeBase()
    engine = InferenceEngine(kb)
    return kb, engine