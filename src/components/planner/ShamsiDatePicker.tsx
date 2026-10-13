import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronRight, ChevronLeft, ChevronDown, Check } from 'lucide-react';
import { 
  getShamsiInfo, 
  getShamsiMonthCalendar, 
  JALALI_MONTH_NAMES, 
  PERSIAN_WEEKDAYS, 
  shamsiToGregorianStr 
} from '../../utils/shamsiCalendar';

interface ShamsiDatePickerProps {
  value: string; // Gregorian ISO string YYYY-MM-DD
  onChange: (newGregorianDateStr: string) => void;
  label?: string;
  className?: string;
}

export function ShamsiDatePicker({
  value,
  onChange,
  label = 'تاریخ (تقویم شمسی):',
  className = ''
}: ShamsiDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current selected date
  const currentInfo = getShamsiInfo(value || new Date().toISOString().split('T')[0]);

  // View state inside picker
  const [viewJy, setViewJy] = useState<number>(currentInfo.jy);
  const [viewJm, setViewJm] = useState<number>(currentInfo.jm);

  useEffect(() => {
    if (value) {
      const info = getShamsiInfo(value);
      setViewJy(info.jy);
      setViewJm(info.jm);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const weeks = getShamsiMonthCalendar(viewJy, viewJm);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewJm === 1) {
      setViewJy(viewJy - 1);
      setViewJm(12);
    } else {
      setViewJm(viewJm - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewJm === 12) {
      setViewJy(viewJy + 1);
      setViewJm(1);
    } else {
      setViewJm(viewJm + 1);
    }
  };

  const handleSelectDay = (cellJy: number, cellJm: number, cellJd: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const gStr = shamsiToGregorianStr(cellJy, cellJm, cellJd);
    onChange(gStr);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date().toISOString().split('T')[0];
    onChange(today);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} dir="rtl">
      {label && (
        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1 text-xs sm:text-sm">
          {label}
        </label>
      )}

      {/* Button trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex items-center justify-between shadow-2xs hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-bold">
            {currentInfo.dayName}، {currentInfo.jd} {currentInfo.monthName} {currentInfo.jy}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 z-50 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3.5 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="ماه قبل"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="ماه بعد"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={viewJm}
                onChange={(e) => setViewJm(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {JALALI_MONTH_NAMES.slice(1).map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={viewJy}
                onChange={(e) => setViewJy(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-mono font-bold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {[1402, 1403, 1404, 1405, 1406, 1407].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-black text-slate-500 dark:text-slate-400">
            {PERSIAN_WEEKDAYS.map((w) => (
              <div key={w.index} className={`py-1 ${w.index === 6 ? 'text-rose-500' : ''}`}>
                {w.short}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="space-y-1">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-7 gap-1">
                {week.map((cell) => {
                  const isSelected = 
                    cell.jy === currentInfo.jy && 
                    cell.jm === currentInfo.jm && 
                    cell.jd === currentInfo.jd;

                  return (
                    <button
                      key={cell.gregorianDateStr}
                      type="button"
                      onClick={(e) => handleSelectDay(cell.jy, cell.jm, cell.jd, e)}
                      className={`h-8 rounded-xl text-xs font-mono font-bold flex items-center justify-center transition-all ${
                        !cell.isCurrentMonth
                          ? 'opacity-25 text-slate-400'
                          : isSelected
                          ? 'bg-indigo-600 text-white shadow-xs font-black'
                          : cell.isToday
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300'
                          : cell.isHoliday
                          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {cell.jd}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer quick action */}
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">
              امروز: {getShamsiInfo().jd} {getShamsiInfo().monthName} {getShamsiInfo().jy}
            </span>
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-2.5 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-bold transition-colors"
            >
              برو به امروز
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
