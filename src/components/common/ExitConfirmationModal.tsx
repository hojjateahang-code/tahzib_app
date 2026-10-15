import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
}

export function ExitConfirmationModal({ isOpen, onClose, onConfirmExit }: ExitConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 text-right"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/50">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">خروج از برنامه</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">آیا مایل به بستن و خروج از سامانه تهذیب هستید؟</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 leading-relaxed">
          با خروج از برنامه، اطلاعات ثبت‌شده شما در حافظه دستگاه محفوظ می‌ماند.
        </p>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onConfirmExit}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 px-4 rounded-xl text-xs transition-colors shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج از برنامه</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}
