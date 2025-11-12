import React from "react";
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

const Dashboard: React.FC<{ data: UserData }> = ({ data }) => {
  const { user, tasks, analytics, toggleTaskCompletion } = data;

  // Ensure user is not null before rendering
  if (!user) return null;

  const todayTasks = tasks.filter((t) => t.type === "daily").slice(0, 3);

  return (
    <div className="p-4 space-y-6">
      <Header user={user} />

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

const Header: React.FC<{ user: UserData["user"] }> = ({ user }) => {
  if (!user) return null;
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
