/**
 * AIRecommendations.tsx
 * * Компонент для показу AI рекомендацій в LifeQuest.
 * * ЦЯ ВЕРСІЯ Є БЕЗПЕЧНОЮ:
 * - Вона очікує `authToken` (JWT токен).
 * - Надсилає токен в 'Authorization' заголовку.
 * - Бекенд (з @token_required) сам знаходить дані користувача (level, xp).
 * - Компонент надсилає лише "додаткові" дані (surveyData),
 * яких немає на сервері, наприклад, 'stress_level'.
 * * РОЗМІЩЕННЯ: components/AIRecommendations.tsx
 */

import React, { useEffect, useState } from "react";
import "./AIRecommendations.css";

// =============== ТИПИ ===============

interface Achievement {
  id: string;
  name: string;
  xp_reward?: number;
  type?: string;
  icon: string;
  timestamp: string;
}

interface Quest {
  id: string;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  xp_reward: number;
  category: string;
  suggested?: boolean;
}

interface HealthTip {
  id: string;
  type: string;
  message: string;
  quest?: string;
  priority: "low" | "medium" | "high";
  icon: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  icon: string;
}

interface Rewards {
  level_up?: number;
  streak_bonus?: boolean;
  xp_multiplier?: number;
  daily_bonus?: number;
}

interface AIRecommendationsData {
  status: string | null;
  level_info: {
    current_level?: number;
    current_xp?: number;
    level_up_reward?: number;
  };
  achievements: Achievement[];
  quests: Quest[];
  health_tips: HealthTip[];
  notifications: Notification[];
  rewards: Rewards;
  analytics: {
    rules_fired: number;
    new_facts: number;
  };
}

// Дані, яких немає на сервері (напр., з опитування)
interface SurveyData {
  stress_level?: number;
  sitting_hours?: number;
  work_hours_today?: number;
  physical_activity?: number;
}

