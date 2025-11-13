"""
Fuzzy Logic Rule-Based System Engine
* ФІНАЛЬНА ВЕРСІЯ: ВИПРАВЛЕНО CRITICAL TYPE IMPORT ERROR.
- Видалено неправильний імпорт 'tuple' з typing.
- Вирішено проблему циклічного імпорту.
"""

import json
from typing import Dict, List, Any # ✅ ПРИБРАНО НЕПРАВИЛЬНИЙ ІМПОРТ 'tuple'

# --- 1. ФУНКЦІЇ НЕЧІТКОЇ ЛОГІКИ ---

def _get_membership(x: float, p: List[float]) -> float:
    # ... (код без змін)
    """
    Розраховує ступінь приналежності (membership) 'x' до нечіткої множини 'p'.
    """
    if len(p) == 3: # Трикутник
        a, b, c = p
        if x < a or x > c: return 0.0
        if a <= x < b:
            if b - a == 0: return 1.0 if x == b else 0.0
            return (x - a) / (b - a)
        if x == b: return 1.0
        if b < x <= c:
            if c - b == 0: return 1.0 if x == b else 0.0
            return (c - x) / (c - b)
    elif len(p) == 4: # Трапеція
        a, b, c, d = p
        if x < a or x > d: return 0.0
        if x >= b and x <= c: return 1.0
        if x >= a and x < b:
            if b - a == 0: return 1.0 
            return (x - a) / (b - a)
        if x > c and x <= d:
            if d - c == 0: return 1.0
            return (d - x) / (d - c)
    return 0.0

def fuzzify(x: float, sets: Dict[str, List[float]]) -> Dict[str, float]:
    """Фаззифікація: Чітке число -> Нечіткий набір."""
    return {
        setName: round(_get_membership(x, params), 4)
        for setName, params in sets.items()
        if _get_membership(x, params) > 0.0
    }

# ✅ ВИПРАВЛЕНО: Змінено type hint на Tuple[float, str]
from typing import Tuple 

def defuzzify_centroid(fuzzy_output: Dict[str, float], sets: Dict[str, List[float]]) -> Tuple[float, str]:
    """Дефаззифікація: Нечіткий набір -> Чітке число."""
    numerator, denominator = 0.0, 0.0
    if not fuzzy_output: return 0.0, "N/A"
    strongest_set = max(fuzzy_output, key=fuzzy_output.get)

    for setName, activation in fuzzy_output.items():
        params = sets[setName]
        center = params[1] if len(params) == 3 else (params[1] + params[2]) / 2
        numerator += activation * center
        denominator += activation

    if denominator == 0.0: return 0.0, "N/A"
    return (numerator / denominator), strongest_set

# --- 2. КЛАСИ РУШІЯ ---

class FuzzyKnowledgeBase:
    """Зберігає нечіткі множини та правила."""
    def __init__(self, rules_json: dict):
        self.variables = rules_json.get('fuzzy_variables', {})
        self.outputs = rules_json.get('output_variables', {})
        self.rules = rules_json.get('fuzzy_rules', [])
        print(f"--- [Лаб 2] Fuzzy KB: Завантажено {len(self.rules)} нечітких правил ---")

class FuzzyInferenceEngine:
    """Механізм нечіткого логічного виведення."""
    def __init__(self, kb: FuzzyKnowledgeBase):
        self.kb = kb

    def evaluate(self, inputs: Dict[str, float]) -> List[Dict[str, Any]]:
        # 1. ФАЗЗИФІКАЦІЯ
        fuzzified_inputs = {}
        for var_name, crisp_value in inputs.items():
            if var_name in self.kb.variables:
                fuzzified_inputs[var_name] = fuzzify(crisp_value, self.kb.variables[var_name]['sets'])
        print(f"--- [Лаб 2] Fuzzy Engine: Фаззифіковані входи: {fuzzified_inputs}")

        # 2. АКТИВАЦІЯ ПРАВИЛ
        activated_rules = []
        for rule in self.kb.rules:
            premise_activation = 1.0
            is_triggered = True
            
            for condition in rule['if']:
                var, set_name = condition['var'], condition['is']
                if var not in fuzzified_inputs or set_name not in fuzzified_inputs[var]:
                    is_triggered = False; break
                premise_activation = min(premise_activation, fuzzified_inputs[var][set_name])

            if is_triggered and premise_activation > 0.0:
                rule_cf = rule.get('confidence', 1.0)
                final_cf = premise_activation * rule_cf
                
                rule['calculated_cf'] = final_cf
                activated_rules.append(rule)
        
        print(f"--- [Лаб 2] Fuzzy Engine: Спрацювало {len(activated_rules)} правил ---")

        # 3. АГРЕГАЦІЯ ТА ДЕФАЗЗИФІКАЦІЯ
        output_name = 'advice_priority'
        output_var = self.kb.outputs[output_name]
        
        fuzzy_conclusion = {} 
        advice_list = []
        
        for rule in activated_rules:
            cf = rule['calculated_cf'] 
            advice = rule['advice']
            
            for conclusion in rule['then']:
                if conclusion['var'] == output_name:
                    set_name = conclusion['is']
                    if set_name not in fuzzy_conclusion or cf > fuzzy_conclusion[set_name]:
                        fuzzy_conclusion[set_name] = cf
            
            advice_list.append({'text': advice, 'confidence': cf})

        if not fuzzy_conclusion:
            return []

        crisp_score, strongest_set = defuzzify_centroid(fuzzy_conclusion, output_var['sets'])
        advice_list.sort(key=lambda x: x['confidence'], reverse=True)
        
        print(f"--- [Лаб 2] Fuzzy Engine: Нечіткий висновок (Агрегація): {fuzzy_conclusion}")
        print(f"--- [Лаб 2] Fuzzy Engine: Чіткий пріоритет (Дефаззифікація): {crisp_score:.2f}")
        
        return [{
            'crisp_score': crisp_score,
            'strongest_set': strongest_set,
            'fuzzy_conclusion': fuzzy_conclusion,
            'top_advice': advice_list[0] if advice_list else None,
            'all_advice': advice_list
        }]

def create_rule_based_system() -> Tuple[FuzzyKnowledgeBase, FuzzyInferenceEngine]:
    """
    Ця функція є заглушкою для старої сумісності.
    """
    kb = FuzzyKnowledgeBase(rules_json={}) 
    engine = FuzzyInferenceEngine(kb)
    return kb, engine