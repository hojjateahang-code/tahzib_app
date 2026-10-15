import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Calendar, ChevronRight, ChevronLeft, Plus, 
  CheckCircle2, Circle, BookOpen, User, MapPin, 
  Sparkles, AlertCircle, Trash2, Edit2, Check, Star, Filter,
  XCircle, ArrowRight, HelpCircle, Navigation, LayoutGrid,
  Eye, RefreshCw, Sun, Moon, Sunrise, Sunset
} from 'lucide-react';
import type { 
  PlannerItem, 
  PlannerCategory, 
  PlannerItemStatus, 
  PlannerCustomCategory 
} from '../../types';
import { 
  formatShamsiFull, 
  getShamsiInfo, 
  getOccasionsForShamsiDate 
} from '../../utils/shamsiCalendar';
import { PlanStatusModal } from './PlanStatusModal';
import { ShamsiDatePicker } from './ShamsiDatePicker';

interface DailyTimelineViewProps {
  currentDateStr: string; // YYYY-MM-DD
  onDateChange: (dateStr: string) => void;
  items: PlannerItem[];
  onToggleComplete: (item: PlannerItem) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onEditItem: (item: PlannerItem) => void;
  onAddNewItem: (dateStr: string, hour?: number) => void;
  onUpdateItemStatus?: (item: PlannerItem, status: PlannerItemStatus, reason?: string, targetDateStr?: string) => Promise<void>;
  customCategories?: PlannerCustomCategory[];
}

const CATEGORY_COLORS: Record<string, { badge: string; border: string; bg: string; dot: string; text: string; lightBg: string }> = {
  CLASS: { 
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300', 
    border: 'border-blue-400 dark:border-blue-600', 
    bg: 'bg-blue-50/90 dark:bg-blue-950/40',
    lightBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    dot: 'bg-blue-600',
    text: 'text-blue-700 dark:text-blue-300'
  },
  MABAHESE: { 
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300', 
    border: 'border-indigo-400 dark:border-indigo-600', 
    bg: 'bg-indigo-50/90 dark:bg-indigo-950/40',
    lightBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    dot: 'bg-indigo-600',
    text: 'text-indigo-700 dark:text-indigo-300'
  },
  STUDY: { 
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300', 
    border: 'border-violet-400 dark:border-violet-600', 
    bg: 'bg-violet-50/90 dark:bg-violet-950/40',
    lightBg: 'bg-violet-500/10 dark:bg-violet-500/20',
    dot: 'bg-violet-600',
    text: 'text-violet-700 dark:text-violet-300'
  },
  WORSHIP: { 
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300', 
    border: 'border-emerald-400 dark:border-emerald-600', 
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    lightBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    dot: 'bg-emerald-600',
    text: 'text-emerald-700 dark:text-emerald-300'
  },
  TABLIGH: { 
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300', 
    border: 'border-rose-400 dark:border-rose-600', 
    bg: 'bg-rose-50/90 dark:bg-rose-950/40',
    lightBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    dot: 'bg-rose-600',
    text: 'text-rose-700 dark:text-rose-300'
  },
  PERSONAL: { 
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300', 
    border: 'border-amber-400 dark:border-amber-600', 
    bg: 'bg-amber-50/90 dark:bg-amber-950/40',
    lightBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    dot: 'bg-amber-600',
    text: 'text-amber-700 dark:text-amber-300'
  },
  EXAM: { 
    badge: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300', 
    border: 'border-red-400 dark:border-red-600', 
    bg: 'bg-red-50/90 dark:bg-red-950/40',
    lightBg: 'bg-red-500/10 dark:bg-red-500/20',
    dot: 'bg-red-600',
    text: 'text-red-700 dark:text-red-300'
  },
  FITNESS: { 
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300', 
    border: 'border-teal-400 dark:border-teal-600', 
    bg: 'bg-teal-50/90 dark:bg-teal-950/40',
    lightBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    dot: 'bg-teal-600',
    text: 'text-teal-700 dark:text-teal-300'
  },
  CUSTOM: { 
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300', 
    border: 'border-purple-400 dark:border-purple-600', 
    bg: 'bg-purple-50/90 dark:bg-purple-950/40',
    lightBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    dot: 'bg-purple-600',
    text: 'text-purple-700 dark:text-purple-300'
  },
  OTHER: { 
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300', 
    border: 'border-slate-300 dark:border-slate-700', 
    bg: 'bg-slate-50 dark:bg-slate-900',
    lightBg: 'bg-slate-500/10',
    dot: 'bg-slate-500',
    text: 'text-slate-700 dark:text-slate-300'
  }
};

