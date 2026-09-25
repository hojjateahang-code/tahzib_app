import React, { useState, useEffect } from 'react';
import { useAuth } from '../store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ClipboardList, Users, CheckSquare, User as UserIcon, Mail, Sparkles } from 'lucide-react';
import { VicePrincipalDashboard } from './vice-principal/VicePrincipalDashboard';
import { VicePrincipalTasks } from './vice-principal/VicePrincipalTasks';
import { VicePrincipalUsers } from './vice-principal/VicePrincipalUsers';
import { TahzibProgramsManagement } from './vice-principal/TahzibProgramsManagement';
import { StudentProfile } from './student/StudentProfile';
import { MessagingCenter } from './messaging/MessagingCenter';

import { getTaskPeriodKey } from '../utils/taskUtils';

export function VicePrincipalPanel() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TASKS' | 'USERS' | 'TAHZIB_PROGRAMS' | 'MESSAGES' | 'PROFILE'>('DASHBOARD');

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('NAVIGATE_TAB', handleNav);
    return () => window.removeEventListener('NAVIGATE_TAB', handleNav);
  }, []);

  // Live queries for badges
  const unreadMessagesCount = useLiveQuery(
    async () => {
      if (!currentUser) return 0;
      const msgs = await db.messages.toArray();
      return msgs.filter(m => 
        (m.recipientId === currentUser.id || (m.ccUserIds && m.ccUserIds.includes(currentUser.id))) && 
        !m.isRead
      ).length;
    },
    [currentUser?.id]
  );

  const pendingUsersCount = useLiveQuery(
    async () => {
      const users = await db.users.toArray();
      return users.filter(u => !u.isApproved && !u.isDeleted).length;
    },
    []
  );

  const pendingTasksCount = useLiveQuery(
    async () => {
      if (!currentUser) return 0;
      const tasks = await db.tasks.toArray();
      return tasks.filter(t => {
        const isTarget = t.roleTarget === 'VICE_PRINCIPAL' || t.roleTarget === 'ALL' || t.assignedTo === currentUser.id;
        if (!isTarget) return false;
        const periodKey = getTaskPeriodKey(t.type);
        const myCompletion = t.userCompletions?.[currentUser.id]?.[periodKey];
        const isDone = myCompletion?.isCompleted || t.isCompleted;
        return !isDone;
      }).length;
    },
    [currentUser?.id]
  );

  const getBadge = (tabId: string) => {
    if (tabId === 'MESSAGES' && unreadMessagesCount && unreadMessagesCount > 0) return unreadMessagesCount;
    if (tabId === 'USERS' && pendingUsersCount && pendingUsersCount > 0) return pendingUsersCount;
    if (tabId === 'TASKS' && pendingTasksCount && pendingTasksCount > 0) return pendingTasksCount;
    return 0;
  };

  const tabs = [
    { id: 'DASHBOARD', label: 'رصد', icon: ClipboardList },
    { id: 'TASKS', label: 'تقویم', icon: CheckSquare },
    { id: 'USERS', label: 'کاربران', icon: Users },
    { id: 'TAHZIB_PROGRAMS', label: 'امورات تهذیبی', icon: Sparkles },
    { id: 'MESSAGES', label: 'پیام‌ها', icon: Mail },
    { id: 'PROFILE', label: 'پروفایل', icon: UserIcon }
  ] as const;

  return (
    <div className="max-w-[1200px] mx-auto w-full pb-6 flex flex-col">
      {/* Navigation Tabs - Fixed/Sticky Top Bar */}
      <div className="sticky -top-2 sm:-top-4 z-20 bg-[#F1F5F9] dark:bg-slate-950 pt-1 pb-3 mb-2">
        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex">
          <div className="flex w-full justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const badge = getBadge(tab.id);

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:px-4 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex-1 justify-center whitespace-nowrap ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 dark:bg-indigo-600' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1">
        {activeTab === 'DASHBOARD' && <VicePrincipalDashboard />}
        {activeTab === 'TASKS' && <VicePrincipalTasks />}
        {activeTab === 'USERS' && <VicePrincipalUsers />}
        {activeTab === 'TAHZIB_PROGRAMS' && <TahzibProgramsManagement />}
        {activeTab === 'MESSAGES' && <MessagingCenter />}
        {activeTab === 'PROFILE' && <StudentProfile />}
      </div>
    </div>
  );
}
