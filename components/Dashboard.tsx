/**
 * Dashboard.tsx
 * * ОНОВЛЕНО: Додано інтерактивні поля для 'stress_level' та 'sitting_hours'.
 */

import React, { useState } from "react"; // <-- 1. Імпортуємо useState
import AIRecommendations from "./AIRecommendations";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { UserData } from "../hooks/useUserData.ts";
import Card from "./ui/Card.tsx";
import ProgressBar from "./ui/ProgressBar.tsx";
import TaskItem from "./tasks/TaskItem.tsx";

// Інтерфейс для пропсів дашборду
interface DashboardProps {
  data: UserData;
  token: string | null;
}

// Припускаємо, що цей тип існує
interface AnalyticsData {
  day: string;
  xp: number;
}

const Dashboard: React.FC<DashboardProps> = ({ data, token }) => {
  const { user, tasks, analytics, toggleTaskCompletion } = data;

  // --- 2. Створюємо стан (state) для наших суб'єктивних даних ---
  const [stressLevel, setStressLevel] = useState(5);
  const [sittingHours, setSittingHours] = useState(1);
  const [physicalActivity, setPhysicalActivity] = useState(0);

  if (!user) {
    return <div>Loading user data...</div>;
  }

  const todayTasks = tasks.filter((t) => t.type === "daily").slice(0, 3);

  // 3. Формуємо 'surveyData' на основі нашого стану (state)
  // Тепер ці дані динамічні!
  const surveyData = {
    stress_level: stressLevel,
    sitting_hours: sittingHours,
    physical_activity_today: physicalActivity,
  };

  return (
    <div className="p-4 space-y-6">
      <Header user={user} />

      {/* 4. Компонент AI тепер отримує динамічні дані */}
      {token && <AIRecommendations authToken={token} surveyData={surveyData} />}

      {/* --- 5. НОВА КАРТКА ДЛЯ ВВЕДЕННЯ ДАНИХ --- */}
      <Card>
        <h2 className="text-xl font-bold font-display mb-4">
          Щоденний Check-in
        </h2>
        <p className="text-sm text-gray-500 dark:text-brand-text-secondary mb-4">
          Оновіть ці дані, щоб отримати персоналізовані AI-поради.
        </p>
        <div className="space-y-4">
          {/* Поле для Рівня Стресу */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Рівень стресу (від 1 до 10): <strong>{stressLevel}</strong>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={stressLevel}
              onChange={(e) => setStressLevel(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          {/* Поле для Годин Сидіння */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Годин сидіння сьогодні: <strong>{sittingHours}</strong>
            </label>
            <input
              type="range"
              min="0"
              max="12"
              value={sittingHours}
              onChange={(e) => setSittingHours(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>
      </Card>

      {/* --- Решта вашого дашборду --- */}
      <Card>
        <h2 className="text-xl font-bold font-display mb-3">Today's Focus</h2>
        <div className="space-y-3">
          {todayTasks.length > 0 ? (
            todayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleCompletion={toggleTaskCompletion}
              />
            ))
          ) : (
            <p className="text-gray-500 dark:text-brand-text-secondary">
              No daily tasks for today. Add one!
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold font-display mb-3">Weekly Progress</h2>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <BarChart
              data={analytics as AnalyticsData[]}
              margin={{ top: 5, right: 0, left: -20, bottom: 5 }}
            >
              <XAxis
                dataKey="day"
                tick={{ fill: "#A0A0A0" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#A0A0A0" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#25293C",
                  border: "none",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#E0E0E0" }}
              />
              <Bar dataKey="xp" name="XP Gained">
                {(analytics as AnalyticsData[]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={"#6A5AF9"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

// --- Компонент Header (без змін) ---
type User = NonNullable<UserData["user"]>;

const Header: React.FC<{ user: User }> = ({ user }) => {
  return (
    <Card className="flex items-center space-x-4">
      <img
        src={user.avatarUrl}
        alt={user.name}
        className="w-16 h-16 rounded-full border-2 border-brand-accent"
      />
      <div className="flex-1">
        <h1 className="text-2xl font-bold font-display">
          Welcome, {user.name}!
        </h1>
        <p className="text-gray-500 dark:text-brand-text-secondary">
          Level {user.level}
        </p>
        <div className="mt-2">
          <ProgressBar value={user.xp} max={user.xpToNextLevel} />
          <p className="text-xs text-right mt-1 text-gray-500 dark:text-brand-text-secondary">
            {user.xp} / {user.xpToNextLevel} XP
          </p>
        </div>
      </div>
    </Card>
  );
};

export default Dashboard;
