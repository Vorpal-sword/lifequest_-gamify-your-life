import React, { useState, useMemo } from "react";
import type { UserData } from "../hooks/useUserData.ts";
import type { Task, TaskType, Habit } from "../types.ts";
import TaskItem from "./tasks/TaskItem.tsx";
import HabitItem from "./habits/HabitItem.tsx";
import { Plus, X } from "lucide-react";

type ModalMode = TaskType | "habit";

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  mode: ModalMode;
}

const AddModal: React.FC<AddModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [xp, setXp] = useState(10);
  const [currency, setCurrency] = useState(5);
  const [estimate, setEstimate] = useState(30);
  const [duration, setDuration] = useState(30);
  const [isCounter, setIsCounter] = useState(false);
  const [target, setTarget] = useState(10);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setXp(10);
    setCurrency(5);
    setEstimate(30);
    setDuration(30);
    setIsCounter(false);
    setTarget(10);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    let data;
    if (mode === "habit") {
      data = {
        title,
        description,
        xpPerDay: xp,
        currencyRewardPerDay: currency,
        estimatePerDay: estimate,
        durationDays: duration,
      };
    } else if (mode === "quest" && isCounter) {
      data = {
        title,
        description,
        type: "quest",
        xp,
        currencyReward: currency,
        estimate,
        isCounter,
        target,
      };
    } else {
      data = {
        title,
        description,
        type: mode,
        xp,
        currencyReward: currency,
        estimate,
      };
    }
    onSubmit(data);
    resetForm();
    onClose();
  };

  const typeName = mode.charAt(0).toUpperCase() + mode.slice(1);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-brand-secondary rounded-xl p-6 shadow-lg w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-brand-text-secondary hover:text-gray-800 dark:hover:text-white"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold font-display mb-4">
          Add New {typeName}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-100 dark:bg-brand-primary p-3 rounded-md border border-gray-200 dark:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-accent"
            required
            autoFocus
          />
          <textarea
            placeholder="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-gray-100 dark:bg-brand-primary p-3 rounded-md border border-gray-200 dark:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />

          {mode === "habit" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Duration (days)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-gray-100 dark:bg-brand-primary p-2 rounded-md"
                min="1"
              />
            </div>
          )}

          {mode === "quest" && (
            <div className="flex items-center justify-between bg-gray-100 dark:bg-brand-primary p-3 rounded-lg">
              <label htmlFor="isCounter" className="font-semibold">
                Counter Quest?
              </label>
              <button
                type="button"
                onClick={() => setIsCounter(!isCounter)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isCounter ? "bg-brand-accent" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isCounter ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

          {isCounter && mode === "quest" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Target Reps
              </label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full bg-gray-100 dark:bg-brand-primary p-2 rounded-md"
                min="1"
              />
            </div>
          )}

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Estimate (min
                {mode === "habit" ? "/day" : isCounter ? "/rep" : ""})
              </label>
              <input
                type="number"
                value={estimate}
                onChange={(e) => setEstimate(Number(e.target.value))}
                className="w-full bg-gray-100 dark:bg-brand-primary p-2 rounded-md"
                min="0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                XP Reward{mode === "habit" ? "/day" : ""}
              </label>
              <input
                type="number"
                value={xp}
                onChange={(e) => setXp(Number(e.target.value))}
                className="w-full bg-gray-100 dark:bg-brand-primary p-2 rounded-md"
                min="0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Coin Reward{mode === "habit" ? "/day" : ""}
              </label>
              <input
                type="number"
                value={currency}
                onChange={(e) => setCurrency(Number(e.target.value))}
                className="w-full bg-gray-100 dark:bg-brand-primary p-2 rounded-md"
                min="0"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-brand-accent hover:bg-brand-accent-light text-white font-bold py-3 rounded-lg transition-colors"
          >
            Add {typeName}
          </button>
        </form>
      </div>
    </div>
  );
};

const TasksPage: React.FC<{ data: UserData }> = ({ data }) => {
  const {
    user,
    tasks,
    habits,
    groups,
    toggleTaskCompletion,
    updateTaskProgress,
    addTask,
    addHabit,
    toggleHabitCompletion,
  } = data;
  const [activeTab, setActiveTab] = useState<ModalMode>("daily");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { dailies, personalQuests, groupQuests } = useMemo(() => {
    if (!user) return { dailies: [], personalQuests: [], groupQuests: [] };
    const userGroupIds = new Set(
      groups.filter((g) => g.members.includes(user.id)).map((g) => g.id)
    );
    return {
      dailies: tasks.filter((task) => task.type === "daily"),
      personalQuests: tasks.filter(
        (task) => task.type === "quest" && !task.questOriginGroupId
      ),
      groupQuests: tasks.filter(
        (task) =>
          task.type === "quest" &&
          task.questOriginGroupId &&
          userGroupIds.has(task.questOriginGroupId)
      ),
    };
  }, [tasks, groups, user]);

  const tabs: { label: string; type: ModalMode }[] = [
    { label: "Dailies", type: "daily" },
    { label: "Habits", type: "habit" },
    { label: "Quests", type: "quest" },
  ];

  const handleSubmit = (formData: any) => {
    activeTab === "habit" ? addHabit(formData) : addTask(formData);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "daily":
        return dailies.length > 0 ? (
          dailies.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleCompletion={toggleTaskCompletion}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-brand-text-secondary mt-8">
            No daily tasks found.
          </p>
        );
      case "habit":
        return habits.length > 0 ? (
          habits.map((habit) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              onToggleCompletion={toggleHabitCompletion}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-brand-text-secondary mt-8">
            No habits found.
          </p>
        );
      case "quest":
        return (
          <div>
            <h2 className="text-xl font-bold font-display mb-3">
              Personal Quests
            </h2>
            <div className="space-y-4 mb-6">
              {personalQuests.length > 0 ? (
                personalQuests.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleCompletion={toggleTaskCompletion}
                    onUpdateProgress={(taskId) =>
                      updateTaskProgress(taskId, "increment")
                    }
                    onDecrementProgress={(taskId) =>
                      updateTaskProgress(taskId, "decrement")
                    }
                  />
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-brand-text-secondary py-4">
                  No personal quests.
                </p>
              )}
            </div>
            <h2 className="text-xl font-bold font-display mb-3">
              Group Quests
            </h2>
            <div className="space-y-4">
              {groupQuests.length > 0 ? (
                groupQuests.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleCompletion={toggleTaskCompletion}
                    onUpdateProgress={(taskId) =>
                      updateTaskProgress(taskId, "increment")
                    }
                    onDecrementProgress={(taskId) =>
                      updateTaskProgress(taskId, "decrement")
                    }
                  />
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-brand-text-secondary py-4">
                  No active group quests.
                </p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold font-display mb-6">Tasks & Habits</h1>
      <div className="flex space-x-2 border-b-2 border-gray-200 dark:border-brand-secondary mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={`px-4 py-2 text-lg font-semibold transition-colors duration-200 ${
              activeTab === tab.type
                ? "border-b-2 border-brand-accent text-brand-accent"
                : "text-gray-500 dark:text-brand-text-secondary hover:text-gray-800 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{renderContent()}</div>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 bg-brand-accent hover:bg-brand-accent-light text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110"
        aria-label="Add new item"
      >
        <Plus size={28} />
      </button>
      <AddModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        mode={activeTab}
      />
    </div>
  );
};

export default TasksPage;
