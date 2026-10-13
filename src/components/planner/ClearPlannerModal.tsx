import React, { useState } from 'react';
import { 
  AlertTriangle, Trash2, X, Check, 
  Repeat, Calendar, Layers 
} from 'lucide-react';
import type { PlannerItem } from '../../types';

export type ClearScope = 'ALL' | 'RECURRING_ONLY' | 'NON_RECURRING';

interface ClearPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PlannerItem[];
  onConfirmClear: (scope: ClearScope) => Promise<void>;
}

export function ClearPlannerModal({
  isOpen,
  onClose,
  items,
  onConfirmClear
}: ClearPlannerModalProps) {
  const [scope, setScope] = useState<ClearScope>('ALL');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const activeItems = items.filter(i => !i.isDeleted);
  const recurringCount = activeItems.filter(i => Boolean(i.isRecurringWeekly)).length;
  const nonRecurringCount = activeItems.filter(i => !i.isRecurringWeekly).length;
  const totalCount = activeItems.length;

  const getTargetCount = () => {
    if (scope === 'ALL') return totalCount;
    if (scope === 'RECURRING_ONLY') return recurringCount;
    return nonRecurringCount;
  };

  const handleExecuteClear = async () => {
    setIsDeleting(true);
    try {
      await onConfirmClear(scope);
      onClose();
    } catch (err) {
      console.error('Error clearing planner items:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                پاکسازی برنامه‌های ثبت‌شده
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                عملیات حذف و آزادسازی جدول برنامه‌ها
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              توجه: برنامه‌های انتخاب‌شده حذف خواهند شد. لطفاً مشخص کنید کدام دسته از برنامه‌ها پاکسازی شوند:
            </p>
          </div>

          {/* Scope Options */}
          <div className="space-y-2">
            {/* Option 1: ALL */}
            <div
              onClick={() => setScope('ALL')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                scope === 'ALL'
                  ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/30 ring-1 ring-rose-500'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  scope === 'ALL'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                    پاکسازی تمام برنامه‌ها
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    حذف همه برنامه‌ها (ثابت هفتگی + روزانه و موردی)
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-mono">
                {totalCount} مورد
              </span>
            </div>

            {/* Option 2: RECURRING ONLY */}
            <div
              onClick={() => setScope('RECURRING_ONLY')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                scope === 'RECURRING_ONLY'
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  scope === 'RECURRING_ONLY'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                    فقط برنامه‌های ثابت هفتگی (کلاس‌های حوزه)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    مناسب برای بارگذاری مجدد یا اصلاح قالب پیشنهادی مدرسه
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                {recurringCount} مورد
              </span>
            </div>

            {/* Option 3: NON RECURRING */}
            <div
              onClick={() => setScope('NON_RECURRING')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                scope === 'NON_RECURRING'
                  ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-1 ring-amber-500'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  scope === 'NON_RECURRING'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                    فقط برنامه‌های موردی و روزانه
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    حفظ جدول ثابت مدرسه و حذف کارهای روزانه تقویم
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono">
                {nonRecurringCount} مورد
              </span>
            </div>
          </div>

          {getTargetCount() === 0 && (
            <p className="text-xs text-slate-400 text-center py-1">
              در دسته انتخاب شده، برنامه‌ای برای پاکسازی وجود ندارد.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleExecuteClear}
            disabled={isDeleting || getTargetCount() === 0}
            className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {isDeleting ? 'در حال پاکسازی...' : `تایید و پاکسازی (${getTargetCount()} مورد)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
