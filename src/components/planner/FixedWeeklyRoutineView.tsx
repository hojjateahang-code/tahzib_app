import React, { useState } from 'react';
import { 
  Repeat, Plus, BookOpen, Clock, User, 
  MapPin, Trash2, Edit2, Sparkles, CheckCircle2,
  Calendar, Check, X
} from 'lucide-react';
import type { 
  PlannerItem, 
  PlannerCategory, 
  PlannerCustomPreset,
  PlannerItemStatus 
} from '../../types';
import { PERSIAN_WEEKDAYS } from '../../utils/shamsiCalendar';
import { PlanStatusModal } from './PlanStatusModal';
import { ClearPlannerModal, type ClearScope } from './ClearPlannerModal';

interface FixedWeeklyRoutineViewProps {
  items: PlannerItem[];
  onAddNewRecurring: () => void;
  onEditItem: (item: PlannerItem) => void;
  onDeleteItem: (id: string) => Promise<void>;
  onLoadDefaultSeminaryRoutine: () => Promise<void>;
  onClearAllItems?: (scope: ClearScope) => Promise<void>;
  onUpdateItemStatus?: (item: PlannerItem, status: PlannerItemStatus, reason?: string) => Promise<void>;
}

export function FixedWeeklyRoutineView({
  items,
  onAddNewRecurring,
  onEditItem,
  onDeleteItem,
  onLoadDefaultSeminaryRoutine,
  onClearAllItems,
  onUpdateItemStatus
}: FixedWeeklyRoutineViewProps) {
  const recurringItems = items.filter(i => !i.isDeleted && Boolean(i.isRecurringWeekly));
  const [statusItem, setStatusItem] = useState<PlannerItem | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Repeat className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            برنامه ثابت هفتگی (کلاس‌های روزانه حوزه و مباحثات با مدت تکرار)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            اموراتی که در طول هفته تکرار می‌شوند (مانند کلاس‌های روزانه حوزه)؛ می‌توانید مدت تکرار (مثلا تا ۱۰ هفته)، روزهای هفته و وضعیت برگزاری را تعیین و ویرایش کنید.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* قالب پیشنهادی مدرسه */}
          <button
            onClick={onLoadDefaultSeminaryRoutine}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 shadow-2xs"
            title="افزودن جدول برنامه مدرسه (سحرخیزی، کلاس اول تا چهارم، مباحثه و...)"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>بارگذاری قالب پیشنهادی مدرسه</span>
          </button>

          {/* دکمه پاکسازی همه برنامه‌ها کنار قالب پیشنهادی مدرسه */}
          {onClearAllItems && (
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors border border-rose-200 dark:border-rose-800/80 flex items-center gap-1.5 shadow-2xs"
              title="پاکسازی تمام برنامه‌ها یا برنامه‌های هفتگی"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>پاکسازی همه برنامه‌ها</span>
            </button>
          )}

          <button
            onClick={onAddNewRecurring}
            className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت کلاس یا برنامه ثابت جدید</span>
          </button>
        </div>
      </div>

      {/* Routine Cards by Days of Week */}
      {recurringItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <Repeat className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1">
            هنوز برنامه ثابت هفتگی ثبت نکرده‌اید
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4">
            کلاس‌های روزانه حوزه، ساعت‌های مباحثه، پیش‌مطالعه یا برنامه‌های مصوب مدرسه را بارگذاری یا اضافه کنید.
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={onLoadDefaultSeminaryRoutine}
              className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>بارگذاری قالب مصوب مدرسه</span>
            </button>
            {items.some(i => !i.isDeleted) && onClearAllItems && (
              <button
                onClick={() => setIsClearModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>پاکسازی همه برنامه‌ها</span>
              </button>
            )}
            <button
              onClick={onAddNewRecurring}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black"
            >
              تعریف دستی برنامه
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recurringItems.map((item) => {
            const daysNames = item.recurringDays
              ? item.recurringDays.map(dIdx => PERSIAN_WEEKDAYS[dIdx]?.name || '').filter(Boolean).join('، ')
              : 'تمام هفته';

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h4>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      ثابت هفتگی
                    </span>
                  </div>

                  {/* Recurring days badge */}
                  <div className="text-xs text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50/60 dark:bg-indigo-950/30 p-2 rounded-xl mb-2.5 border border-indigo-100 dark:border-indigo-900/30">
                    📅 روزها: {daysNames}
                  </div>

                  {/* Duration in weeks */}
                  {item.recurringWeeksCount && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold mb-2 flex items-center gap-1">
                      <span>⏳ مدت زمان تکرار:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                        {item.recurringWeeksCount} هفته
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {item.startTime && (
                      <p className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>ساعت {item.startTime} تا {item.endTime || '--'}</span>
                      </p>
                    )}

                    {item.subjectName && (
                      <p className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>کتاب: {item.subjectName}</span>
                      </p>
                    )}

                    {item.instructorName && (
                      <p className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>استاد/هم‌بحث: {item.instructorName}</span>
                      </p>
                    )}

                    {item.location && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>مکان: {item.location}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setStatusItem(item)}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    تعیین وضعیت
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditItem(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="ویرایش کامل برنامه"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status Modal */}
      {statusItem && onUpdateItemStatus && (
        <PlanStatusModal
          isOpen={Boolean(statusItem)}
          onClose={() => setStatusItem(null)}
          item={statusItem}
          onSaveStatus={async (status, reason) => {
            await onUpdateItemStatus(statusItem, status, reason);
          }}
          onEditFullPlan={() => {
            onEditItem(statusItem);
          }}
        />
      )}

      {/* Clear Planner Modal */}
      {onClearAllItems && (
        <ClearPlannerModal
          isOpen={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          items={items}
          onConfirmClear={onClearAllItems}
        />
      )}
    </div>
  );
}
