export type Page = "Dashboard" | "Tasks" | "Social" | "Profile" | "Shop";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  currency: number;
  badges: Badge[];
  streaks: {
    dailyTasks: number;
  };
  friends: string[]; // Array of user IDs
  savedAvatars?: string[];
}

export type TaskType = "daily" | "quest";

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  xp: number;
  currencyReward: number;
  completed: boolean;
  estimate?: number; // in minutes
  dueDate?: Date;
  questOriginGroupId?: string; // Optional: links quest to a group
  isCounter?: boolean;
  progress?: number;
  target?: number;
}

export type HabitCompletionStatus = "completed" | "missed" | "pending";
export type HabitHistory = Record<number, HabitCompletionStatus>; // Key is now day number

export interface Habit {
  id: string;
  title: string;
  description: string;
  xpPerDay: number;
  currencyRewardPerDay: number;
  estimatePerDay: number; // in minutes
  startDate: string; // ISO string for date
  durationDays: number;
  history: HabitHistory;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatarUrl: string;
  level: number;
  weeklyXp: number;
  rank: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  members: string[]; // Array of user IDs
  activeQuest: string;
  activeQuestTarget?: number;
  activeQuestEstimate?: number;
}

export interface AnalyticsData {
  day: string;
  xp: number;
}

// A clear contract for the authentication API response
export interface AuthResponse {
  token: string;
  user: User;
  tasks: Task[];
  habits: Habit[];
  groups: Group[];
  allUsers: User[];
}

// Type for the decoded JWT payload from Google
export interface GoogleIdentityJwtPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string; // This is the user's unique Google ID
  email: string;
  email_verified: boolean;
  nbf: number;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  iat: number;
  exp: number;
  jti: string;
}

// Extend the Window interface to include the google object from the GSI script
declare global {
  interface Window {
    google: any;
  }
}
