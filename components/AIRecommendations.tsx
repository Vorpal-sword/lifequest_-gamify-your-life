/**
 * AIRecommendations.tsx
 * * ОНОВЛЕНО: Додано логіку для "м'яких порад".
 * Текст повідомлень тепер змінюється залежно від 'confidence' (впевненості).
 */

import React, { useEffect, useState } from "react";
import "./AIRecommendations.css"; // Переконайтеся, що цей CSS файл існує

// --- Типи (залишаємо як є) ---
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
  confidence?: number; // Додано для Лаб. 2
}

interface HealthTip {
  id: string;
  type: string;
  message: string;
  quest?: string;
  priority: "low" | "medium" | "high";
  icon: string;
  confidence?: number; // Додано для Лаб. 2
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  icon: string;
  confidence?: number; // Додано для Лаб. 2
}

interface AIRecommendationsData {
  status: string | null;
  quests: Quest[];
  health_tips: HealthTip[];
  notifications: Notification[];
  level_info?: {};
  achievements?: Achievement[];
  rewards?: {};
  analytics: {
    rules_fired: number;
    new_facts: number;
  };
}

interface SurveyData {
  stress_level?: number;
  sitting_hours?: number;
  physical_activity_today?: number;
}

interface AIRecommendationsProps {
  authToken: string;
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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

      const response = await fetch(`${API_URL}/api/ai/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(surveyData),
      });

      if (!response.ok) {
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
    if (!authToken) {
      setLoading(false);
      setError("Not authenticated. Please log in.");
      return;
    }
    fetchRecommendations();

    if (autoRefresh) {
      const interval = setInterval(fetchRecommendations, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [authToken, autoRefresh, refreshInterval]);

  // =============== ЛОГІКА "М'ЯКИХ ПОРАД" ===============

  /**
   * Повертає "пом'якшувальну" фразу залежно від рівня впевненості.
   * @param confidence - Коефіцієнт упевненості (0.0 - 1.0)
   */
  const getConfidencePrefix = (confidence: number): string => {
    // 1.0 - 0.9 (Дуже висока впевненість)
    if (confidence >= 0.9) {
      return "❗️ Важливо: ";
    }
    // 0.89 - 0.7 (Висока впевненість)
    if (confidence >= 0.7) {
      return "💡 Схоже, що ";
    }
    // 0.69 - 0.5 (Середня впевненість) - М'ЯКА ПОРАДА
    if (confidence >= 0.5) {
      return "🤔 Можливо, ";
    }
    // < 0.5 (Низька впевненість)
    return "▫️ Є невелика ймовірність, що ";
  };

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
          {authToken && (
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
    return null;
  }

  // =============== MAIN RENDER ===============
  return (
    <div className="ai-recommendations">
      <div className="ai-header">
        <h2 className="ai-title">🤖 AI Рекомендації</h2>
        {recommendations.status && (
          <div className="user-status-badge">
            <span className="status-label">Статус:</span>
            <span className="status-value">{recommendations.status}</span>
          </div>
        )}
      </div>

      {/* ✅ ОНОВЛЕНО: Блок "notifications" тепер використовує getConfidencePrefix */}
      {recommendations.notifications &&
        recommendations.notifications.length > 0 && (
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
                    <p className="notif-message">
                      <strong>
                        {getConfidencePrefix(notification.confidence || 1.0)}
                      </strong>
                      {notification.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* ✅ ОНОВЛЕНО: Блок "health_tips" тепер використовує getConfidencePrefix */}
      {recommendations.health_tips &&
        recommendations.health_tips.length > 0 && (
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
                    <h4 className="tip-type">
                      {getConfidencePrefix(tip.confidence || 1.0)}
                      {tip.type}
                    </h4>
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

      {/* Блок "quests" (без змін) */}
      {recommendations.quests && recommendations.quests.length > 0 && (
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

      {/* Футер (без змін) */}
      <div className="ai-footer">
        <button
          onClick={fetchRecommendations}
          className="refresh-button"
          disabled={loading}
        >
          {loading ? "Оновлення..." : "🔄 Оновити рекомендації"}
        </button>
        {recommendations.analytics && (
          <p className="ai-analytics">
            Застосовано {recommendations.analytics.rules_fired} правил
          </p>
        )}
      </div>
    </div>
  );
};

export default AIRecommendations;
