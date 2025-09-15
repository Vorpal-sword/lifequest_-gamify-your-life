import React, { useState, useCallback, useEffect } from "react";
import { Home, CheckSquare, Users, User as UserIcon } from "lucide-react";

import type { Page } from "./types.ts";
import { useUserData, UserDataProvider } from "./hooks/useUserData.ts";
import Dashboard from "./components/Dashboard.tsx";
import TasksPage from "./components/TasksPage.tsx";
import SocialPage from "./components/SocialPage.tsx";
import ProfilePage from "./components/ProfilePage.tsx";
import LoginScreen from "./components/LoginScreen.tsx";

const AppContent: React.FC = () => {
  const data = useUserData();
  const [activePage, setActivePage] = useState<Page>("Dashboard");

  const renderPage = useCallback(() => {
    if (!data.user) return null;

    switch (activePage) {
      case "Dashboard":
        return <Dashboard data={data} />;
      case "Tasks":
        return <TasksPage data={data} />;
      case "Social":
        return <SocialPage data={data} />;
      case "Profile":
        return <ProfilePage data={data} />;
      default:
        return <Dashboard data={data} />;
    }
  }, [activePage, data]);

  if (data.isLoading) {
    return (
      <div className="min-h-screen bg-brand-primary flex justify-center items-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-brand-accent"></div>
      </div>
    );
  }

  if (!data.user) {
    return <LoginScreen onLogin={data.login} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-brand-primary font-sans text-gray-800 dark:text-brand-text flex flex-col justify-between">
      <main className="flex-grow pb-24">{renderPage()}</main>
      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
};

const App: React.FC = () => (
  <UserDataProvider>
    <AppContent />
  </UserDataProvider>
);

interface BottomNavProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const NavItem: React.FC<{
  icon: React.ElementType;
  label: Page;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${
      isActive
        ? "text-brand-accent"
        : "text-gray-500 dark:text-brand-text-secondary hover:text-brand-accent dark:hover:text-white"
    }`}
  >
    <Icon className="h-6 w-6 mb-1" />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage }) => {
  const navItems: { label: Page; icon: React.ElementType }[] = [
    { label: "Dashboard", icon: Home },
    { label: "Tasks", icon: CheckSquare },
    { label: "Social", icon: Users },
    { label: "Profile", icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white dark:bg-brand-secondary border-t border-gray-200 dark:border-gray-700 shadow-lg flex justify-around items-center px-4 z-50">
      {navItems.map((item) => (
        <NavItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          isActive={activePage === item.label}
          onClick={() => setActivePage(item.label)}
        />
      ))}
    </nav>
  );
};

export default App;
