import React, { useState, useEffect, useContext, createContext } from "react";
import io from "socket.io-client"; // Placeholder for real-time updates
import type {
  User,
  Task,
  LeaderboardEntry,
  Group,
  AnalyticsData,
  Habit,
  AuthResponse,
} from "../types.ts";
import * as api from "../services/api.ts";

export interface UserData {
  isLoading: boolean;
  user: User | null;
  tasks: Task[];
  habits: Habit[];
  groups: Group[];
  analytics: AnalyticsData[];
  leaderboard: LeaderboardEntry[];
  allUsers: User[];
  login: (googleResponse: any) => Promise<void>;
  logout: () => Promise<void>;
  toggleTaskCompletion: (taskId: string) => Promise<void>;
  updateTaskProgress: (
    taskId: string,
    direction: "increment" | "decrement"
  ) => Promise<void>;
  addTask: (task: Omit<Task, "id" | "completed">) => Promise<unknown>;
  addHabit: (
    habitData: Omit<Habit, "id" | "history" | "startDate">
  ) => Promise<unknown>;
  toggleHabitCompletion: (habitId: string, dayNumber: number) => Promise<void>;
  updateUser: (
    userData: Partial<Pick<User, "name" | "avatarUrl" | "savedAvatars">>
  ) => Promise<unknown>;
  addFriend: (friendId: string) => Promise<unknown>;
  createGroup: (groupData: Omit<Group, "id" | "leaderId">) => Promise<unknown>;
  updateGroup: (
    groupId: string,
    newGroupData: Partial<Group>
  ) => Promise<unknown>;
  leaveGroup: (groupId: string) => Promise<unknown>;
}

const UserDataContext = createContext<UserData | undefined>(undefined);

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false); // Set to false initially
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Note: Session persistence logic (e.g., re-fetching user on page load with a stored token)
  // would go here in a full production app. For simplicity, we are skipping it.
  // A page refresh will require logging in again.

  const login = async (googleResponse: any) => {
    setIsLoading(true);
    try {
      const googleToken = googleResponse.credential;
      // The backend will verify the token, find/create a user, and return a session token + initial data
      const data: AuthResponse = await api.authenticateWithGoogle(googleToken);

      // Store our own session token, not the entire user object
      localStorage.setItem("authToken", data.token);

      setUser(data.user);
      setTasks(data.tasks);
      setHabits(data.habits || []);
      setGroups(data.groups || []);
      setAllUsers(data.allUsers || []);
    } catch (error) {
      console.error("Login process failed:", error);
      // Clear any potentially stale tokens
      localStorage.removeItem("authToken");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Disable Google's automatic sign-in for the next visit
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }

    localStorage.removeItem("authToken");

    // Reset all application state
    setUser(null);
    setTasks([]);
    setHabits([]);
    setGroups([]);
    setAllUsers([]);
  };

  // --- Real-time Updates (Placeholder) ---
  useEffect(() => {
    if (!user) return;
    // In a real app, you would connect to your WebSocket server here
    // const socket = io('YOUR_SERVER_URL', { query: { userId: user.id } });
    // socket.on('connect', () => console.log('WebSocket connected!'));
    // return () => { socket.disconnect(); };
  }, [user]);

  // --- Optimistic UI Updates ---
  const toggleTaskCompletion = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.isCounter) return;

    const originalTasks = tasks;
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setTasks(updatedTasks);

    try {
      await api.toggleTaskCompletion(taskId);
    } catch (error) {
      console.error("Failed to toggle task:", error);
      setTasks(originalTasks); // Revert on error
    }
  };

  const updateTaskProgress = async (
    taskId: string,
    direction: "increment" | "decrement"
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.isCounter) return;

    const originalTasks = tasks;
    const currentProgress = task.progress || 0;
    const newProgress =
      direction === "increment"
        ? currentProgress + 1
        : Math.max(0, currentProgress - 1);

    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, progress: newProgress } : t
    );
    setTasks(updatedTasks);

    try {
      await api.updateTaskProgress(taskId, newProgress);
    } catch (error) {
      console.error("Failed to update task progress:", error);
      setTasks(originalTasks); // Revert
    }
  };

  const value: UserData = {
    isLoading,
    user,
    tasks,
    habits,
    groups,
    analytics,
    leaderboard: [], // This would be calculated from allUsers on the backend
    allUsers,
    login,
    logout,
    toggleTaskCompletion,
    updateTaskProgress,
    addTask: api.addTask,
    addHabit: api.addHabit,
    toggleHabitCompletion: async (habitId: string, dayNumber: number) => {
      /* optimistic update needed */
    },
    updateUser: api.updateUser,
    addFriend: api.addFriend,
    createGroup: api.createGroup,
    updateGroup: api.updateGroup,
    leaveGroup: api.leaveGroup,
  };

  return React.createElement(UserDataContext.Provider, { value }, children);
};

export const useUserData = (): UserData => {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
};
