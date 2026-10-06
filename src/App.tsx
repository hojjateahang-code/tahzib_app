import React, { useEffect, useState } from 'react';
import { useAuth } from './store';
import { Login } from './components/Login';
import { StudentPanel } from './components/StudentPanel';
import { VicePrincipalPanel } from './components/VicePrincipalPanel';
import { DirectorPanel } from './components/DirectorPanel';
import { MentorPanel } from './components/MentorPanel';
import { CounselorPanel } from './components/CounselorPanel';
import { TechAdminPanel } from './components/TechAdminPanel';
import { Loader2, LogOut, User as UserIcon, Moon, Sun, Palette } from 'lucide-react';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { MinioSyncModal } from './components/sync/MinioSyncModal';
import { LiveUpdateChecker } from './components/common/LiveUpdateChecker';
import { syncMinIOData } from './sync';

const COLORS = [
  { id: 'indigo', label: 'نیلی (اصلی)', hex: '#4f46e5' },
  { id: 'emerald', label: 'زمردی', hex: '#10B981' },
  { id: 'blue', label: 'آبی', hex: '#3b82f6' },
  { id: 'violet', label: 'بنفش', hex: '#8b5cf6' },
  { id: 'rose', label: 'قرمز', hex: '#f43f5e' },
  { id: 'amber', label: 'کهربایی', hex: '#f59e0b' }
];

export default function App() {
  const { currentUser, setCurrentUser, isLoading } = useAuth();
  
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme-dark') === 'true');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('theme-color') || 'indigo');
  const [showThemePicker, setShowThemePicker] = useState(false);

  useEffect(() => {
    localStorage.setItem('theme-dark', isDark.toString());
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('theme-color', themeColor);
    document.documentElement.setAttribute('data-color', themeColor);
  }, [themeColor]);

  // Automatic Background Cloud Sync across all devices
  useEffect(() => {
    syncMinIOData().catch(() => null);

    const interval = setInterval(() => {
      syncMinIOData().catch(() => null);
    }, 15000);

    const handleReactivate = () => {
      syncMinIOData().catch(() => null);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleReactivate();
      }
    };

    window.addEventListener('focus', handleReactivate);
    window.addEventListener('online', handleReactivate);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleReactivate);
      window.removeEventListener('online', handleReactivate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  const renderPanel = () => {
    switch (currentUser.role) {
      case 'STUDENT':
        return <StudentPanel />;
      case 'VICE_PRINCIPAL':
        return <VicePrincipalPanel />;
      case 'DIRECTOR':
        return <DirectorPanel />;
      case 'MENTOR':
        return <MentorPanel />;
      case 'COUNSELOR':
        return <CounselorPanel />;
      case 'TECH_ADMIN':
        return <TechAdminPanel />;
      default:
        return <div className="p-8 text-center text-slate-500">نقش کاربر نامعتبر است.</div>;
    }
  };

  const roleNameMap: Record<string, string> = {
    STUDENT: 'طلبه',
    VICE_PRINCIPAL: 'معاون تهذیب',
    DIRECTOR: 'مدیر',
    MENTOR: 'استاد راهنما',
    COUNSELOR: 'مشاور',
    TECH_ADMIN: 'مسئول فنی',
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#F1F5F9] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100" dir="rtl">
      <LiveUpdateChecker />
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center relative z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
            {currentUser.profileImage ? (
              <img src={currentUser.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">{currentUser.name}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{roleNameMap[currentUser.role]}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <MinioSyncModal />
          
          <NotificationCenter currentUser={currentUser} />

          <div className="relative">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
              title="رنگ‌بندی"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showThemePicker && (
              <div className="absolute top-11 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-2 flex gap-2 z-50">
                {COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setThemeColor(c.id); setShowThemePicker(false); }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${themeColor === c.id ? 'border-slate-800 dark:border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c.hex }} 
                    title={c.label}
                  ></button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsDark(!isDark)}
            className={`px-3 py-1.5 flex items-center gap-1.5 rounded-xl text-xs font-bold transition-all border shadow-xs ${
              isDark 
                ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-750' 
                : 'bg-white text-indigo-700 border-slate-200 hover:bg-slate-50'
            }`}
            title={isDark ? 'تغییر به تم روز (روشن)' : 'تغییر به تم شب (تاریک)'}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">روز</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">شب</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => setCurrentUser(null)}
            className="w-9 h-9 flex items-center justify-center text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors border border-rose-100 dark:border-rose-900/30"
            title="خروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        {renderPanel()}
      </main>
    </div>
  );
}
