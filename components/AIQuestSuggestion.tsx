// components/AIQuestSuggestion.tsx
import React, { useState } from "react";
import { Sparkles, Zap, Gift, Clock, RefreshCw, X } from "lucide-react";

interface Quest {
  title: string;
  description: string;
  xp: number;
  currencyReward: number;
  estimate: number;
  category?: string;
  difficulty?: string;
}

interface AIQuestSuggestionProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (quest: Quest) => void;
}

const AIQuestSuggestion: React.FC<AIQuestSuggestionProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  const [quest, setQuest] = useState<Quest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        "http://localhost:8080/api/quest-suggestions/generate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timeOfDay: getTimeOfDay(),
            recentActivities: [], // Можна додати логіку для recent activities
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate quest");
      }

      const result = await response.json();

      if (result.success) {
        setQuest(result.quest);
      } else {
        setError(result.message || "Failed to generate quest");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!quest) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        "http://localhost:8080/api/quest-suggestions/accept",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quest }),
        }
      );

      if (response.ok) {
        onAccept(quest);
        onClose();
      } else {
        throw new Error("Failed to accept quest");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept quest");
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "hard":
        return "text-red-400";
      default:
        return "text-blue-400";
    }
  };

  // Auto-generate quest when modal opens
  React.useEffect(() => {
    if (isOpen && !quest && !isLoading) {
      generateQuest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-purple-500/20 p-2 rounded-lg">
            <Sparkles className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">New Quest Suggestion</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI-powered quest just for you
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Generating your perfect quest...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
            <p className="text-red-500 text-sm">{error}</p>
            <button
              onClick={generateQuest}
              className="mt-2 text-red-500 hover:text-red-600 text-sm underline"
            >
              Try Again
            </button>
          </div>
        )}

        {quest && !isLoading && (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2">
                {quest.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {quest.description}
              </p>

              {quest.category && (
                <div className="mt-3">
                  <span className="inline-block bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs font-medium capitalize">
                    {quest.category}
                  </span>
                  {quest.difficulty && (
                    <span
                      className={`ml-2 inline-block px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                        quest.difficulty
                      )}`}
                    >
                      {quest.difficulty}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-6">
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {quest.xp} XP
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <Gift className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                  {quest.currencyReward}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-300">
                  {quest.estimate} min
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={generateQuest}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                <span>Regenerate</span>
              </button>

              <button
                onClick={handleAccept}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Accept Quest
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AIQuestSuggestion;
