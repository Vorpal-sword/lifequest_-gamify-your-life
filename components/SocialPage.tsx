import React, { useState, useMemo } from "react";
import type { UserData } from "../hooks/useUserData.ts";
import type { LeaderboardEntry, Group, User } from "../types.ts";
import Card from "./ui/Card.tsx";
import {
  Trophy,
  Users,
  UserPlus,
  Search,
  Edit,
  X,
  LogOut,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-react";

type SocialTab = "Leaderboard" | "Groups" | "Friends";

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  group?: Group;
  currentUser: User;
  allUsers: User[];
}

const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  group,
  currentUser,
  allUsers,
}) => {
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [activeQuest, setActiveQuest] = useState(group?.activeQuest || "");
  const [activeQuestTarget, setActiveQuestTarget] = useState(
    group?.activeQuestTarget || 10
  );
  const [activeQuestEstimate, setActiveQuestEstimate] = useState(
    group?.activeQuestEstimate
  );
  const [members, setMembers] = useState<string[]>(
    group?.members || [currentUser.id]
  );

  const friends = useMemo(
    () => allUsers.filter((u) => currentUser.friends.includes(u.id)),
    [allUsers, currentUser.friends]
  );

  if (!isOpen) return null;

  const handleMemberToggle = (friendId: string) => {
    setMembers((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      activeQuest,
      activeQuestTarget,
      activeQuestEstimate,
      members,
    });
    onClose();
  };

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
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold font-display mb-4">
          {group ? "Edit Group" : "Create Group"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Group Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-100 dark:bg-brand-primary p-3 rounded-md"
            required
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-gray-100 dark:bg-brand-primary p-3 rounded-md"
          />

          <div>
            <h3 className="text-lg font-semibold mb-2">Group Quest</h3>
            <div className="bg-gray-100 dark:bg-brand-primary p-3 rounded-lg space-y-3">
              <input
                type="text"
                placeholder="Quest Title"
                value={activeQuest}
                onChange={(e) => setActiveQuest(e.target.value)}
                className="w-full bg-gray-200 dark:bg-brand-secondary p-2 rounded-md"
                required
              />
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">
                    Target (Reps)
                  </label>
                  <input
                    type="number"
                    value={activeQuestTarget}
                    onChange={(e) =>
                      setActiveQuestTarget(Number(e.target.value))
                    }
                    className="w-full bg-gray-200 dark:bg-brand-secondary p-2 rounded-md"
                    min="1"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">
                    Estimate (min/rep, optional)
                  </label>
                  <input
                    type="number"
                    placeholder="-"
                    value={activeQuestEstimate || ""}
                    onChange={(e) =>
                      setActiveQuestEstimate(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="w-full bg-gray-200 dark:bg-brand-secondary p-2 rounded-md"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Members</h3>
            <div className="max-h-32 overflow-y-auto space-y-2 bg-gray-100 dark:bg-brand-primary p-3 rounded-lg">
              <p className="p-2 rounded-md bg-gray-200 dark:bg-brand-secondary font-bold">
                {currentUser.name} (Leader)
              </p>
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => handleMemberToggle(friend.id)}
                  className="flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-gray-200 dark:hover:bg-brand-secondary"
                >
                  <label
                    htmlFor={`member-${friend.id}`}
                    className="cursor-pointer"
                  >
                    {friend.name}
                  </label>
                  {members.includes(friend.id) ? (
                    <CheckSquare className="text-brand-accent" />
                  ) : (
                    <Square className="text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-brand-accent hover:bg-brand-accent-light text-white font-bold py-3 rounded-lg transition-colors"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
};

const SocialPage: React.FC<{ data: UserData }> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<SocialTab>("Leaderboard");

  if (!data.user) return null; // Don't render if user data is not loaded

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold font-display mb-6">Social</h1>
      <div className="flex space-x-2 border-b-2 border-gray-200 dark:border-brand-secondary mb-4">
        <TabButton
          label="Leaderboard"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <TabButton
          label="Groups"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <TabButton
          label="Friends"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>
      {activeTab === "Leaderboard" && (
        <Leaderboard list={data.leaderboard} currentUserId={data.user.id} />
      )}
      {activeTab === "Groups" && <Groups data={data} />}
      {activeTab === "Friends" && (
        <Friends
          currentUser={data.user}
          allUsers={data.allUsers}
          onAddFriend={data.addFriend}
        />
      )}
    </div>
  );
};

const TabButton: React.FC<{
  label: SocialTab;
  activeTab: SocialTab;
  setActiveTab: (tab: SocialTab) => void;
}> = ({ label, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(label)}
    className={`px-4 py-2 text-lg font-semibold transition-colors duration-200 ${
      activeTab === label
        ? "border-b-2 border-brand-accent text-brand-accent"
        : "text-gray-500 dark:text-brand-text-secondary hover:text-gray-800 dark:hover:text-white"
    }`}
  >
    {label}
  </button>
);
const Leaderboard: React.FC<{
  list: LeaderboardEntry[];
  currentUserId: string;
}> = ({ list, currentUserId }) => (
  <div className="space-y-3">
    {list.length > 0 ? (
      list.map((entry) => (
        <Card
          key={entry.id}
          className={`flex items-center space-x-4 ${
            entry.id === currentUserId ? "border-2 border-brand-accent" : ""
          }`}
        >
          <span className="text-2xl font-bold w-8 text-center">
            {entry.rank === 1
              ? "🥇"
              : entry.rank === 2
              ? "🥈"
              : entry.rank === 3
              ? "🥉"
              : entry.rank}
          </span>
          <img
            src={entry.avatarUrl}
            alt={entry.name}
            className="w-12 h-12 rounded-full"
          />
          <div className="flex-1">
            <p className="font-semibold text-lg">{entry.name}</p>
            <p className="text-sm text-gray-500 dark:text-brand-text-secondary">
              Level {entry.level}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-brand-xp">
              {entry.weeklyXp.toLocaleString()} XP
            </p>
          </div>
        </Card>
      ))
    ) : (
      <p className="text-center text-gray-500 dark:text-brand-text-secondary mt-8">
        Add friends to see them on the leaderboard!
      </p>
    )}
  </div>
);

const Groups: React.FC<{ data: UserData }> = ({ data }) => {
  const { user, allUsers, groups, createGroup, updateGroup, leaveGroup } = data;
  const [modalState, setModalState] = useState<{
    mode: "create" | "edit";
    group?: Group;
  } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<Group | null>(null);

  if (!user) return null;

  const handleSave = (groupData: any) => {
    if (modalState?.mode === "edit" && modalState.group) {
      updateGroup(modalState.group.id, groupData);
    } else {
      createGroup(groupData);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setModalState({ mode: "create" })}
        className="w-full bg-brand-accent hover:bg-brand-accent-light text-white font-bold py-3 rounded-lg flex items-center justify-center"
      >
        <UserPlus className="mr-2" size={20} /> Create New Group
      </button>
      {groups
        .filter((g) => g.members.includes(user.id))
        .map((group) => (
          <Card key={group.id}>
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold font-display">{group.name}</h3>
              <div>
                {group.leaderId === user.id && (
                  <button
                    onClick={() => setModalState({ mode: "edit", group })}
                    className="text-gray-500 hover:text-brand-accent p-1"
                  >
                    <Edit size={18} />
                  </button>
                )}
                <button
                  onClick={() => setConfirmLeave(group)}
                  className="text-gray-500 hover:text-red-500 p-1"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-brand-text-secondary mt-1">
              {group.description}
            </p>
            <div className="flex items-center text-sm mt-2">
              <Users size={16} className="mr-2" />
              <span>{group.members.length} members</span>
            </div>
            <div className="mt-3 bg-gray-100 dark:bg-brand-primary p-3 rounded-lg">
              <p className="text-sm font-semibold">Active Quest:</p>
              <p className="text-brand-accent">
                {group.activeQuest} (Target: {group.activeQuestTarget})
              </p>
            </div>
          </Card>
        ))}
      {modalState && (
        <GroupModal
          isOpen={true}
          onClose={() => setModalState(null)}
          onSave={handleSave}
          group={modalState.group}
          currentUser={user}
          allUsers={allUsers}
        />
      )}
      {confirmLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex justify-center items-center p-4">
          <Card className="max-w-sm text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-bold">Leave Group?</h3>
            <p className="text-gray-500 dark:text-brand-text-secondary my-2">
              Are you sure you want to leave "{confirmLeave.name}"?
            </p>
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={() => setConfirmLeave(null)}
                className="py-2 px-6 bg-gray-200 dark:bg-brand-primary rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  leaveGroup(confirmLeave.id);
                  setConfirmLeave(null);
                }}
                className="py-2 px-6 bg-red-600 text-white rounded-lg"
              >
                Leave
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const Friends: React.FC<{
  currentUser: User;
  allUsers: User[];
  onAddFriend: (id: string) => void;
}> = ({ currentUser, allUsers, onAddFriend }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const friends = useMemo(
    () => allUsers.filter((u) => currentUser.friends.includes(u.id)),
    [allUsers, currentUser.friends]
  );
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return allUsers.filter(
      (u) =>
        u.id !== currentUser.id &&
        (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, allUsers, currentUser.id]);

  return (
    <div>
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          placeholder="Find users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-100 dark:bg-brand-primary p-2 pl-10 rounded-md"
        />
      </div>
      <div className="space-y-3">
        {searchTerm ? (
          searchResults.length > 0 ? (
            searchResults.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                isFriend={currentUser.friends.includes(user.id)}
                onAdd={() => onAddFriend(user.id)}
              />
            ))
          ) : (
            <p className="text-center text-gray-500">No users found.</p>
          )
        ) : friends.length > 0 ? (
          friends.map((user) => (
            <UserCard key={user.id} user={user} isFriend={true} />
          ))
        ) : (
          <p className="text-center text-gray-500">
            You haven't added any friends yet.
          </p>
        )}
      </div>
    </div>
  );
};

const UserCard: React.FC<{
  user: User;
  isFriend: boolean;
  onAdd?: () => void;
}> = ({ user, isFriend, onAdd }) => (
  <Card className="flex items-center space-x-4">
    <img
      src={user.avatarUrl}
      alt={user.name}
      className="w-12 h-12 rounded-full"
    />
    <div className="flex-1">
      <p className="font-semibold text-lg">{user.name}</p>
      <p className="text-sm text-gray-500 dark:text-brand-text-secondary">
        Level {user.level}
      </p>
    </div>
    {!isFriend && onAdd && (
      <button
        onClick={onAdd}
        className="bg-brand-accent hover:bg-brand-accent-light text-white font-bold py-2 px-4 rounded-lg text-sm"
      >
        Add
      </button>
    )}
  </Card>
);

export default SocialPage;
