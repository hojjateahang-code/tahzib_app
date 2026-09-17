import React, { useState, useEffect } from 'react';
import { useAuth } from '../store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { BarChart2, UserCheck, User as UserIcon, Users, FileText, Mail } from 'lucide-react';
import { DirectorDashboard } from './director/DirectorDashboard';
import { StudentMonitoringList } from './StudentMonitoringList';
import { MentorMonitoringList } from './vice-principal/MentorMonitoringList';
import { ReportsMonitoringList } from './vice-principal/ReportsMonitoringList';
import { VicePrincipalUsers } from './vice-principal/VicePrincipalUsers';
import { StudentProfile } from './student/StudentProfile';
import { MessagingCenter } from './messaging/MessagingCenter';

export function DirectorPanel() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STUDENTS' | 'USERS' | 'MESSAGES' | 'PROFILE'>('DASHBOARD');
  const [activeSubTab, setActiveSubTab] = useState<'STUDENTS' | 'MENTORS' | 'REPORTS'>('STUDENTS');

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

  const consultStudentsCount = useLiveQuery(
    async () => {
      const students = await db.users.where('role').equals('STUDENT').toArray();
      return students.filter(s => s.counselorTags?.includes('CONSULT_NEEDED')).length;
    },
    []
  );

  const getBadge = (tabId: string) => {
    if (tabId === 'MESSAGES' && unreadMessagesCount && unreadMessagesCount > 0) return unreadMessagesCount;
    if (tabId === 'STUDENTS' && consultStudentsCount && consultStudentsCount > 0) return consultStudentsCount;
    return 0;
  };

  const tabs = [
    { id: 'DASHBOARD', label: 'داشبورد راهبردی', icon: BarChart2 },
    { id: 'STUDENTS', label: 'رصد طلاب', icon: UserCheck },
    { id: 'USERS', label: 'مدیریت کاربران و اکسل', icon: Users },
    { id: 'MESSAGES', label: 'پیام‌ها و مکاتبات', icon: Mail },
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
                  className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:px-5 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-bold transition-all flex-1 justify-center whitespace-nowrap ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 dark:bg-indigo-600' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-5 sm:h-5 shrink-0" />
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
        {activeTab === 'DASHBOARD' && (
          <DirectorDashboard
            onNavigate={(tab, subTab) => {
              setActiveTab(tab as any);
              if (subTab) setActiveSubTab(subTab as any);
            }}
          />
        )}
        {activeTab === 'STUDENTS' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 h-full">
            <div className="flex flex-col sm:flex-row gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveSubTab('STUDENTS')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeSubTab === 'STUDENTS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <UserCheck className="w-4 h-4" />
                رصد طلاب
              </button>
              <button 
                onClick={() => setActiveSubTab('MENTORS')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeSubTab === 'MENTORS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users className="w-4 h-4" />
                اساتید راهنما
              </button>
              <button 
                onClick={() => setActiveSubTab('REPORTS')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeSubTab === 'REPORTS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FileText className="w-4 h-4" />
                گزارشات تجمیعی
              </button>
            </div>
            
            <div className="mt-4">
              {activeSubTab === 'STUDENTS' && <StudentMonitoringList />}
              {activeSubTab === 'MENTORS' && <MentorMonitoringList />}
              {activeSubTab === 'REPORTS' && <ReportsMonitoringList />}
            </div>
          </div>
        )}
        {activeTab === 'USERS' && <VicePrincipalUsers />}
        {activeTab === 'MESSAGES' && <MessagingCenter />}
        {activeTab === 'PROFILE' && <StudentProfile />}
      </div>
    </div>
  );
}
