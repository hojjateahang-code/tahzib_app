import React, { useState } from 'react';
import { 
  ChevronRight, ChevronLeft, Plus, Clock, BookOpen, 
  User, CheckCircle2, Circle, Calendar, Filter, Star 
} from 'lucide-react';
import type { PlannerItem, PlannerCategory, PlannerItemStatus } from '../../types';
import { 
  getPersianWeekDays, 
  PERSIAN_WEEKDAYS, 
  getShamsiInfo, 
  formatShamsiShort,
  getOccasionsForShamsiDate
} from '../../utils/shamsiCalendar';
import { PlanStatusModal } from './PlanStatusModal';
import { ShamsiDatePicker } from './ShamsiDatePicker';

interface WeeklyScheduleViewProps {
  currentDateStr: string;
  onDateChange: (dateStr: string) => void;
  items: PlannerItem[];
  onToggleComplete: (item: PlannerItem) => Promise<void>;
  onEditItem: (item: PlannerItem) => void;
  onAddNewItem: (dateStr: string, hour?: number) => void;
  onUpdateItemStatus?: (item: PlannerItem, status: PlannerItemStatus, reason?: string, targetDateStr?: string) => Promise<void>;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CLASS: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-800 dark:text-blue-200', border: 'border-blue-200 dark:border-blue-800' },
  MABAHESE: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-800 dark:text-indigo-200', border: 'border-indigo-200 dark:border-indigo-800' },
  STUDY: { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-800 dark:text-violet-200', border: 'border-violet-200 dark:border-violet-800' },
  WORSHIP: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-200', border: 'border-emerald-200 dark:border-emerald-800' },
  TABLIGH: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-800 dark:text-rose-200', border: 'border-rose-200 dark:border-rose-800' },
  PERSONAL: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-800 dark:text-amber-200', border: 'border-amber-200 dark:border-amber-800' },
  EXAM: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-800 dark:text-red-200', border: 'border-red-200 dark:border-red-800' },
  FITNESS: { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-800 dark:text-teal-200', border: 'border-teal-200 dark:border-teal-800' },
  CUSTOM: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-800 dark:text-purple-200', border: 'border-purple-200 dark:border-purple-800' },
  OTHER: { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200', border: 'border-slate-200 dark:border-slate-700' }
};

export function WeeklyScheduleView({
  currentDateStr,
  onDateChange,
  items,
  onToggleComplete,
  onEditItem,
  onAddNewItem,
  onUpdateItemStatus
}: WeeklyScheduleViewProps) {
  // Modal state
  const [selectedStatusItem, setSelectedStatusItem] = useState<{ item: PlannerItem; dateStr: string } | null>(null);

  // Get the 7 days of the Persian week
  const weekDays = getPersianWeekDays(currentDateStr);
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];

  // Navigate week
  const handlePrevWeek = () => {
    const d = new Date(currentDateStr);
    d.setDate(d.getDate() - 7);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDateStr);
    d.setDate(d.getDate() + 7);
    onDateChange(d.toISOString().split('T')[0]);
  };

  // Helper to parse time
  const parseHour = (timeStr?: string) => {
    if (!timeStr) return 8;
    return Number(timeStr.split(':')[0]) || 8;
  };

  // Get items for a specific day taking recurrence duration into account
  const getItemsForDay = (dayDateStr: string, dayOfWeekIndex: number) => {
    return items.filter(item => {
      if (item.isDeleted) return false;
      
      if (item.isRecurringWeekly) {
        if (item.recurringStartDate && dayDateStr < item.recurringStartDate) return false;
        if (item.recurringEndDate && dayDateStr > item.recurringEndDate) return false;
        if (item.recurringDays && item.recurringDays.includes(dayOfWeekIndex)) return true;
      }

      if (item.date === dayDateStr) return true;
      return false;
    }).sort((a, b) => {
      const aH = parseHour(a.startTime);
      const bH = parseHour(b.startTime);
      return aH - bH;
    });
  };

  // Resolve status for item on specific date
  const resolveStatus = (item: PlannerItem, dateStr: string): PlannerItemStatus => {
    if (item.dateStatusOverrides && item.dateStatusOverrides[dateStr]) {
      return item.dateStatusOverrides[dateStr].status;
    }
    if (item.status) return item.status;
    if (item.isCompleted) return 'DONE';
    return 'PENDING';
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Week Header Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevWeek}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
              title="هفته قبل"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextWeek}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
              title="هفته بعد"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              هفته: {firstDay.jd} {firstDay.jm !== lastDay.jm ? firstDay.monthName : ''} تا {lastDay.jd} {lastDay.monthName} ماه {lastDay.jy}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              جدول هفتگی کلاس‌ها، مباحثات و برنامه‌های حوزوی · شنبه تا جمعه (تقویم شمسی)
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <div className="w-48 sm:w-52">
            <ShamsiDatePicker
              value={currentDateStr}
              onChange={(newDate) => onDateChange(newDate)}
              label=""
            />
          </div>

