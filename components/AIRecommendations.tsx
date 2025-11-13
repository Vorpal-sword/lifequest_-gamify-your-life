/**
 * AIRecommendations.tsx
 * * ФІНАЛЬНА ВЕРСІЯ (Лаб 2 + Лаб 3)
 * - Виправлено: Блоки (Health, Quests, Notifications) приховуються, якщо їх вміст порожній.
 * - Очікує вкладену відповідь: data.rules та data.ml.
 */

import React, { useEffect, useState } from "react";
import "./AIRecommendations.css";

// --- Типи ---
interface Quest {
  id: string;
  name: string;
  difficulty: string;
  xp_reward: number;
  category: string;
  suggested?: boolean;
  confidence?: number;
}
interface HealthTip {
  id: string;
  type: string;
  message: string;
  quest?: string;
  priority: string;
  icon: string;
  confidence?: number;
}
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  icon: string;
  confidence?: number;
}
interface RuleEngineData {
  status: string | null;
  quests: Quest[];
  health_tips: HealthTip[];
  notifications: Notification[];
  analytics: {
    rules_fired: number;
    fuzzy_results: any;
  };
}
interface MLModelData {
  predicted_productivity_score?: number | null;
  predicted_productivity_text?: string;
}
interface CombinedData {
  rules: RuleEngineData;
  ml: MLModelData;
}
interface SurveyData {
  stress_level?: number;
  sitting_hours?: number;
  physical_activity_today?: number;
}
interface AIRecommendationsProps {
  authToken: string;
  surveyData?: SurveyData;
}

// =============== КОМПОНЕНТ ===============
const AIRecommendations: React.FC<AIRecommendationsProps> = ({
  authToken,
  surveyData = {},
}) => {
  const [data, setData] = useState<CombinedData | null>(null);
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
      setData(result.data);
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
  }, [authToken]);

  const getConfidencePrefix = (confidence: number): string => {
    if (confidence >= 0.9) return "❗️ Важливо: ";
    if (confidence >= 0.7) return "💡 Схоже, що ";
    if (confidence >= 0.5) return "🤔 Можливо, ";
    return "▫️ ";
  };

  // --- Рендер ---

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

  if (error) {
    return (
      <div className="ai-recommendations">
        <div className="ai-error">
          <span className="error-icon">⚠️</span>
          <p>Помилка: {error}</p>
          <button onClick={fetchRecommendations} className="retry-button">
            Спробувати знову
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.rules) {
    return (
      <div className="ai-recommendations">
        <div className="ai-loading">
          <p>Натисніть "Оновити", щоб отримати AI-поради.</p>
          <div
            className="ai-footer"
            style={{ borderTop: 0, marginTop: "20px" }}
          >
            <button
              onClick={fetchRecommendations}
              className="refresh-button"
              disabled={loading}
            >
              {loading ? "Оновлення..." : "🔄 Оновити рекомендації"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Дістаємо дані
  const recommendations = data.rules;
  const mlPrediction = data.ml;

  // Захищені масиви
  const healthTips = recommendations.health_tips || [];
  const notifications = recommendations.notifications || [];
  const quests = recommendations.quests || [];

  // Перевірка на випадок, якщо немає жодних даних
  if (
    healthTips.length === 0 &&
    notifications.length === 0 &&
    quests.length === 0 &&
    mlPrediction?.predicted_productivity_score == null
  ) {
    return (
      <div className="ai-recommendations">
        <div className="ai-loading">
          <p>
            👍 AI не знайшов нічого, про що варто було б хвилюватися. Так
            тримати!
          </p>
        </div>
        <div className="ai-footer" style={{ borderTop: 0, marginTop: "20px" }}>
          <button
            onClick={fetchRecommendations}
            className="refresh-button"
            disabled={loading}
          >
            {loading ? "Оновлення..." : "🔄 Оновити рекомендації"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-recommendations">
      <div className="ai-header">
        <h2 className="ai-title">🤖 AI Асистент</h2>
        {recommendations.status && (
          <div className="user-status-badge">
            <span className="status-label">Статус:</span>
            <span className="status-value">{recommendations.status}</span>
          </div>
        )}
      </div>

      {/* --- Блок Лаб 3 (ML) --- */}
      {mlPrediction && mlPrediction.predicted_productivity_score != null && (
        <div className="ai-section ml-prediction-section">
          <h3 className="section-title">🔮 ML Прогноз продуктивності</h3>
          <div className="ml-content">
            <div className="ml-score">
              {mlPrediction.predicted_productivity_score}%
            </div>
            <div className="ml-text">
              Прогнозована продуктивність:{" "}
              <strong>{mlPrediction.predicted_productivity_text}</strong>
            </div>
          </div>
        </div>
      )}

      {/* --- Блоки Лаб 2 (Fuzzy Logic) --- */}

      {/* 1. Повідомлення (Статус/Прогрес) */}
      {notifications.length > 0 && (
        <div className="ai-section notifications-section">
          <h3 className="section-title">🔔 Нагадування (Прогрес)</h3>
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div key={notification.id} className="notification-card">
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

      {/* 2. Поради (Здоров'я/Wellness) */}
      {healthTips.length > 0 && (
        <div className="ai-section health-section">
          <h3 className="section-title">💪 Поради (Fuzzy)</h3>
          <div className="health-tips-list">
            {healthTips.map((tip) => (
              <div key={tip.id} className="health-tip-card">
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

      {/* 3. Квести */}
      {/* ✅ ВИПРАВЛЕНО: Блок рендериться лише якщо quests.length > 0 */}
      {quests.length > 0 && (
        <div className="ai-section quests-section">
          <h3 className="section-title">🎯 Рекомендовані квести</h3>
          <div className="quests-list">
            {quests.map((quest) => (
              <div
                key={quest.id || quest.name}
                className={`quest-card difficulty-${quest.difficulty} ${
                  quest.suggested ? "suggested" : ""
                }`}
              >
                <div className="quest-header">
                  {/* Назва квесту */}
                  <h4 className="quest-name">{quest.name}</h4>
                  {quest.suggested && (
                    <span className="suggested-badge">Рекомендовано</span>
                  )}
                </div>

                {/* ПОВНИЙ БЛОК З ДЕТАЛЯМИ (Difficulty, XP, Category) */}
                <div className="quest-details">
                  <span className={`difficulty-badge ${quest.difficulty}`}>
                    {quest.difficulty === "easy" && "⭐ Легко"}
                    {quest.difficulty === "medium" && "⭐⭐ Середньо"}
                    {quest.difficulty === "hard" && "⭐⭐⭐ Складно"}
                  </span>
                  {quest.xp_reward && (
                    <span className="quest-reward">+{quest.xp_reward} XP</span>
                  )}
                  {quest.category && (
                    <span className="quest-category">{quest.category}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Футер */}
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
