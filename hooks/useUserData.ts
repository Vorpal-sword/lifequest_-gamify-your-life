import React, { useState, useEffect, useContext, createContext } from "react";
import io from "socket.io-client"; // Placeholder for real-time updates
import type {
  User,
  Task,
  LeaderboardEntry,
  Group,
  AnalyticsData,
  Habit,
  GoogleIdentityJwtPayload,
} from "../types";
import * as api from "../services/api";

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
  addTask: (task: Omit<Task, "id" | "completed">) => Promise<void>;
  addHabit: (
    habitData: Omit<Habit, "id" | "history" | "startDate">
  ) => Promise<void>;
  toggleHabitCompletion: (habitId: string, dayNumber: number) => Promise<void>;
  updateUser: (
    userData: Partial<Pick<User, "name" | "avatarUrl" | "savedAvatars">>
  ) => Promise<void>;
  addFriend: (friendId: string) => Promise<void>;
  createGroup: (groupData: Omit<Group, "id" | "leaderId">) => Promise<void>;
  updateGroup: (groupId: string, newGroupData: Partial<Group>) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
}

const UserDataContext = createContext<UserData | undefined>(undefined);

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true); // Start loading to check for session
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Attempt to restore session on initial app load
  useEffect(() => {
    const attemptRestoreSession = async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const { user, tasks, habits, groups, allUsers } =
            await api.restoreSession();
          setUser(user);
          setTasks(tasks || []);
          setHabits(habits || []);
          setGroups(groups || []);
          setAllUsers(allUsers || []);
        } catch (error) {
          console.error("Session restore failed:", error);
          localStorage.removeItem("authToken"); // Token is invalid, remove it
        }
      }
      setIsLoading(false); // Stop loading after attempt
    };

    attemptRestoreSession();
  }, []); // Empty dependency array means it runs only once on mount

  const login = async (googleResponse: any) => {
    setIsLoading(true);
    try {
      const googleToken = googleResponse.credential;
      // The backend will verify the token, find/create a user, and return a session token + initial data
      const { token, user, tasks, habits, groups, allUsers } =
        await api.authenticateWithGoogle(googleToken);

      // Store our own session token, not the entire user object
      localStorage.setItem("authToken", token);

      setUser(user);
      setTasks(tasks);
      setHabits(habits || []);
      setGroups(groups || []);
      setAllUsers(allUsers || []);
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

  const addTask = async (taskData: Omit<Task, "id" | "completed">) => {
    try {
      const newTask = await api.addTask(taskData);
      setTasks((prev) => [...prev, newTask]);
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  const addHabit = async (
    habitData: Omit<Habit, "id" | "history" | "startDate">
  ) => {
    try {
      const newHabit = await api.addHabit(habitData);
      setHabits((prev) => [...prev, newHabit]);
    } catch (error) {
      console.error("Failed to add habit:", error);
    }
  };

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

  const toggleHabitCompletion = async (habitId: string, dayNumber: number) => {
    const originalHabits = habits;
    const updatedHabits = habits.map((h) => {
      if (h.id === habitId) {
        const newHistory = { ...h.history };
        const currentStatus = newHistory[dayNumber];
        newHistory[dayNumber] =
          currentStatus === "completed" ? "pending" : "completed";
        return { ...h, history: newHistory };
      }
      return h;
    });
    setHabits(updatedHabits);

    try {
      await api.toggleHabitCompletion(habitId, dayNumber);
    } catch (error) {
      console.error("Failed to toggle habit completion:", error);
      setHabits(originalHabits); // Revert on error
    }
  };

  const updateUser = async (
    userData: Partial<Pick<User, "name" | "avatarUrl" | "savedAvatars">>
  ) => {
    if (!user) return;
    const originalUser = { ...user };
    setUser({ ...user, ...userData }); // Optimistic update
    try {
      const updatedUser = await api.updateUser(userData);
      setUser(updatedUser); // Sync with server
    } catch (error) {
      console.error("Failed to update user:", error);
      setUser(originalUser); // Revert
    }
  };

  const addFriend = async (friendId: string) => {
    if (!user) return;
    const originalUser = { ...user };
    setUser({ ...user, friends: [...user.friends, friendId] }); // Optimistic update
    try {
      const updatedUser = await api.addFriend(friendId);
      setUser(updatedUser); // Sync with server
    } catch (error) {
      console.error("Failed to add friend:", error);
      setUser(originalUser); // Revert
    }
  };

  const createGroup = async (groupData: Omit<Group, "id" | "leaderId">) => {
    try {
      const { group, task } = await api.createGroup(groupData);
      if (group && group.id) {
        setGroups((prev) => [...prev, group]);
      }
      if (task && task.id) {
        setTasks((prev) => [...prev, task]);
      }
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  const updateGroup = async (groupId: string, newGroupData: Partial<Group>) => {
    const originalGroups = [...groups];
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...newGroupData } : g))
    ); // Optimistic
    try {
      const updatedGroup = await api.updateGroup(groupId, newGroupData);
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? updatedGroup : g))
      ); // Sync
    } catch (error) {
      console.error("Failed to update group:", error);
      setGroups(originalGroups); // Revert
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    const originalGroups = [...groups];
    const originalTasks = [...tasks];
    setGroups((prev) => prev.filter((g) => g.id !== groupId)); // Optimistic
    try {
      await api.leaveGroup(groupId);
      // On success, also remove the group's quest task from state
      setTasks((prev) => prev.filter((t) => t.questOriginGroupId !== groupId));
    } catch (error) {
      console.error("Failed to leave group:", error);
      setGroups(originalGroups); // Revert
      setTasks(originalTasks);
    }
  };

  const value: UserData = {
    isLoading,
    user,
    tasks,
    habits,
    groups,
    analytics,
    leaderboard: [],
    allUsers,
    login,
    logout,
    toggleTaskCompletion,
    updateTaskProgress,
    addTask,
    addHabit,
    toggleHabitCompletion,
    updateUser,
    addFriend,
    createGroup,
    updateGroup,
    leaveGroup,
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
