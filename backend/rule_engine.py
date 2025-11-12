"""
Rule-Based System Engine для LifeQuest
Реалізує механізм логічного виведення з прямим та зворотнім ланцюгом
"""

from typing import List, Dict, Any, Set, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
import json
import re


class InferenceMode(Enum):
    """Режими логічного виведення"""
    FORWARD = "forward"  # Прямий ланцюг (від фактів до висновків)
    BACKWARD = "backward"  # Зворотній ланцюг (від цілі до фактів)


@dataclass
class Fact:
    """Представлення факту в базі знань"""
    name: str
    value: Any
    confidence: float = 1.0  # Ступінь впевненості (0-1)
    
    def __hash__(self):
        return hash(self.name)
    
    def __eq__(self, other):
        if isinstance(other, Fact):
            return self.name == other.name
        return False
    
    def __repr__(self):
        return f"Fact({self.name}={self.value}, conf={self.confidence})"


@dataclass
class Condition:
    """Умова в правилі"""
    fact_name: str
    operator: str  # ==, !=, >, <, >=, <=, in, not_in
    value: Any
    
    def evaluate(self, facts: Dict[str, Fact]) -> bool:
        """Перевіряє чи виконується умова на основі фактів"""
        if self.fact_name not in facts:
            return False
        
        fact_value = facts[self.fact_name].value
        
        operators = {
            '==': lambda a, b: a == b,
            '!=': lambda a, b: a != b,
            '>': lambda a, b: a > b,
            '<': lambda a, b: a < b,
            '>=': lambda a, b: a >= b,
            '<=': lambda a, b: a <= b,
            'in': lambda a, b: a in b,
            'not_in': lambda a, b: a not in b,
            'contains': lambda a, b: b in a,
        }
        
        if self.operator in operators:
            try:
                return operators[self.operator](fact_value, self.value)
            except:
                return False
        
        return False
    
    def __repr__(self):
        return f"{self.fact_name} {self.operator} {self.value}"


@dataclass
class Action:
    """Дія (висновок) правила"""
    fact_name: str
    value: Any
    confidence: float = 1.0
    
    def execute(self) -> Fact:
        """Виконує дію, створюючи новий факт"""
        return Fact(self.fact_name, self.value, self.confidence)
    
    def __repr__(self):
        return f"ADD {self.fact_name}={self.value}"


@dataclass
class Rule:
    """Правило виду: IF conditions THEN actions"""
    rule_id: str
    conditions: List[Condition]
    actions: List[Action]
    priority: int = 0
    description: str = ""
    fired_count: int = 0
    
    def can_fire(self, facts: Dict[str, Fact]) -> bool:
        """Перевіряє чи можна застосувати правило"""
        return all(cond.evaluate(facts) for cond in self.conditions)
    
    def fire(self, facts: Dict[str, Fact]) -> List[Fact]:
        """Застосовує правило, повертає нові факти"""
        if not self.can_fire(facts):
            return []
        
        self.fired_count += 1
        new_facts = []
        
        for action in self.actions:
            new_fact = action.execute()
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
    
    def add_fact(self, fact: Fact) -> None:
        """Додає факт до бази знань"""
        self.facts[fact.name] = fact
    
    def add_facts(self, facts: List[Fact]) -> None:
        """Додає множину фактів"""
        for fact in facts:
            self.add_fact(fact)
    
    def get_fact(self, name: str) -> Optional[Fact]:
        """Отримує факт за назвою"""
        return self.facts.get(name)
    
    def has_fact(self, name: str) -> bool:
        """Перевіряє наявність факту"""
        return name in self.facts
    
    def add_rule(self, rule: Rule) -> None:
        """Додає правило до бази"""
        self.rules.append(rule)
        # Сортуємо правила за пріоритетом
        self.rules.sort(key=lambda r: r.priority, reverse=True)
    
    def add_rules(self, rules: List[Rule]) -> None:
        """Додає множину правил"""
        for rule in rules:
            self.add_rule(rule)
    
    def get_applicable_rules(self) -> List[Rule]:
        """Повертає правила, які можуть бути застосовані"""
        return [rule for rule in self.rules if rule.can_fire(self.facts)]
    
    def clear_facts(self) -> None:
        """Очищає всі факти"""
        self.facts.clear()
        self.inference_history.clear()
    
    def reset_rule_counters(self) -> None:
        """Скидає лічильники спрацювань правил"""
        for rule in self.rules:
            rule.fired_count = 0
    
    def __repr__(self):
        return f"KB(facts={len(self.facts)}, rules={len(self.rules)})"


