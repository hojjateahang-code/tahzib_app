import React from 'react';
import { X, UserCheck } from 'lucide-react';
import { useAuth } from '../../store';
import { UserProfile } from '../UserProfile';
import { StudentProfile } from '../student/StudentProfile';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: Props) {
  const { currentUser } = useAuth();

  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 px-6 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-sm">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span>پروفایل و اطلاعات کاربری ({currentUser.name})</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {currentUser.role === 'STUDENT' ? <StudentProfile /> : <UserProfile />}
        </div>
      </div>
    </div>
  );
}
