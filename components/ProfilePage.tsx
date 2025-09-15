import React, { useState, useContext, useRef } from "react";
import type { UserData } from "../hooks/useUserData.ts";
import { defaultAvatars } from "../services/api.ts";
import type { User } from "../types.ts";
import Card from "./ui/Card.tsx";
import ProgressBar from "./ui/ProgressBar.tsx";
import {
  Award,
  Flame,
  Star,
  Edit,
  Sun,
  Moon,
  X,
  Upload,
  Trash2,
  LogOut,
} from "lucide-react";
import { ThemeContext } from "../contexts/ThemeContext.tsx";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

interface EditProfileModalProps {
  user: User;
  onSave: (
    data: Partial<Pick<User, "name" | "avatarUrl" | "savedAvatars">>
  ) => void;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(user.name);
  const [currentAvatar, setCurrentAvatar] = useState(user.avatarUrl);
  const [savedAvatars, setSavedAvatars] = useState(
    user.savedAvatars || defaultAvatars
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave({ name, avatarUrl: currentAvatar, savedAvatars });
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setCurrentAvatar(base64);
      if (!savedAvatars.includes(base64)) {
        setSavedAvatars([base64, ...savedAvatars]);
      }
    }
  };

  const handleDeleteAvatar = (avatarToDelete: string) => {
    setSavedAvatars((prev) => prev.filter((av) => av !== avatarToDelete));
    if (currentAvatar === avatarToDelete) {
      setCurrentAvatar(defaultAvatars[0]);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-brand-secondary rounded-xl p-6 shadow-lg w-full max-w-sm relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-brand-text-secondary"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold font-display mb-4">Edit Profile</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-100 dark:bg-brand-primary p-3 rounded-md"
            required
          />
          <h3 className="font-semibold">Choose Avatar</h3>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square bg-gray-100 dark:bg-brand-primary rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-brand-accent hover:text-white"
            >
              <Upload size={24} />
              <span className="text-xs mt-1">Upload</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            {savedAvatars.map((avatar) => (
              <div key={avatar} className="relative group">
                <img
                  src={avatar}
                  onClick={() => setCurrentAvatar(avatar)}
                  className={`w-full h-full object-cover rounded-lg cursor-pointer border-4 ${
                    currentAvatar === avatar
                      ? "border-brand-accent"
                      : "border-transparent"
                  }`}
                />
                {!defaultAvatars.includes(avatar) && (
                  <button
                    onClick={() => handleDeleteAvatar(avatar)}
                    className="absolute -top-1 -right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            className="w-full bg-brand-accent hover:bg-brand-accent-light text-white font-bold py-3 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfilePage: React.FC<{ data: UserData }> = ({ data }) => {
  const { user, updateUser, logout } = data;
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [isEditModalOpen, setEditModalOpen] = useState(false);

  if (!user) return null; // Don't render if user data is not available

  return (
    <div className="p-4 space-y-6">
      <div className="relative flex flex-col items-center text-center">
        <button
          onClick={() => setEditModalOpen(true)}
          className="absolute top-0 right-0 bg-gray-100 dark:bg-brand-secondary p-2 rounded-full"
        >
          <Edit size={20} />
        </button>
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="w-24 h-24 rounded-full border-4 border-brand-accent mb-4"
        />
        <h1 className="text-3xl font-bold font-display">{user.name}</h1>
        <p className="text-brand-accent font-semibold">Level {user.level}</p>
      </div>
      <Card>
        <ProgressBar value={user.xp} max={user.xpToNextLevel} />
        <p className="text-sm text-center mt-2">
          {user.xp} / {user.xpToNextLevel} XP to Level {user.level + 1}
        </p>
      </Card>
      <Card>
        <h2 className="text-xl font-bold font-display mb-4">Settings</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-gray-100 dark:bg-brand-primary p-3 rounded-lg">
            <span className="font-semibold">Theme</span>
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 bg-gray-200 dark:bg-brand-secondary p-1 rounded-full"
            >
              <div
                className={`p-1 rounded-full ${
                  theme === "light" ? "bg-brand-accent text-white" : ""
                }`}
              >
                <Sun size={18} />
              </div>
              <div
                className={`p-1 rounded-full ${
                  theme === "dark" ? "bg-brand-accent text-white" : ""
                }`}
              >
                <Moon size={18} />
              </div>
            </button>
          </div>
          <button
            onClick={logout}
            className="w-full text-left flex items-center bg-gray-100 dark:bg-brand-primary p-3 rounded-lg font-semibold text-red-500 hover:bg-red-500/10"
          >
            <LogOut size={20} className="mr-3" />
            Sign Out
          </button>
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-bold font-display mb-4">Statistics</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <StatItem
            icon={Flame}
            value={user.streaks.dailyTasks}
            label="Daily Streak"
            color="text-orange-400"
          />
          <StatItem
            icon={Star}
            value={user.level}
            label="Level"
            color="text-yellow-400"
          />
          <StatItem
            icon={Award}
            value={user.badges.length}
            label="Badges Earned"
            color="text-blue-400"
          />
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-bold font-display mb-4">Badges</h2>
        <div className="grid grid-cols-3 gap-4">
          {user.badges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center text-center"
            >
              <div className="text-4xl p-3 bg-gray-100 dark:bg-brand-primary rounded-full mb-2">
                {badge.icon}
              </div>
              <p className="text-sm font-semibold">{badge.name}</p>
            </div>
          ))}
        </div>
      </Card>
      {isEditModalOpen && (
        <EditProfileModal
          user={user}
          onSave={updateUser}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </div>
  );
};

const StatItem: React.FC<{
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
}> = ({ icon: Icon, value, label, color }) => (
  <div className="bg-gray-100 dark:bg-brand-primary p-3 rounded-lg">
    <Icon className={`mx-auto h-8 w-8 mb-2 ${color}`} />
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-gray-500 dark:text-brand-text-secondary">
      {label}
    </p>
  </div>
);

export default ProfilePage;