          <button
            onClick={() => onAddNewItem(currentDateStr)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت برنامه</span>
          </button>
        </div>
      </div>

      {/* 7 Days Grid Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dayTasks = getItemsForDay(day.gregorianDateStr, day.dayOfWeek);
          const occasions = getOccasionsForShamsiDate(day.jy, day.jm, day.jd);
          const isToday = day.gregorianDateStr === new Date().toISOString().split('T')[0];

          return (
            <div
              key={day.gregorianDateStr}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-3 border flex flex-col justify-between shadow-2xs min-h-[300px] ${
                isToday 
                  ? 'border-indigo-400 ring-2 ring-indigo-400/40 bg-indigo-50/10' 
                  : day.isHoliday 
                  ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/15'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Day Header */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                  <div>
                    <h3 className={`text-xs font-black ${
                      day.isHoliday ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'
                    }`}>
                      {day.dayName}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      {day.jd} {day.monthName}
                    </span>
                  </div>

                  <button
                    onClick={() => onAddNewItem(day.gregorianDateStr)}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="افزودن کار در این روز"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day Occasions */}
                {occasions.length > 0 && (
                  <div className="mb-2 p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-[10px] text-amber-900 dark:text-amber-200 font-bold leading-tight">
                    ⭐ {occasions[0].title}
                  </div>
                )}

                {/* Tasks List */}
                <div className="space-y-1.5">
                  {dayTasks.length === 0 ? (
                    <div className="text-center py-6 text-[11px] text-slate-400">
                      برنامه‌ای نیست
                    </div>
                  ) : (
                    dayTasks.map((task) => {
                      const style = CATEGORY_STYLES[task.category] || CATEGORY_STYLES.OTHER;
                      const taskStatus = resolveStatus(task, day.gregorianDateStr);

                      return (
                        <div
                          key={task.id}
                          className={`p-2 rounded-xl border text-xs transition-all relative ${style.bg} ${style.border} ${
                            taskStatus === 'DONE' ? 'opacity-70 line-through' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 leading-tight block">
                              {task.title}
                            </span>
                            <button
                              onClick={() => onEditItem(task)}
                              className="text-[10px] text-indigo-600 hover:underline shrink-0"
                              title="ویرایش"
                            >
                              ویرایش
                            </button>
                          </div>

                          {task.startTime && (
                            <span className="text-[10px] font-mono text-slate-500 block mt-1">
                              ⏰ {task.startTime} تا {task.endTime || '--'}
                            </span>
                          )}

                          {/* Status button */}
                          <div className="mt-1.5 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setSelectedStatusItem({ item: task, dateStr: day.gregorianDateStr })}
                              className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                                taskStatus === 'DONE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : taskStatus === 'MISSED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : taskStatus === 'HOLIDAY'
                                  ? 'bg-blue-100 text-blue-800'
                                  : taskStatus === 'CANCELLED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-white/80 dark:bg-slate-800 text-slate-600'
                              }`}
                            >
                              {taskStatus === 'DONE' ? '✓ انجام شد' :
                               taskStatus === 'MISSED' ? '✗ نرفتم' :
                               taskStatus === 'HOLIDAY' ? 'تعطیل' :
                               taskStatus === 'CANCELLED' ? 'لغو' : 'تعیین وضعیت'}
                            </button>

                            {task.isRecurringWeekly && (
                              <span className="text-[9px] text-indigo-600 font-bold">
                                ثابت
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Day footer */}
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center">
                {dayTasks.length} برنامه
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Modal */}
      {selectedStatusItem && onUpdateItemStatus && (
        <PlanStatusModal
          isOpen={Boolean(selectedStatusItem)}
          onClose={() => setSelectedStatusItem(null)}
          item={selectedStatusItem.item}
          targetDateStr={selectedStatusItem.dateStr}
          onSaveStatus={async (status, reason) => {
            await onUpdateItemStatus(selectedStatusItem.item, status, reason, selectedStatusItem.dateStr);
          }}
          onEditFullPlan={() => {
            onEditItem(selectedStatusItem.item);
          }}
        />
      )}
    </div>
  );
}