interface AIRecommendationsProps {
  // Нам потрібен лише токен, а не всі дані користувача
  authToken: string;
  // та дані з опитувань, якщо вони є
  surveyData?: SurveyData;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// =============== КОМПОНЕНТ ===============

const AIRecommendations: React.FC<AIRecommendationsProps> = ({
  authToken,
  surveyData = {},
  autoRefresh = false,
  refreshInterval = 60000,
}) => {
  const [recommendations, setRecommendations] =
    useState<AIRecommendationsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Переконайтеся, що порт вірний (8080 для вашого Flask-сервера)
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

      const response = await fetch(`${API_URL}/api/ai/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 1. Надсилаємо токен для автентифікації
          Authorization: `Bearer ${authToken}`,
        },
        // 2. Надсилаємо ТІЛЬКИ ті дані, яких немає на сервері
        body: JSON.stringify(surveyData),
      });

      if (!response.ok) {
        // Спробуємо прочитати помилку з відповіді
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to get recommendations");
      }

      setRecommendations(result.data);
    } catch (err) {
      console.error("Error fetching AI recommendations:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Не робимо запит, якщо немає токена
    if (!authToken) {
      setLoading(false);
      setError("Not authenticated. Please log in.");
      return;
    }

    fetchRecommendations();

    // Auto-refresh (якщо потрібно)
    if (autoRefresh) {
      const interval = setInterval(fetchRecommendations, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [authToken, surveyData, autoRefresh, refreshInterval]); // Залежності

  // =============== LOADING STATE ===============
  if (loading) {
    return (
      <div className="ai-recommendations">
        <div className="ai-loading">
          <div className="ai-spinner"></div>
          <p>Аналізую ваш прогрес...</p>
        </div>
      </div>
    );
  }

  // =============== ERROR STATE ===============
  if (error) {
    return (
      <div className="ai-recommendations">
        <div className="ai-error">
          <span className="error-icon">⚠️</span>
          <p>Помилка: {error}</p>
          {authToken && ( // Показуємо кнопку, тільки якщо є токен
            <button onClick={fetchRecommendations} className="retry-button">
              Спробувати знову
            </button>
          )}
        </div>
      </div>
    );
  }

  // =============== NO DATA STATE ===============
  if (!recommendations) {
    return null; // Або якийсь компонент-заглушка
  }

  // =============== MAIN RENDER ===============
  return (
    <div className="ai-recommendations">
      {/* Header з статусом */}
      <div className="ai-header">
        <h2 className="ai-title">🤖 AI Рекомендації</h2>
        {recommendations.status && (
          <div className="user-status-badge">
            <span className="status-label">Статус:</span>
            <span className="status-value">{recommendations.status}</span>
          </div>
        )}
      </div>

      {/* Нагадування та сповіщення (Високий пріоритет) */}
      {recommendations.notifications.length > 0 && (
        <div className="ai-section notifications-section">
          <h3 className="section-title">🔔 Нагадування</h3>
          <div className="notifications-list">
            {recommendations.notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-card priority-${notification.priority}`}
              >
                <span className="notif-icon">{notification.icon}</span>
                <div className="notif-content">
                  <h4 className="notif-title">{notification.title}</h4>
                  <p className="notif-message">{notification.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Рекомендації здоров'я */}
      {recommendations.health_tips.length > 0 && (
        <div className="ai-section health-section">
          <h3 className="section-title">💪 Подбайте про здоров'я</h3>
          <div className="health-tips-list">
            {recommendations.health_tips.map((tip) => (
              <div
                key={tip.id}
                className={`health-tip-card priority-${tip.priority}`}
              >
                <span className="tip-icon">{tip.icon}</span>
                <div className="tip-content">
                  <h4 className="tip-type">{tip.type}</h4>
                  <p className="tip-message">{tip.message}</p>
                  {tip.quest && (
                    <p className="tip-quest">📝 Квест: {tip.quest}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Квести */}
      {recommendations.quests.length > 0 && (
        <div className="ai-section quests-section">
          <h3 className="section-title">🎯 Рекомендовані квести</h3>
          <div className="quests-list">
            {recommendations.quests.map((quest) => (
              <div
                key={quest.id}
                className={`quest-card difficulty-${quest.difficulty} ${
                  quest.suggested ? "suggested" : ""
                }`}
              >
                <div className="quest-header">
                  <h4 className="quest-name">{quest.name}</h4>
                  {quest.suggested && (
                    <span className="suggested-badge">Рекомендовано</span>
                  )}
                </div>
                <div className="quest-details">
                  <span className={`difficulty-badge ${quest.difficulty}`}>
                    {quest.difficulty === "easy" && "⭐ Легко"}
                    {quest.difficulty === "medium" && "⭐⭐ Середньо"}
                    {quest.difficulty === "hard" && "⭐⭐⭐ Складно"}
                  </span>
                  <span className="quest-reward">+{quest.xp_reward} XP</span>
                  <span className="quest-category">{quest.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Досягнення */}
      {recommendations.achievements.length > 0 && (
        <div className="ai-section achievements-section">
          <h3 className="section-title">🏆 Нові досягнення!</h3>
          <div className="achievements-grid">
            {recommendations.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="achievement-card animate-pop"
              >
                <span className="achievement-icon">{achievement.icon}</span>
                <div className="achievement-content">
                  <h4 className="achievement-name">{achievement.name}</h4>
                  {achievement.xp_reward && (
                    <p className="achievement-xp">
                      +{achievement.xp_reward} XP
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Винагороди */}
      {Object.keys(recommendations.rewards).length > 0 && (
        <div className="ai-section rewards-section">
          <h3 className="section-title">🎁 Ваші винагороди</h3>
          <div className="rewards-grid">
            {recommendations.rewards.level_up && (
              <div className="reward-card">
                <span className="reward-icon">⬆️</span>
                <div className="reward-content">
                  <p className="reward-label">Бонус за рівень</p>
                  <p className="reward-value">
                    +{recommendations.rewards.level_up}
                  </p>
                </div>
              </div>
            )}
            {recommendations.rewards.streak_bonus && (
              <div className="reward-card">
                <span className="reward-icon">🔥</span>
                <div className="reward-content">
                  <p className="reward-label">Множник XP</p>
                  <p className="reward-value">
                    x{recommendations.rewards.xp_multiplier}
                  </p>
                </div>
              </div>
            )}
            {recommendations.rewards.daily_bonus && (
              <div className="reward-card">
                <span className="reward-icon">📅</span>
                <div className="reward-content">
                  <p className="reward-label">Щоденний бонус</p>
                  <p className="reward-value">
                    +{recommendations.rewards.daily_bonus}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Футер з аналітикою (опціонально) */}
      <div className="ai-footer">
        <button
          onClick={fetchRecommendations}
          className="refresh-button"
          disabled={loading} // Блокуємо кнопку під час завантаження
        >
          {loading ? "Оновлення..." : "🔄 Оновити рекомендації"}
        </button>
        <p className="ai-analytics">
          Застосовано {recommendations.analytics.rules_fired} правил
        </p>
      </div>
    </div>
  );
};

export default AIRecommendations;
