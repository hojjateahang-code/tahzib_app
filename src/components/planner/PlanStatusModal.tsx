import React, { useState } from 'react';
import { 
  X, Check, AlertCircle, Calendar, Clock, BookOpen, 
  User, CheckCircle2, XCircle, HelpCircle, ArrowRight 
} from 'lucide-react';
import type { PlannerItem, PlannerItemStatus } from '../../types';
import { formatShamsiFull } from '../../utils/shamsiCalendar';

interface PlanStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PlannerItem;
  targetDateStr?: string; // YYYY-MM-DD (useful for recurring weekly items where status is set for a specific day)
  onSaveStatus: (status: PlannerItemStatus, reason?: string) => Promise<void>;
  onEditFullPlan?: () => void;
}

const STATUS_OPTIONS: { 
  id: PlannerItemStatus; 
  title: string; 
  subtitle: string; 
  icon: typeof CheckCircle2; 
  color: string; 
  bg: string; 
  borderColor: string;
}[] = [
  {
    id: 'DONE',
    title: 'انجام شد (حاضر بودم)',
    subtitle: 'کلاس، مباحثه یا فعالیت با موفقیت انجام گرفت',
    icon: CheckCircle2,
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-300 dark:border-emerald-700'
  },
  {
    id: 'MISSED',
    title: 'انجام نشد (من نرفتم / غیبت)',
    subtitle: 'کلاس یا برنامه برقرار بود ولی طلبه حضور نداشت',
    icon: XCircle,
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-300 dark:border-amber-700'
  },
  {
    id: 'HOLIDAY',
    title: 'تعطیل بود (تعطیلی حوزه / مناسبت)',
    subtitle: 'حوزه تعطیل رسمی، بین‌التعطیلین یا برنامه لغو حوزوی بود',
    icon: AlertCircle,
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-300 dark:border-blue-700'
  },
  {
    id: 'CANCELLED',
    title: 'لغو شد (عدم حضور استاد / کنسلی)',
    subtitle: 'استاد نیامد، کلاس تشکیل نشد یا برنامه کنسل شد',
    icon: XCircle,
    color: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    borderColor: 'border-rose-300 dark:border-rose-700'
  },
  {
    id: 'POSTPONED',
    title: 'موکول به بعد (جبرانی)',
    subtitle: 'به زمان یا روز دیگری موکول شده است',
    icon: ArrowRight,
    color: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    borderColor: 'border-violet-300 dark:border-violet-700'
  },
  {
    id: 'PENDING',
    title: 'در انتظار انجام (وضعیت اولیه)',
    subtitle: 'هنوز موعد آن نرسیده یا تصمیم‌گیری نشده',
    icon: HelpCircle,
    color: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-50 dark:bg-slate-800',
    borderColor: 'border-slate-300 dark:border-slate-700'
  }
];

export function PlanStatusModal({
  isOpen,
  onClose,
  item,
  targetDateStr,
  onSaveStatus,
  onEditFullPlan
}: PlanStatusModalProps) {
  const effectiveDate = targetDateStr || item.date;
  
  // Resolve current status for target date if it's recurring
  const currentStatus: PlannerItemStatus = (() => {
    if (item.dateStatusOverrides && item.dateStatusOverrides[effectiveDate]) {
      return item.dateStatusOverrides[effectiveDate].status;
    }
    if (item.status) return item.status;
    if (item.isCompleted) return 'DONE';
    return 'PENDING';
  })();

  const currentReason: string = (() => {
    if (item.dateStatusOverrides && item.dateStatusOverrides[effectiveDate]?.statusReason) {
      return item.dateStatusOverrides[effectiveDate].statusReason || '';
    }
    return item.statusReason || '';
  })();

  const [selectedStatus, setSelectedStatus] = useState<PlannerItemStatus>(currentStatus);
  const [reason, setReason] = useState<string>(currentReason);
  const [isSaving, setIsSaving] = useState(false);

  // Sync if item changes
  React.useEffect(() => {
    setSelectedStatus(currentStatus);
    setReason(currentReason);
  }, [item, effectiveDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveStatus(selectedStatus, reason.trim());
      onClose();
    } catch (err) {
      console.error('Error saving plan status:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
          <div>
            <h2 className="text-base font-black text-slate-800 dark:text-slate-100">
              ثبت وضعیت انجام برنامه
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تاریخ: {formatShamsiFull(effectiveDate)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Plan Info Card */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <h3 className="font-black text-indigo-950 dark:text-indigo-200 text-sm">
              {item.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-1.5 flex-wrap">
              {item.startTime && (
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {item.startTime} تا {item.endTime || '--'}
                </span>
              )}
              {item.subjectName && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {item.subjectName}
                </span>
              )}
              {item.instructorName && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {item.instructorName}
                </span>
              )}
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-2">
              وضعیت برگزاری و انجام:
            </label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.id;
                const Icon = opt.icon;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedStatus(opt.id)}
                    className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? `${opt.bg} ${opt.borderColor} ring-2 ring-indigo-500/20 shadow-xs`
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? opt.color : 'text-slate-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`font-black text-xs sm:text-sm ${
                          isSelected ? opt.color : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {opt.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {opt.subtitle}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              توضیحات و علت (اختیاری):
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثلا: کسالت داشتم / استاد مسافرت بودند / تعطیلی بین‌التعطیلین مدرسه / مباحثه در حجره انجام شد..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            {onEditFullPlan ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditFullPlan();
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
              >
                ویرایش کامل مشخصات برنامه
              </button>
            ) : <span />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md shadow-indigo-600/20"
              >
                {isSaving ? 'در حال ثبت...' : 'ثبت وضعیت'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
