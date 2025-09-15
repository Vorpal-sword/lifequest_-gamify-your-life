import React from "react";
import type { Habit } from "../../types.ts";
import Card from "../ui/Card.tsx";
import { Zap, Gift, Clock } from "lucide-react";

const HabitItem: React.FC<{
  habit: Habit;
  onToggleCompletion: (habitId: string, dayNumber: number) => void;
}> = ({ habit, onToggleCompletion }) => {
  const startDate = new Date(habit.startDate);
  const today = new Date();
  startDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const currentDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const days = Array.from({ length: habit.durationDays }, (_, i) => i + 1);

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-bold font-display">{habit.title}</h3>
        {habit.description && (
          <p className="text-sm text-gray-500 dark:text-brand-text-secondary">
            {habit.description}
          </p>
        )}
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-brand-text-secondary mt-2">
          <span className="flex items-center">
            <Zap size={12} className="mr-1 text-brand-xp" /> {habit.xpPerDay}{" "}
            XP/day
          </span>
          <span className="flex items-center">
            <Gift size={12} className="mr-1 text-brand-warning" />{" "}
            {habit.currencyRewardPerDay}/day
          </span>
          <span className="flex items-center">
            <Clock size={12} className="mr-1" /> {habit.estimatePerDay} min/day
          </span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((dayNumber) => {
          const status = habit.history[dayNumber] || "pending";
          const isToday = dayNumber === currentDay;
          const isPast = dayNumber < currentDay;
          const isFuture = dayNumber > currentDay;

          let buttonClass =
            "w-9 h-9 flex items-center justify-center rounded-full font-bold text-sm transition-colors ";

          if (isFuture) {
            buttonClass +=
              "bg-gray-200/50 dark:bg-brand-primary/50 text-gray-400 dark:text-brand-text-secondary cursor-not-allowed";
          } else if (status === "completed") {
            buttonClass += "bg-brand-success text-white";
          } else if (isPast) {
            buttonClass += "bg-red-500/20 text-red-500";
          } else {
            // isToday and pending
            buttonClass +=
              "bg-gray-100 dark:bg-brand-primary hover:bg-brand-accent hover:text-white";
          }

          if (isToday) {
            buttonClass += " ring-2 ring-brand-accent-light";
          }

          return (
            <button
              key={dayNumber}
              disabled={isFuture}
              onClick={() => onToggleCompletion(habit.id, dayNumber)}
              className={buttonClass}
              aria-label={`Day ${dayNumber}, status: ${status}`}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default HabitItem;
