import React, { useState, useEffect } from 'react';
import { useAuth } from '../store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CheckCircle, Lock, BarChart2, User as UserIcon, Calendar, Mail, Smartphone } from 'lucide-react';
import { StudentSelfAssessment } from './student/StudentSelfAssessment';
import { StudentProgressChart } from './student/StudentProgressChart';
import { StudentScreenTimeChart } from './student/StudentScreenTimeChart';
import { StudentNotes } from './student/StudentNotes';
import { StudentProfile } from './student/StudentProfile';
import { MessagingCenter } from './messaging/MessagingCenter';

export function StudentPanel() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'ASSESSMENT' | 'CHART' | 'NOTES' | 'MESSAGES' | 'PROFILE'>('ASSESSMENT');

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

  const todaySubmitted = useLiveQuery(
    async () => {
      if (!currentUser) return true;
      const today = new Date().toISOString().split('T')[0];
      const count = await db.assessments
        .where('studentId')
        .equals(currentUser.id)
        .filter(a => a.date === today)
        .count();
      return count > 0;
    },
    [currentUser?.id]
  );

  const getBadge = (tabId: string) => {
    if (tabId === 'MESSAGES' && unreadMessagesCount && unreadMessagesCount > 0) {
      return unreadMessagesCount;
    }
    if (tabId === 'ASSESSMENT' && !todaySubmitted) {
      return '!';
    }
    return 0;
  };

  const tabs = [
    { id: 'ASSESSMENT', label: 'ارزیابی', icon: CheckCircle },
    { id: 'CHART', label: 'آمار', icon: BarChart2 },
    { id: 'NOTES', label: 'یادداشت', icon: Lock },
    { id: 'MESSAGES', label: 'پیام', icon: Mail },
    { id: 'PROFILE', label: 'پروفایل', icon: UserIcon }
  ] as const;

  if (!currentUser?.isApproved) {
    return (
      <div className="max-w-[800px] mx-auto w-full h-full pb-10 flex flex-col gap-6">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center flex flex-col items-center">
          <Calendar className="w-16 h-16 text-amber-500 mb-4" />
          <h2 className="text-2xl font-bold text-amber-900 mb-2">در انتظار تایید</h2>
          <p className="text-amber-800/80">پروفایل شما در حال حاضر در انتظار تایید توسط معاون تهذیب مدرسه است. لطفاً تا زمان تایید منتظر بمانید.</p>
          <p className="text-amber-800/80 mt-2 font-medium">برای تسریع روند تایید، لطفاً اطلاعات تکمیلی خود را در بخش زیر وارد کنید.</p>
        </div>
        <StudentProfile />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full pb-6 flex flex-col">
      {/* Navigation Tabs - Fixed/Sticky Top Bar */}
      <div className="sticky -top-2 sm:-top-4 z-20 bg-[#F1F5F9] dark:bg-slate-950 pt-1 pb-3 mb-2">
        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex">
          <div className="flex w-full justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto hide-scrollbar">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const badge = getBadge(tab.id);

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:px-5 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-bold transition-all flex-1 justify-center whitespace-nowrap ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 dark:bg-indigo-600' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-5 sm:h-5 shrink-0" />
                  <span>{tab.label}</span>
                  {badge !== 0 && (
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

      {/* Content Area */}
      <div className="flex-1">
        {activeTab === 'ASSESSMENT' && <StudentSelfAssessment />}
        {activeTab === 'CHART' && <StudentProgressChart />}
        {activeTab === 'NOTES' && <StudentNotes />}
        {activeTab === 'MESSAGES' && <MessagingCenter />}
        {activeTab === 'PROFILE' && <StudentProfile />}
      </div>
    </div>
  );
}
