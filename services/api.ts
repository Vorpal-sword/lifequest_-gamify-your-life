import type {
  User as AppUser,
  Task,
  Group,
  Habit,
  AuthResponse,
} from "../types.ts";
import type { GoogleIdentityJwtPayload } from "../types.ts";

// This should be the base URL of your real backend server.
// For local development, this might be 'http://localhost:8080/api'
const API_BASE_URL = "http://127.0.0.1:8080/api";

export const defaultAvatars = [
  "https://cataas.com/cat?width=150&height=150&unique=1",
  "https://cataas.com/cat?width=150&height=150&unique=2",
  "https://cataas.com/cat?width=150&height=150&unique=3",
  "https://cataas.com/cat?width=150&height=150&unique=4",
];

// --- Real API Client ---
// A wrapper for the Fetch API to handle authentication, headers, and errors.
async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    // Attempt to parse error details from the response body
    let errorMessage = `API Error: Status ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody);
    } catch {
      const errorText = await response.text();
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  const responseText = await response.text();
  // Handle empty responses (like from a 204 No Content)
  if (!responseText) {
    return {} as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch (error) {
    console.error("API response was not valid JSON:", responseText);
    throw new Error("Failed to parse server response.");
  }
}

// --- USER AUTHENTICATION & DATA ---
// The backend will handle the logic of finding or creating a user.
export async function authenticateWithGoogle(
  googleToken: string
): Promise<AuthResponse> {
  return apiClient("/auth/google", {
    method: "POST",
    body: JSON.stringify({ token: googleToken }),
  });
}

// --- DATA OPERATIONS (REAL IMPLEMENTATIONS) ---

export const toggleTaskCompletion = (taskId: string): Promise<void> =>
  apiClient(`/tasks/${taskId}/toggle`, { method: "PUT" });
export const updateTaskProgress = (
  taskId: string,
  newProgress: number
): Promise<void> =>
  apiClient(`/tasks/${taskId}/progress`, {
    method: "PUT",
    body: JSON.stringify({ progress: newProgress }),
  });
export const addTask = (task: Omit<Task, "id" | "completed">): Promise<Task> =>
  apiClient("/tasks", { method: "POST", body: JSON.stringify(task) });
export const addHabit = (
  habitData: Omit<Habit, "id" | "history" | "startDate">
): Promise<Habit> =>
  apiClient("/habits", { method: "POST", body: JSON.stringify(habitData) });
export const updateUser = (
  userData: Partial<Pick<AppUser, "name" | "avatarUrl" | "savedAvatars">>
): Promise<AppUser> =>
  apiClient("/user", { method: "PATCH", body: JSON.stringify(userData) });
export const addFriend = (friendId: string): Promise<void> =>
  apiClient("/friends", { method: "POST", body: JSON.stringify({ friendId }) });
export const createGroup = (
  groupData: Omit<Group, "id" | "leaderId">
): Promise<Group> =>
  apiClient("/groups", { method: "POST", body: JSON.stringify(groupData) });
export const updateGroup = (
  groupId: string,
  newGroupData: Partial<Group>
): Promise<Group> =>
  apiClient(`/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(newGroupData),
  });
export const leaveGroup = (groupId: string): Promise<void> =>
  apiClient(`/groups/${groupId}/leave`, { method: "POST" });