const CATEGORY_NAMES: Record<string, string> = {
  CLASS: 'کلاس درس حوزه',
  MABAHESE: 'مباحثه علمی',
  STUDY: 'مطالعه و پژوهش',
  WORSHIP: 'عبادی و معنوی',
  TABLIGH: 'تبلیغ و هیئت',
  PERSONAL: 'شخصی و خانواده',
  EXAM: 'امتحان حوزه',
  FITNESS: 'ورزش و سلامتی',
  CUSTOM: 'دسته‌بندی اختصاصی',
  OTHER: 'سایر'
};

const STATUS_BADGES: Record<PlannerItemStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  DONE: { label: 'انجام شد', icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200' },
  MISSED: { label: 'غیبت/نشد', icon: XCircle, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200' },
  HOLIDAY: { label: 'تعطیل بود', icon: AlertCircle, color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200' },
  CANCELLED: { label: 'لغو شد', icon: XCircle, color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200' },
  POSTPONED: { label: 'موکول شد', icon: ArrowRight, color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-950/50 border-violet-200' },
  PENDING: { label: 'در انتظار', icon: HelpCircle, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200' }
};

// Period descriptions for seminary schedule
const HOUR_PERIODS: Record<number, { label: string; icon: typeof Sunrise }> = {
  4: { label: 'سحر', icon: Sunrise },
  5: { label: 'بین‌الطلوعین', icon: Sunrise },
  6: { label: 'صبحگاه', icon: Sun },
  7: { label: 'کلاس صبح', icon: Sun },
  8: { label: 'کلاس صبح', icon: Sun },
  9: { label: 'کلاس صبح', icon: Sun },
  10: { label: 'کلاس صبح', icon: Sun },
  11: { label: 'پیش‌ازظهر', icon: Sun },
  12: { label: 'اذان ظهر', icon: Sun },
  13: { label: 'ناهار و استراحت', icon: Sun },
  14: { label: 'کلاس عصر', icon: Sun },
  15: { label: 'کلاس عصر', icon: Sun },
  16: { label: 'مباحثه و مطالعه', icon: Sun },
  17: { label: 'مطالعه حوزه', icon: Sun },
  18: { label: 'اذان مغرب', icon: Sunset },
  19: { label: 'شام و محفل', icon: Moon },
  20: { label: 'تجمعات و فوق‌برنامه', icon: Moon },
  21: { label: 'مطالعه شبانه', icon: Moon },
  22: { label: 'تحویل گوشی/استراحت', icon: Moon },
  23: { label: 'خواب و استراحت', icon: Moon },
};

export function DailyTimelineView({
  currentDateStr,
  onDateChange,
  items,
  onToggleComplete,
  onDeleteItem,
  onEditItem,
  onAddNewItem,
  onUpdateItemStatus,
  customCategories = []
}: DailyTimelineViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTimelineHour, setSelectedTimelineHour] = useState<number | null>(null);
  const [isCompactTimeline, setIsCompactTimeline] = useState<boolean>(false);
  const [timelineDirection, setTimelineDirection] = useState<'rtl' | 'ltr'>('rtl'); // Default RTL (Persian)
  const [showAgendaList, setShowAgendaList] = useState<boolean>(true);

  // Status modal state
  const [statusModalItem, setStatusModalItem] = useState<PlannerItem | null>(null);

  // Timeline scroll container ref
  const timelineScrollContainerRef = useRef<HTMLDivElement>(null);
  const verticalIndicatorRef = useRef<HTMLDivElement>(null);

  // Live timer tick every 15 seconds to animate the indicator line smoothly
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const todayIso = new Date().toISOString().split('T')[0];
  const isViewingToday = currentDateStr === todayIso;

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  // Day Shamsi metadata & occasions
  const shamsiInfo = getShamsiInfo(currentDateStr);
  const occasions = getOccasionsForShamsiDate(shamsiInfo.jy, shamsiInfo.jm, shamsiInfo.jd);

  // Navigate days
  const handlePrevDay = () => {
    const d = new Date(currentDateStr);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDateStr);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleGoToday = () => {
    onDateChange(todayIso);
  };

  // Helper to parse "HH:mm" to minutes from 00:00
  const timeToMinutes = (t?: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Filter items for current date (or recurring weekly items matching this day of week)
  const currentDayOfWeek = shamsiInfo.dayOfWeek; // 0 (Sat) to 6 (Fri)

  const dayItems = items.filter(item => {
    if (item.isDeleted) return false;
    
    // Check recurrence date bound
    if (item.isRecurringWeekly) {
      if (item.recurringStartDate && currentDateStr < item.recurringStartDate) {
        return false;
      }
      if (item.recurringEndDate && currentDateStr > item.recurringEndDate) {
        return false;
      }
      if (item.recurringDays && item.recurringDays.includes(currentDayOfWeek)) {
        return true;
      }
    }

    // Exact date match
    if (item.date === currentDateStr) return true;

    return false;
  }).sort((a, b) => {
    if (a.isAllDay && !b.isAllDay) return -1;
    if (!a.isAllDay && b.isAllDay) return 1;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  // Filtered by category
  const filteredItems = selectedCategory === 'ALL' 
    ? dayItems 
    : dayItems.filter(i => {
        if (selectedCategory === 'CUSTOM') return i.category === 'CUSTOM';
        return i.category === selectedCategory || (i.customCategoryName && i.customCategoryName === selectedCategory);
      });

  // Separate all-day and timed items
  const allDayItems = filteredItems.filter(i => i.isAllDay);
  const timedItems = filteredItems.filter(i => !i.isAllDay);

  // Resolve status for item on current date
  const getItemStatusOnDate = (item: PlannerItem): { status: PlannerItemStatus; reason?: string } => {
    if (item.dateStatusOverrides && item.dateStatusOverrides[currentDateStr]) {
      return {
        status: item.dateStatusOverrides[currentDateStr].status,
        reason: item.dateStatusOverrides[currentDateStr].statusReason
      };
    }
    if (item.status) {
      return { status: item.status, reason: item.statusReason };
    }
    if (item.isCompleted) {
      return { status: 'DONE' };
    }
    return { status: 'PENDING' };
  };

  // Find currently active task (happening RIGHT NOW) if viewing today
  const activeNowTask = isViewingToday 
    ? dayItems.find(item => {
        if (item.isAllDay) return false;
        if (!item.startTime) return false;
        const startMin = timeToMinutes(item.startTime);
        const endMin = item.endTime ? timeToMinutes(item.endTime) : startMin + 60;
        return currentTotalMinutes >= startMin && currentTotalMinutes < endMin;
      })
    : null;

  // Stats
  const completedCount = dayItems.filter(i => getItemStatusOnDate(i).status === 'DONE').length;
  const totalCount = dayItems.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 24 Hour slot matrix for the timeline
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  // Group items by hour: items that start in this hour or are active in this hour
  const getItemsForHour = (hour: number) => {
    return timedItems.filter(item => {
      if (!item.startTime) return false;
      const startH = Number(item.startTime.split(':')[0]);
      const endH = item.endTime ? Number(item.endTime.split(':')[0]) : startH;
      // Primary match: starts in this hour, OR active during this hour
      return startH === hour || (hour >= startH && hour <= endH);
    });
  };

  // Items specifically starting in this hour
  const getItemsStartingInHour = (hour: number) => {
    return timedItems.filter(item => {
      if (!item.startTime) return false;
      const startH = Number(item.startTime.split(':')[0]);
      return startH === hour;
    });
  };

  // Calculate percentage of current time across the 24 hours (1440 minutes)
  const currentProgressPercent = Math.min(100, Math.max(0, (currentTotalMinutes / 1440) * 100));

  // Auto-scroll timeline to current time - brings vertical time line directly into frame
  const handleScrollToNow = () => {
    if (!timelineScrollContainerRef.current) return;
    const hourSlot = document.getElementById(`timeline-hour-${currentHour}`);
    if (hourSlot) {
      hourSlot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      return;
    }
    if (verticalIndicatorRef.current) {
      verticalIndicatorRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  // Auto-scroll to center current time line on mount and date changes
  useEffect(() => {
    if (isViewingToday) {
      const timer1 = setTimeout(() => handleScrollToNow(), 150);
      const timer2 = setTimeout(() => handleScrollToNow(), 600);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [currentDateStr, isViewingToday, isCompactTimeline, timelineDirection]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Date Header & Day Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevDay}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
              title="روز قبل"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextDay}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
              title="روز بعد"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                {shamsiInfo.dayName} {shamsiInfo.jd} {shamsiInfo.monthName} {shamsiInfo.jy}
              </h2>
              {isViewingToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  امروز
                </span>
              )}
              {shamsiInfo.isHoliday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  تعطیل رسمی
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {occasions.length > 0 
                ? occasions.map(o => o.title).join(' · ')
                : 'برنامه روزانه، کلاس‌های درسی، مباحثات و تکالیف طلبه'}
            </p>
          </div>
        </div>

        {/* Quick actions: Go to today / Shamsi Date Picker / Add new plan */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {!isViewingToday && (
            <button
              onClick={handleGoToday}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              بازگشت به امروز
            </button>
          )}

          {/* Shamsi date picker popup */}
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
            <span>ثبت برنامه جدید</span>
          </button>
        </div>
      </div>

      {/* Occasions Banner if holiday or important seminary event */}
      {occasions.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-3 sm:p-4 border border-amber-200 dark:border-amber-900/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
              مناسبت‌ها و رویدادهای این روز:
            </span>
            <div className="flex flex-wrap gap-2 mt-0.5">
              {occasions.map(occ => (
                <span key={occ.id} className="text-xs font-black text-amber-950 dark:text-amber-100">
                  · {occ.title} {occ.isHoliday && <span className="text-rose-600 font-bold">(تعطیل رسمی)</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Indicator Banner: What is scheduled right now */}
      {isViewingToday && (
        <div className="bg-gradient-to-l from-indigo-900 via-indigo-850 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-indigo-700/40 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-amber-300 border border-white/20">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-indigo-200 tracking-wider">
                    هم‌اکنون در ساعت: {String(currentHour).padStart(2, '0')}:{String(currentMinute).padStart(2, '0')}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                </div>
                <h3 className="text-base sm:text-lg font-black mt-0.5">
                  {activeNowTask ? (
                    <span>وقت برنامه: <span className="text-amber-300">«{activeNowTask.title}»</span> است</span>
                  ) : (
                    <span>در این ساعت برنامه مشخصی ثبت نشده است</span>
                  )}
                </h3>
              </div>
            </div>

            {/* Quick action for current task */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleScrollToNow}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition-colors border border-white/20 flex items-center gap-1.5"
                title="حرکت سریع به خط زمان در تایم‌لاین"
              >
                <Navigation className="w-3.5 h-3.5 text-rose-400" />
                <span>پرش به خط عمودی اکنون</span>
              </button>

              {activeNowTask ? (
                <button
                  onClick={() => setStatusModalItem(activeNowTask)}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-white text-indigo-900 hover:bg-indigo-50 transition-colors shadow-xs"
                >
                  تعیین وضعیت این برنامه
                </button>
              ) : (
                <button
                  onClick={() => onAddNewItem(currentDateStr, currentHour)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 text-slate-900 hover:bg-amber-300 transition-colors font-black"
                >
                  + ثبت برنامه برای ساعت فعلی
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 24-HOUR VISUAL TIMELINE WITH DYNAMIC MOVING VERTICAL LINE & VISIBLE TASKS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800">
        {/* Timeline Header & View Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  تایم‌لاین ۲۴ ساعته روز (نمایش مستقیم همه برنامه‌ها در یک نگاه)
                </h3>
                {isViewingToday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    خط عمودی متحرک فعال است
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                برنامه‌های هر ساعت مستقیماً در نوار زمان مشخص است و خط قرمز متحرک نشان‌دهنده لحظه جاری روز است.
              </p>
            </div>
          </div>

          {/* Quick controls: Scroll to Now / Compact density / Direction */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {isViewingToday && (
              <button
                type="button"
                onClick={handleScrollToNow}
                className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors flex items-center gap-1 shadow-xs"
                title="اسکرول مستقیم به موقعیت خط زمان جاری"
              >
                <Navigation className="w-3.5 h-3.5 text-rose-500" />
                <span>برو به زمان اکنون</span>
              </button>
            )}

            {/* Density toggle */}
            <button
              type="button"
              onClick={() => setIsCompactTimeline(!isCompactTimeline)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 ${
                isCompactTimeline
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="تغییر تراکم و اندازه فونت کارت‌های تایم‌لاین"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{isCompactTimeline ? 'نمای خیلی فشرده' : 'نمای استاندارد'}</span>
            </button>

            {/* Direction toggle */}
            <button
              type="button"
              onClick={() => setTimelineDirection(prev => prev === 'rtl' ? 'ltr' : 'rtl')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
              title="تغییر جهت محور ساعت‌ها (راست به چپ / چپ به راست)"
            >
              <span>جهت: {timelineDirection === 'rtl' ? 'راست‌به‌چپ (فارسی)' : 'چپ‌به‌راست'}</span>
            </button>

            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              {completedCount} از {totalCount} انجام شده ({completionPercent}٪)
            </span>
          </div>
        </div>

        {/* All-Day Items Row (if any) */}
        {allDayItems.length > 0 && (
          <div className="mt-3 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
            <span className="text-[11px] font-black text-indigo-900 dark:text-indigo-300 block mb-1.5">
              برنامه‌های تمام‌روز ({allDayItems.length} مورد):
            </span>
            <div className="flex flex-wrap gap-2">
              {allDayItems.map(item => {
                const colorInfo = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.OTHER;
                const itemStatusInfo = getItemStatusOnDate(item);
                const statusConfig = STATUS_BADGES[itemStatusInfo.status] || STATUS_BADGES.PENDING;
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={item.id}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold bg-white dark:bg-slate-900 shadow-xs ${colorInfo.border}`}
                  >
                    <button
                      type="button"
                      onClick={() => setStatusModalItem(item)}
                      title="تغییر وضعیت"
                    >
                      <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                    </button>
                    <span className="text-slate-900 dark:text-slate-100 font-black">{item.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${colorInfo.badge}`}>
                      {item.category === 'CUSTOM' && item.customCategoryName ? item.customCategoryName : CATEGORY_NAMES[item.category]}
                    </span>
                    <button
                      onClick={() => onEditItem(item)}
                      className="text-slate-400 hover:text-indigo-600 p-0.5"
                      title="ویرایش"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* THE HORIZONTAL SCROLLABLE 24-HOUR TRACK */}
        <div 
          ref={timelineScrollContainerRef}
          className="mt-4 overflow-x-auto pb-4 pt-2 relative select-none scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
          style={{ direction: timelineDirection }}
        >
          {/* Minimum width adapts: compact mode fits much more in view (1500px), standard gives full roomy cards (2880px) */}
          <div className={`relative transition-all duration-300 ${isCompactTimeline ? 'min-w-[1500px]' : 'min-w-[2880px]'}`}>
            {/* DYNAMIC MOVING VERTICAL INDICATOR LINE (LINE CUTTING ACROSS HOURS & TASKS) */}
            {isViewingToday && (
              <div 
                ref={verticalIndicatorRef}
                className="absolute top-0 bottom-0 z-30 pointer-events-none transition-all duration-700 ease-linear flex flex-col items-center"
                style={{
                  ...(timelineDirection === 'rtl' 
                    ? { right: `${currentProgressPercent}%`, transform: 'translateX(50%)' } 
                    : { left: `${currentProgressPercent}%`, transform: 'translateX(-50%)' })
                }}
              >
                {/* Floating Top Badge with Current Exact Time */}
                <div className="sticky top-0 z-40 -mt-2.5 px-2.5 py-1 rounded-full bg-rose-600 text-white font-mono font-black text-[11px] shadow-lg shadow-rose-600/40 flex items-center gap-1.5 border border-white/40 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>اکنون {String(currentHour).padStart(2, '0')}:{String(currentMinute).padStart(2, '0')}</span>
                </div>

                {/* Vertical Continuous Line */}
                <div className="w-[3px] grow bg-gradient-to-b from-rose-500 via-rose-600 to-amber-500 shadow-[0_0_12px_rgba(244,63,94,0.85)] relative">
                  {/* Subtle pulsing indicator glowing dot */}
                  <div className="absolute top-1/4 -left-1 w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping opacity-75" />
                  <div className="absolute top-2/4 -left-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping opacity-75" />
                  <div className="absolute top-3/4 -left-1 w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping opacity-75" />
                </div>

                {/* Bottom Pointer */}
                <div className="w-3 h-3 rotate-45 bg-rose-600 -mb-1 shadow-md shadow-rose-600/40" />
              </div>
            )}

            {/* 24-Hour Grid Columns Header */}
            <div className={`grid grid-cols-24 transition-all duration-300 ${isCompactTimeline ? 'gap-1 mb-1' : 'gap-2 mb-2'}`}>
              {HOURS.map((hour) => {
                const isCurrent = isViewingToday && hour === currentHour;
                const isPast = isViewingToday && hour < currentHour;
                const period = HOUR_PERIODS[hour];
                const PeriodIcon = period ? period.icon : Clock;
                const itemsCount = getItemsStartingInHour(hour).length;

                return (
                  <div
                    key={`header-${hour}`}
                    id={`timeline-hour-${hour}`}
                    className={`rounded-2xl border text-center transition-all ${isCompactTimeline ? 'p-1.5' : 'p-2.5'} ${
                      isCurrent
                        ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/50 shadow-sm'
                        : isPast
                        ? 'bg-slate-100/70 dark:bg-slate-850/40 border-slate-200 dark:border-slate-800 text-slate-500'
                        : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`font-mono font-black ${isCompactTimeline ? 'text-[10px]' : 'text-xs'}`}>
                        {String(hour).padStart(2, '0')}:00
                      </span>
                      {period && (
                        <PeriodIcon className={`${isCompactTimeline ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} ${isCurrent ? 'text-amber-600' : 'text-slate-400'}`} />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400">
                      <span className="truncate">{period ? period.label : 'ساعت'}</span>
                      {itemsCount > 0 ? (
                        <span className="px-1 py-0.1 rounded-full font-black text-[8px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                          {itemsCount}
                        </span>
                      ) : (
                        <span className="opacity-40">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 24-Hour Slots Content Matrix: Direct Display of Registered Tasks */}
            <div className={`grid grid-cols-24 transition-all duration-300 ${isCompactTimeline ? 'gap-1' : 'gap-2'}`}>
              {HOURS.map((hour) => {
                const hourItems = getItemsStartingInHour(hour);
                const isCurrent = isViewingToday && hour === currentHour;
                const isPast = isViewingToday && hour < currentHour;

                return (
                  <div
                    key={`slot-${hour}`}
                    id={`timeline-slot-${hour}`}
                    className={`rounded-2xl border transition-all ${isCompactTimeline ? 'p-1.5 min-h-[110px]' : 'p-2 min-h-[170px]'} flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 ring-1 ring-amber-300/40'
                        : isPast
                        ? 'bg-slate-50/40 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80'
                        : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Items List in this hour: Fully visible cards */}
                    <div className="space-y-1.5">
                      {hourItems.length === 0 ? (
                        <div className="h-20 flex flex-col items-center justify-center text-center p-1 text-slate-400 dark:text-slate-600">
                          <span className="text-[10px] opacity-70">وقت آزاد</span>
                        </div>
                      ) : (
                        hourItems.map((item) => {
                          const colorInfo = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.OTHER;
                          const itemStatusInfo = getItemStatusOnDate(item);
                          const statusConfig = STATUS_BADGES[itemStatusInfo.status] || STATUS_BADGES.PENDING;
                          const StatusIcon = statusConfig.icon;

                          return (
                            <div
                              key={item.id}
                              className={`p-2 rounded-xl border text-right transition-all shadow-xs hover:shadow-md ${colorInfo.bg} ${colorInfo.border} ${
                                itemStatusInfo.status === 'DONE' ? 'opacity-75' : ''
                              }`}
                            >
                              {/* Top Bar: Time Span & Status Icon */}
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 px-1.5 py-0.5 rounded">
                                  {item.startTime} {item.endTime ? `تا ${item.endTime}` : ''}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusModalItem(item);
                                  }}
                                  className="transition-transform hover:scale-125"
                                  title={`وضعیت: ${statusConfig.label} (برای تغییر کلیک کنید)`}
                                >
                                  <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.color}`} />
                                </button>
                              </div>

                              {/* Task Title: Visible at a glance */}
                              <h4 
                                className={`${isCompactTimeline ? 'text-[11px]' : 'text-xs'} font-black text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 ${
                                  itemStatusInfo.status === 'DONE' ? 'line-through text-slate-500' : ''
                                }`}
                                title={item.title}
                              >
                                {item.title}
                              </h4>

                              {/* Category Badge & Subject Name */}
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${colorInfo.badge}`}>
                                  {item.category === 'CUSTOM' && item.customCategoryName ? item.customCategoryName : CATEGORY_NAMES[item.category]}
                                </span>

                                {item.subjectName && (
                                  <span className="text-[9px] text-slate-600 dark:text-slate-400 truncate max-w-[80px]" title={item.subjectName}>
                                    کتاب: {item.subjectName}
                                  </span>
                                )}
                              </div>

                              {/* Quick Action Buttons on hover/tap */}
                              <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusModalItem(item);
                                  }}
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color}`}
                                >
                                  {statusConfig.label}
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditItem(item);
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                    title="ویرایش"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteItem(item.id);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Bottom Quick-Add in this exact hour */}
                    <button
                      type="button"
                      onClick={() => onAddNewItem(currentDateStr, hour)}
                      className="mt-2 w-full py-1 rounded-xl text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-dashed border-slate-200 dark:border-slate-800 transition-colors flex items-center justify-center gap-1"
                      title={`ثبت برنامه جدید در ساعت ${hour}:00`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>افزودن</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            همه فعالیت‌ها ({dayItems.length})
          </button>

          {Object.keys(CATEGORY_NAMES).map((cat) => {
            const count = dayItems.filter(i => i.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            const isSelected = selectedCategory === cat;
            const colorInfo = CATEGORY_COLORS[cat] || CATEGORY_COLORS.OTHER;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                  isSelected
                    ? `${colorInfo.badge} border-current shadow-xs`
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${colorInfo.dot}`} />
                <span>{CATEGORY_NAMES[cat]}</span>
                <span className="opacity-75 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Toggle Agenda Cards */}
        <button
          onClick={() => setShowAgendaList(!showAgendaList)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 flex items-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5 text-indigo-500" />
          <span>{showAgendaList ? 'بستن لیست مشروح برنامه‌ها' : 'نمایش لیست مشروح برنامه‌ها'}</span>
        </button>
      </div>

      {/* Task Cards Detailed List with Full Notes, Lecturers & Locations */}
      {showAgendaList && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
              لیست تفصیلی و مشروح برنامه‌های امروز ({filteredItems.length} برنامه)
            </h4>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-800 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1">
                هیچ برنامه‌ای برای این روز ثبت نشده است
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                می‌توانید کلاس‌های روزانه، ساعات مباحثه، پیش‌مطالعه یا برنامه‌های عبادی خود را برنامه‌ریزی کنید.
              </p>
              <button
                onClick={() => onAddNewItem(currentDateStr)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن برنامه جدید برای این روز</span>
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const colorInfo = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.OTHER;
              const itemStatusInfo = getItemStatusOnDate(item);
              const statusConfig = STATUS_BADGES[itemStatusInfo.status] || STATUS_BADGES.PENDING;
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-4.5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-md ${
                    itemStatusInfo.status === 'DONE'
                      ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : itemStatusInfo.status === 'MISSED'
                      ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10'
                      : itemStatusInfo.status === 'HOLIDAY'
                      ? 'border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10'
                      : itemStatusInfo.status === 'CANCELLED'
                      ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10'
                      : `${colorInfo.border} hover:border-indigo-400`
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status trigger icon */}
                    <button
                      type="button"
                      onClick={() => setStatusModalItem(item)}
                      className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                      title="تغییر وضعیت انجام (انجام شد، نشد، تعطیل بود، لغو شد)"
                    >
                      <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm sm:text-base font-bold ${
                          itemStatusInfo.status === 'DONE' 
                            ? 'line-through text-slate-500 dark:text-slate-400' 
                            : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {item.title}
                        </h4>

                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${colorInfo.badge}`}>
                          {item.category === 'CUSTOM' && item.customCategoryName ? item.customCategoryName : CATEGORY_NAMES[item.category] || 'فعالیت'}
                        </span>

                        {/* Status badge with click-to-change */}
                        <button
                          type="button"
                          onClick={() => setStatusModalItem(item)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 ${statusConfig.bg} ${statusConfig.color} hover:opacity-80`}
                          title="برای تغییر وضعیت کلیک کنید"
                        >
                          <span>{statusConfig.label}</span>
                        </button>

                        {item.isRecurringWeekly && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            ثابت هفتگی {item.recurringWeeksCount ? `(تا ${item.recurringWeeksCount} هفته)` : ''}
                          </span>
                        )}

                        {item.priority === 'URGENT' && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            فوری
                          </span>
                        )}
                      </div>

                      {/* Metadata line */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
                        {item.isAllDay ? (
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            تمام روز
                          </span>
                        ) : item.startTime && (
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {item.startTime} تا {item.endTime || '--:--'}
                          </span>
                        )}

                        {item.subjectName && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                            کتاب: {item.subjectName}
                          </span>
                        )}

                        {item.instructorName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            استاد/هم‌بحث: {item.instructorName}
                          </span>
                        )}

                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            مکان: {item.location}
                          </span>
                        )}
                      </div>

                      {/* Status reason if provided */}
                      {itemStatusInfo.reason && (
                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-1.5 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-900/40">
                          علت/توضیحات: {itemStatusInfo.reason}
                        </p>
                      )}

                      {item.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit, Status, Delete */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => setStatusModalItem(item)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors border border-indigo-200 dark:border-indigo-800"
                      title="ثبت وضعیت (انجام شد/نشد/تعطیل)"
                    >
                      وضعیت
                    </button>
                    <button
                      onClick={() => onEditItem(item)}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="ویرایش کامل برنامه"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Plan Status Modal */}
      {statusModalItem && onUpdateItemStatus && (
        <PlanStatusModal
          isOpen={Boolean(statusModalItem)}
          onClose={() => setStatusModalItem(null)}
          item={statusModalItem}
          targetDateStr={currentDateStr}
          onSaveStatus={async (status, reason) => {
            await onUpdateItemStatus(statusModalItem, status, reason, currentDateStr);
          }}
          onEditFullPlan={() => {
            onEditItem(statusModalItem);
          }}
        />
      )}
    </div>
  );
}
