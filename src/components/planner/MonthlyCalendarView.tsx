import React, { useState } from 'react';
import { 
  ChevronRight, ChevronLeft, Calendar as CalendarIcon, 
  Plus, CheckCircle2, Circle, Clock, Star, BookOpen, User 
} from 'lucide-react';
import type { PlannerItem } from '../../types';
import { 
  getShamsiMonthCalendar, 
  JALALI_MONTH_NAMES, 
  PERSIAN_WEEKDAYS, 
  getShamsiInfo,
  CalendarDayCell,
  getOccasionsForShamsiDate
} from '../../utils/shamsiCalendar';

interface MonthlyCalendarViewProps {
  currentDateStr: string;
  onSelectDate: (dateStr: string) => void;
  onNavigateToDay: (dateStr: string) => void;
  items: PlannerItem[];
  onAddNewItem: (dateStr: string) => void;
}

export function MonthlyCalendarView({
  currentDateStr,
  onSelectDate,
  onNavigateToDay,
  items,
  onAddNewItem
}: MonthlyCalendarViewProps) {
  const currentInfo = getShamsiInfo(currentDateStr);
  const [selectedJy, setSelectedJy] = useState<number>(currentInfo.jy);
  const [selectedJm, setSelectedJm] = useState<number>(currentInfo.jm);
  const [activeDayCell, setActiveDayCell] = useState<CalendarDayCell | null>(null);

  // Generate calendar matrix for selected year & month
  const weeks = getShamsiMonthCalendar(selectedJy, selectedJm);

  const handlePrevMonth = () => {
    if (selectedJm === 1) {
      setSelectedJy(selectedJy - 1);
      setSelectedJm(12);
    } else {
      setSelectedJm(selectedJm - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedJm === 12) {
      setSelectedJy(selectedJy + 1);
      setSelectedJm(1);
    } else {
      setSelectedJm(selectedJm + 1);
    }
  };

  const handleGoCurrentMonth = () => {
    const today = getShamsiInfo(new Date());
    setSelectedJy(today.jy);
    setSelectedJm(today.jm);
  };

  // Get items for a given cell (including recurring items matching the weekday)
  const getItemsForCell = (cell: CalendarDayCell) => {
    return items.filter(item => {
      if (item.isDeleted) return false;
      if (item.date === cell.gregorianDateStr) return true;
      if (item.isRecurringWeekly && item.recurringDays && item.recurringDays.includes(cell.dayOfWeek)) {
        return true;
      }
      return false;
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Month Navigator Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
              title="ماه قبل"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
              title="ماه بعد"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100">
              تقویم ماه {JALALI_MONTH_NAMES[selectedJm]} {selectedJy}
            </h2>
          </div>
        </div>

        {/* Month Selector dropdowns & Today button */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedJm}
            onChange={(e) => setSelectedJm(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            {JALALI_MONTH_NAMES.slice(1).map((mName, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {mName}
              </option>
            ))}
          </select>

          <select
            value={selectedJy}
            onChange={(e) => setSelectedJy(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
          >
            {[1403, 1404, 1405, 1406].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <button
            onClick={handleGoCurrentMonth}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors border border-indigo-200 dark:border-indigo-800"
          >
            ماه جاری
          </button>
        </div>
      </div>

      {/* Main Grid + Side Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800">
          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {PERSIAN_WEEKDAYS.map((w) => (
              <div
                key={w.index}
                className={`py-2 text-xs font-black rounded-xl ${
                  w.index === 6 
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20' 
                    : 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850'
                }`}
              >
                {w.name}
              </div>
            ))}
          </div>

          {/* Weeks and Days Grid */}
          <div className="space-y-1 sm:space-y-2">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-7 gap-1 sm:gap-2">
                {week.map((cell) => {
                  const cellTasks = getItemsForCell(cell);
                  const isSelected = activeDayCell?.gregorianDateStr === cell.gregorianDateStr;
                  const hasTasks = cellTasks.length > 0;
                  const hasOccasion = cell.occasions.length > 0;

                  return (
                    <button
                      key={cell.gregorianDateStr}
                      type="button"
                      onClick={() => {
                        setActiveDayCell(cell);
                        onSelectDate(cell.gregorianDateStr);
                      }}
                      className={`relative min-h-[70px] sm:min-h-[85px] p-1.5 sm:p-2 rounded-2xl border text-right flex flex-col justify-between transition-all ${
                        !cell.isCurrentMonth
                          ? 'opacity-30 bg-slate-50/40 dark:bg-slate-950/30 border-dashed border-slate-200 dark:border-slate-800'
                          : isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-400/50 shadow-md'
                          : cell.isToday
                          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 shadow-xs'
                          : cell.isHoliday
                          ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Day number & today marker */}
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs sm:text-sm font-black font-mono ${
                          cell.isToday
                            ? 'w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs'
                            : cell.isHoliday
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {cell.jd}
                        </span>

                        {hasTasks && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                            {cellTasks.length}
                          </span>
                        )}
                      </div>

                      {/* Occasion snippet if any */}
                      {hasOccasion && (
                        <div className="w-full my-1">
                          <p className={`text-[9px] truncate font-bold leading-tight ${
                            cell.isHoliday 
                              ? 'text-rose-600 dark:text-rose-400' 
                              : 'text-amber-700 dark:text-amber-400'
                          }`}>
                            {cell.occasions[0].title}
                          </p>
                        </div>
                      )}

                      {/* Task dots */}
                      {hasTasks && (
                        <div className="flex items-center gap-1 mt-auto">
                          {cellTasks.slice(0, 3).map((_, idx) => (
                            <span key={idx} className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Details Card (Right Sidebar) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            {activeDayCell ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                      {PERSIAN_WEEKDAYS[activeDayCell.dayOfWeek].name} {activeDayCell.jd} {JALALI_MONTH_NAMES[activeDayCell.jm]} {activeDayCell.jy}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeDayCell.isHoliday ? '🔴 روز تعطیل' : '⚪ روز عادی'}
                    </p>
                  </div>
                  <button
                    onClick={() => onAddNewItem(activeDayCell.gregorianDateStr)}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
                    title="افزودن کار در این روز"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Occasions List */}
                {activeDayCell.occasions.length > 0 && (
                  <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      رویدادها و مناسبت‌های این روز:
                    </span>
                    {activeDayCell.occasions.map((occ) => (
                      <p key={occ.id} className="text-xs font-bold text-amber-950 dark:text-amber-300">
                        · {occ.title} {occ.isHoliday && <span className="text-rose-600">(تعطیل رسمی)</span>}
                      </p>
                    ))}
                  </div>
                )}

                {/* Day Tasks */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
                    کارهای برنامه‌ریزی‌شده ({getItemsForCell(activeDayCell).length}):
                  </h4>

                  {getItemsForCell(activeDayCell).length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      هیچ برنامه‌ای برای این روز ثبت نشده است.
                    </p>
                  ) : (
                    getItemsForCell(activeDayCell).map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-start justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {item.title}
                          </p>
                          {item.startTime && (
                            <span className="text-[11px] font-mono text-slate-500">
                              ⏰ {item.startTime} تا {item.endTime || '--'}
                            </span>
                          )}
                        </div>
                        {item.isCompleted && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                            انجام شد
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">یک روز را از تقویم انتخاب کنید تا جزییات رویدادها و برنامه‌های آن نمایش داده شود.</p>
              </div>
            )}
          </div>

          {activeDayCell && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button
                onClick={() => onNavigateToDay(activeDayCell.gregorianDateStr)}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black shadow-xs hover:opacity-90 transition-opacity"
              >
                مشاهده در نوار زمان روزانه (۲۴ ساعته)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
