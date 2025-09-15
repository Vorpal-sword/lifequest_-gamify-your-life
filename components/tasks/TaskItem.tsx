import React from "react";
import type { Task } from "../../types.ts";
import { Check, Circle, Zap, Gift, Clock, Plus, Minus } from "lucide-react";
import ProgressBar from "../ui/ProgressBar.tsx";

interface TaskItemProps {
  task: Task;
  onToggleCompletion: (taskId: string) => void;
  onUpdateProgress?: (taskId: string) => void;
  onDecrementProgress?: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleCompletion,
  onUpdateProgress,
  onDecrementProgress,
}) => {
  const containerClasses = `p-3 rounded-lg transition-all duration-300 ${
    task.completed
      ? "bg-green-500/10 opacity-70"
      : "bg-gray-100 dark:bg-brand-primary hover:bg-gray-200/50 dark:hover:bg-brand-primary/50"
  }`;

  if (task.isCounter) {
    const progress = task.progress || 0;
    const target = task.target || 1;
    return (
      <div className={`${containerClasses} flex flex-col`}>
        <div className="flex items-center">
          <div className="flex-1">
            <p
              className={`font-semibold ${
                task.completed
                  ? "line-through text-gray-500 dark:text-brand-text-secondary"
                  : "text-gray-800 dark:text-brand-text"
              }`}
            >
              {task.title}
            </p>
            {task.description && (
              <p className="text-sm text-gray-500 dark:text-brand-text-secondary mt-1">
                {task.description}
              </p>
            )}
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-brand-text-secondary mt-2">
              <span className="flex items-center">
                <Zap size={12} className="mr-1 text-brand-xp" /> {task.xp} XP
              </span>
              <span className="flex items-center">
                <Gift size={12} className="mr-1 text-brand-warning" />{" "}
                {task.currencyReward}
              </span>
              {task.estimate && (
                <span className="flex items-center">
                  <Clock size={12} className="mr-1" /> {task.estimate} min/rep
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => onDecrementProgress?.(task.id)}
              disabled={progress <= 0}
              className="bg-gray-200 dark:bg-brand-secondary disabled:bg-gray-400/20 dark:disabled:bg-brand-primary/50 disabled:cursor-not-allowed text-gray-800 dark:text-white rounded-full p-2 shadow-lg transition-transform transform enabled:hover:scale-110"
            >
              <Minus size={24} />
            </button>
            <button
              onClick={() => onUpdateProgress?.(task.id)}
              disabled={task.completed}
              className="bg-brand-accent disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-full p-2 shadow-lg transition-transform transform enabled:hover:scale-110"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={progress} max={target} />
          <p className="text-xs text-right mt-1 text-gray-500 dark:text-brand-text-secondary">
            {progress} / {target}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${containerClasses} flex items-start`}>
      <button
        onClick={() => onToggleCompletion(task.id)}
        className="mr-4 mt-1"
        aria-label={
          task.completed ? "Mark as not completed" : "Mark as completed"
        }
      >
        {task.completed ? (
          <Check className="h-7 w-7 text-brand-success" />
        ) : (
          <Circle className="h-7 w-7 text-gray-400 dark:text-brand-text-secondary hover:text-brand-accent" />
        )}
      </button>
      <div className="flex-1">
        <p
          className={`font-semibold ${
            task.completed
              ? "line-through text-gray-500 dark:text-brand-text-secondary"
              : "text-gray-800 dark:text-brand-text"
          }`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-sm text-gray-500 dark:text-brand-text-secondary mt-1">
            {task.description}
          </p>
        )}
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-brand-text-secondary mt-2">
          <span className="flex items-center">
            <Zap size={12} className="mr-1 text-brand-xp" /> {task.xp} XP
          </span>
          <span className="flex items-center">
            <Gift size={12} className="mr-1 text-brand-warning" />{" "}
            {task.currencyReward}
          </span>
          {task.estimate && (
            <span className="flex items-center">
              <Clock size={12} className="mr-1" /> {task.estimate} min
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
