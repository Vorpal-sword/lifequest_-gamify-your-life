/**
 * Dashboard.tsx
 * Головна інформаційна панель.
 * Тепер приймає 'data' (типу UserData) та 'token' як окремі пропси.
 */

import React from "react";
import AIRecommendations from "./AIRecommendations"; // Переконайтеся, що шлях правильний
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { UserData } from "../hooks/useUserData.ts"; // Припускаємо, що цей тип існує
import Card from "./ui/Card.tsx"; // Переконайтеся, що шлях правильний
import ProgressBar from "./ui/ProgressBar.tsx"; // Переконайтеся, що шлях правильний
import TaskItem from "./tasks/TaskItem.tsx"; // Переконайтеся, що шлях правильний

// --- 1. ОНОВЛЕННЯ ІНТЕРФЕЙСУ PROPS ---
// Нам потрібно приймати 'data' (що відповідає типу UserData)
// і 'token' (який, ймовірно, має тип string | null)
interface DashboardProps {
  data: UserData;
  token: string | null; // Додаємо 'token' сюди
}

// Припускаємо, що ваш тип UserData виглядає приблизно так:
/*
interface User {
  name: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  // ...інші поля user
}
interface Task {
  id: string;
  type: 'daily' | 'quest';
  completed: boolean;
  // ...інші поля task
}
interface AnalyticsData {
  day: string;
  xp: number;
}
export interface UserData {
  user: User | null;
  tasks: Task[];
  analytics: AnalyticsData[];
  toggleTaskCompletion: (taskId: string) => void;
  // ...інші поля та методи з вашого хука
}
*/

// --- 2. ОНОВЛЕННЯ КОМПОНЕНТА ---
const Dashboard: React.FC<DashboardProps> = ({ data, token }) => {
  // 3. 'token' більше не потрібно діставати з 'data'
  const { user, tasks, analytics, toggleTaskCompletion } = data;

  // Перевірка на випадок, якщо 'user' ще не завантажено
  if (!user) {
    return <div>Loading user data...</div>;
  }

  const todayTasks = tasks.filter((t) => t.type === "daily").slice(0, 3);

  // Дані "опитування", яких немає на сервері (приклад)
  // TODO: Отримувати ці дані з модального вікна або форми
  const surveyData = {
    stress_level: 5,
    sitting_hours: 3,
  };

  return (
    <div className="p-4 space-y-6">
      <Header user={user} />

      {/* 4. ПЕРЕВІРКА TOKEN 
          Рендеримо AI-рекомендації, лише якщо токен існує.
          Ми передаємо 'token', який отримали з props.
      */}
      {token && <AIRecommendations authToken={token} surveyData={surveyData} />}

      {/* Решта вашого дашборду */}
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
              data={analytics}
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
                {analytics.map((entry, index) => (
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

// Тип для 'user' всередині 'UserData'
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
