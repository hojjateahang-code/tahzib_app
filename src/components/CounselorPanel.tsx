import React, { useState, useEffect } from 'react';
import { useAuth } from '../store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ShieldAlert, FileText, Users, User as UserIcon, Mail } from 'lucide-react';
import { CounselorReports } from './counselor/CounselorReports';
import { CounselorStudents } from './counselor/CounselorStudents';
import { UserProfile } from './UserProfile';
import { MessagingCenter } from './messaging/MessagingCenter';

export function CounselorPanel() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'REPORTS' | 'STUDENTS' | 'MESSAGES' | 'PROFILE'>('REPORTS');

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('NAVIGATE_TAB', handleNav);
    return () => window.removeEventListener('NAVIGATE_TAB', handleNav);
  }, []);

  const [viewedReferralIds, setViewedReferralIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`counselor_viewed_referrals_${currentUser?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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
      return students.filter(s => s.counselorTags?.includes('CONSULT_NEEDED') && !viewedReferralIds.includes(s.id)).length;
    },
    [viewedReferralIds]
  );

  useEffect(() => {
    if (activeTab === 'REPORTS' && currentUser?.id) {
      // Automatically mark current CONSULT_NEEDED students as viewed when counselor opens REPORTS tab
      db.users.where('role').equals('STUDENT').toArray().then(students => {
        const consultNeededIds = students.filter(s => s.counselorTags?.includes('CONSULT_NEEDED')).map(s => s.id);
        if (consultNeededIds.length > 0) {
          const updated = Array.from(new Set([...viewedReferralIds, ...consultNeededIds]));
          setViewedReferralIds(updated);
          localStorage.setItem(`counselor_viewed_referrals_${currentUser.id}`, JSON.stringify(updated));
        }
      });
    }
  }, [activeTab, currentUser?.id]);

  const getBadge = (tabId: string) => {
    if (tabId === 'MESSAGES' && unreadMessagesCount && unreadMessagesCount > 0) return unreadMessagesCount;
    if ((tabId === 'REPORTS' || tabId === 'STUDENTS') && consultStudentsCount && consultStudentsCount > 0) return consultStudentsCount;
    return 0;
  };

  const tabs = [
    { id: 'REPORTS', label: 'ارجاعات', icon: FileText },
    { id: 'STUDENTS', label: 'طلاب', icon: Users },
    { id: 'MESSAGES', label: 'پیام‌ها', icon: Mail },
    { id: 'PROFILE', label: 'پروفایل', icon: UserIcon }
  ] as const;

  return (
    <div className="max-w-[1200px] mx-auto w-full pb-6 flex flex-col h-full">
      <div className="md:col-span-12 bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">پنل استاد مشاور (فوق محرمانه)</h2>
          <p className="text-xs text-slate-500 mt-1">مدیریت پرونده‌های ارجاعی و جلسات روان‌شناختی</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full mt-3 sm:mt-0">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Offline-First Mode</span>
        </div>
      </div>

      {/*<div className="md:col-span-12 bg-indigo-950 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden mb-6 shrink-0 border border-indigo-900">
        <div className="relative z-10 flex items-start gap-4">
          <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30 text-amber-300">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-amber-300 mb-1">پروتکل حفظ حریم خصوصی</h3>
            <p className="text-sm text-indigo-100 leading-relaxed">
              اطلاعات ثبت شده در این پنل با بالاترین سطح امنیتی ذخیره شده و هیچ یک از کادر اجرایی مدرسه (حتی مدیر و معاون تهذیب) به متن جزئیات جلسات مشاوره دسترسی ندارند. سیستم تنها بازخوردهای کلی را برای پیشگیری از بحران‌ها به معاونت ارسال می‌کند.
            </p>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>*/}

      {/* Navigation Tabs - Fixed/Sticky Top Bar */}
      <div className="sticky -top-2 sm:-top-4 z-20 bg-[#F1F5F9] dark:bg-slate-950 pt-1 pb-3 mb-2 shrink-0">
        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex">
          <div className="flex w-full justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
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

      {/* Content Area */}
      <div className="flex-1 min-h-[500px]">
        {activeTab === 'REPORTS' && <CounselorReports />}
        {activeTab === 'STUDENTS' && <CounselorStudents />}
        {activeTab === 'MESSAGES' && <MessagingCenter />}
        {activeTab === 'PROFILE' && <UserProfile />}
      </div>
    </div>
  );
}