class InferenceEngine:
    """Механізм логічного виведення"""
    
    def __init__(self, kb: KnowledgeBase):
        self.kb = kb
        self.max_iterations = 100
    
    def forward_chain(self, max_iterations: Optional[int] = None) -> Dict[str, Any]:
        """
        Прямий ланцюг виведення (forward chaining)
        Починає з фактів і застосовує правила, поки можна
        """
        iterations = max_iterations or self.max_iterations
        rules_fired = []
        new_facts_count = 0
        fired_rules = set()  # Відстежуємо які правила вже спрацювали
        
        for iteration in range(iterations):
            # Отримуємо правила, які можна застосувати
            applicable_rules = self.kb.get_applicable_rules()
            
            # Фільтруємо правила, які вже спрацьовували
            applicable_rules = [r for r in applicable_rules if r.rule_id not in fired_rules]
            
            if not applicable_rules:
                break  # Більше немає правил для застосування
            
            # Застосовуємо правило з найвищим пріоритетом
            rule = applicable_rules[0]
            new_facts = rule.fire(self.kb.facts)
            fired_rules.add(rule.rule_id)
            
            # Додаємо нові факти до бази
            has_new_facts = False
            if new_facts:
                for fact in new_facts:
                    if fact.name not in self.kb.facts or self.kb.facts[fact.name].value != fact.value:
                        has_new_facts = True
                        if fact.name not in self.kb.facts:
                            new_facts_count += 1
                    self.kb.add_fact(fact)
                
                if has_new_facts:
                    rules_fired.append({
                        'iteration': iteration,
                        'rule_id': rule.rule_id,
                        'description': rule.description,
                        'new_facts': [f.name for f in new_facts]
                    })
        
        return {
            'mode': 'forward_chain',
            'iterations': len(rules_fired),
            'rules_fired': rules_fired,
            'new_facts_count': new_facts_count,
            'final_facts': list(self.kb.facts.keys())
        }
    
    def backward_chain(self, goal: str) -> Dict[str, Any]:
        """
        Зворотній ланцюг виведення (backward chaining)
        Починає з цілі і шукає факти та правила для її підтвердження
        """
        def prove_goal(goal_name: str, depth: int = 0, visited: Set[str] = None) -> Tuple[bool, List[str]]:
            """Рекурсивно доводить ціль"""
            if visited is None:
                visited = set()
            
            if depth > 50:  # Захист від нескінченної рекурсії
                return False, []
            
            # Перевіряємо чи ціль вже є фактом
            if self.kb.has_fact(goal_name):
                return True, [f"Fact '{goal_name}' exists"]
            
            # Уникаємо циклів
            if goal_name in visited:
                return False, [f"Circular dependency detected for '{goal_name}'"]
            
            visited.add(goal_name)
            path = []
            
            # Шукаємо правила, які можуть вивести цю ціль
            for rule in self.kb.rules:
                # Перевіряємо чи правило виводить потрібну ціль
                produces_goal = any(action.fact_name == goal_name for action in rule.actions)
                
                if not produces_goal:
                    continue
                
                # Перевіряємо чи всі умови правила можуть бути доведені
                all_conditions_met = True
                subgoal_paths = []
                
                for condition in rule.conditions:
                    # Спочатку перевіряємо чи умова вже виконується
                    if condition.evaluate(self.kb.facts):
                        subgoal_paths.append(f"Condition '{condition}' is already satisfied")
                        continue
                    
                    # Намагаємось довести підціль
                    can_prove, subpath = prove_goal(condition.fact_name, depth + 1, visited.copy())
                    
                    if can_prove:
                        subgoal_paths.extend(subpath)
                    else:
                        all_conditions_met = False
                        break
                
                if all_conditions_met:
                    # Застосовуємо правило
                    new_facts = rule.fire(self.kb.facts)
                    for fact in new_facts:
                        self.kb.add_fact(fact)
                    
                    path.append(f"Applied rule '{rule.rule_id}': {rule.description}")
                    path.extend(subgoal_paths)
                    return True, path
            
            visited.remove(goal_name)
            return False, [f"Cannot prove goal '{goal_name}'"]
        
        proved, reasoning_path = prove_goal(goal)
        
        return {
            'mode': 'backward_chain',
            'goal': goal,
            'proved': proved,
            'reasoning_path': reasoning_path,
            'final_facts': list(self.kb.facts.keys())
        }
    
    def infer(self, mode: InferenceMode = InferenceMode.FORWARD, goal: Optional[str] = None) -> Dict[str, Any]:
        """Основний метод виведення"""
        if mode == InferenceMode.FORWARD:
            return self.forward_chain()
        elif mode == InferenceMode.BACKWARD:
            if goal is None:
                raise ValueError("Goal must be specified for backward chaining")
            return self.backward_chain(goal)
        else:
            raise ValueError(f"Unknown inference mode: {mode}")


class RuleParser:
    """Парсер для завантаження правил з різних форматів"""
    
    @staticmethod
    def parse_json_rules(json_data: str) -> List[Rule]:
        """Парсить правила з JSON"""
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
        """Парсить факти з JSON"""
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
