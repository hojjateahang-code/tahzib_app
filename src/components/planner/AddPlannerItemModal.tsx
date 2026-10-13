import React, { useState, useEffect } from 'react';
import { 
  X, Clock, Calendar, BookOpen, User, MapPin, 
  Bell, Tag, AlertCircle, Check, Sparkles, Plus, Trash2, Repeat 
} from 'lucide-react';
import type { 
  PlannerItem, 
  PlannerCategory, 
  PlannerPriority,
  PlannerCustomCategory,
  PlannerCustomPreset,
  PlannerItemStatus
} from '../../types';
import { 
  PERSIAN_WEEKDAYS, 
  getShamsiInfo, 
  formatShamsiFull 
} from '../../utils/shamsiCalendar';
import { ShamsiDatePicker } from './ShamsiDatePicker';

interface AddPlannerItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<PlannerItem>) => Promise<void>;
  initialDate?: string; // YYYY-MM-DD
  initialHour?: number; // 0-23
  editItem?: PlannerItem | null;
  customCategories?: PlannerCustomCategory[];
  onAddCustomCategory?: (name: string) => Promise<void>;
  customPresets?: PlannerCustomPreset[];
  onAddCustomPreset?: (preset: Omit<PlannerCustomPreset, 'id' | 'studentId'>) => Promise<void>;
  onDeleteCustomPreset?: (id: string) => Promise<void>;
}

const DEFAULT_CATEGORY_OPTIONS: { id: PlannerCategory; label: string; color: string; bg: string }[] = [
  { id: 'CLASS', label: 'کلاس درس حوزه', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-950/60 border-blue-300' },
  { id: 'MABAHESE', label: 'مباحثه علمی', color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300' },
  { id: 'STUDY', label: 'مطالعه و پژوهش', color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-100 dark:bg-violet-950/60 border-violet-300' },
  { id: 'WORSHIP', label: 'عبادی و معنوی', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300' },
  { id: 'TABLIGH', label: 'تبلیغ و هیئت', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-100 dark:bg-rose-950/60 border-rose-300' },
  { id: 'PERSONAL', label: 'شخصی و خانواده', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300' },
  { id: 'EXAM', label: 'امتحان و آزمون', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-950/60 border-red-300' },
  { id: 'FITNESS', label: 'ورزش و سلامتی', color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-100 dark:bg-teal-950/60 border-teal-300' },
  { id: 'OTHER', label: 'سایر موارد', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300' }
];

// Official seminary routine presets requested by the school
export const SCHOOL_RECOMMENDED_PRESETS = [
  { title: 'سحرخیزی و تهجد (۱۵ دقیقه قبل اذان)', category: 'WORSHIP' as PlannerCategory, startTime: '04:45', endTime: '05:30', subject: 'مناجات و تهجد' },
  { title: 'نماز صبح و تعقیبات', category: 'WORSHIP' as PlannerCategory, startTime: '05:30', endTime: '06:15', subject: 'نماز صبح' },
  { title: 'بیداری بین‌الطلوعین (قرآن و ادعیه)', category: 'WORSHIP' as PlannerCategory, startTime: '06:15', endTime: '06:45', subject: 'بین‌الطلوعین' },
  { title: 'کلاس اول', category: 'CLASS' as PlannerCategory, startTime: '06:45', endTime: '07:30', subject: 'کلاس اول حوزه' },
  { title: 'صبحگاه مدرسه', category: 'OTHER' as PlannerCategory, startTime: '07:30', endTime: '08:15', subject: 'مراسم صبحگاه' },
  { title: 'صبحانه حوزه', category: 'PERSONAL' as PlannerCategory, startTime: '08:15', endTime: '08:45', subject: 'صبحانه' },
  { title: 'کلاس دوم', category: 'CLASS' as PlannerCategory, startTime: '08:45', endTime: '09:15', subject: 'کلاس دوم حوزه' },
  { title: 'کلاس سوم', category: 'CLASS' as PlannerCategory, startTime: '09:15', endTime: '10:00', subject: 'کلاس سوم حوزه' },
  { title: 'کلاس چهارم (جلسه بعد استراحت)', category: 'CLASS' as PlannerCategory, startTime: '10:15', endTime: '11:00', subject: 'کلاس چهارم حوزه' },
  { title: 'نماز ظهر و عصر جماعت', category: 'WORSHIP' as PlannerCategory, startTime: '11:50', endTime: '12:30', subject: 'نماز ظهر' },
  { title: 'ناهار و استراحت', category: 'PERSONAL' as PlannerCategory, startTime: '12:30', endTime: '14:00', subject: 'ناهار' },
  { title: 'مطالعه و مباحثه علمی', category: 'MABAHESE' as PlannerCategory, startTime: '16:00', endTime: '18:00', subject: 'مباحثه و مطالعه' },
  { title: 'نماز مغرب و عشا', category: 'WORSHIP' as PlannerCategory, startTime: '18:00', endTime: '19:00', subject: 'نماز مغرب' },
  { title: 'شام', category: 'PERSONAL' as PlannerCategory, startTime: '19:00', endTime: '19:45', subject: 'شام' },
  { title: 'محفل قرآنی', category: 'WORSHIP' as PlannerCategory, startTime: '19:45', endTime: '20:15', subject: 'تلاوت قرآن' },
  { title: 'تجمعات و پرچم‌گردانی / هیئت', category: 'TABLIGH' as PlannerCategory, startTime: '20:15', endTime: '21:00', subject: 'مراسم و تجمعات' },
  { title: 'تحویل گوشی به مسئول مدرسه', category: 'OTHER' as PlannerCategory, startTime: '22:00', endTime: '22:15', subject: 'انضباطی' },
  { title: 'خواب و استراحت شبانه', category: 'PERSONAL' as PlannerCategory, startTime: '22:30', endTime: '04:45', subject: 'خواب' },
];

export function AddPlannerItemModal({
  isOpen,
  onClose,
  onSave,
  initialDate,
  initialHour,
  editItem,
  customCategories = [],
  onAddCustomCategory,
  customPresets = [],
  onAddCustomPreset,
  onDeleteCustomPreset
}: AddPlannerItemModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PlannerCategory>('CLASS');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [priority, setPriority] = useState<PlannerPriority>('NORMAL');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [isAllDay, setIsAllDay] = useState(false);
  
  // Recurring Weekly state
  const [isRecurringWeekly, setIsRecurringWeekly] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([0, 1, 2, 3, 4]); // شنبه تا چهارشنبه
  const [recurringWeeksCount, setRecurringWeeksCount] = useState<number>(10); // پیش‌فرض ۱۰ هفته
  
  // Seminary details
  const [subjectName, setSubjectName] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [location, setLocation] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [notes, setNotes] = useState('');
  
  // Status tracking
  const [status, setStatus] = useState<PlannerItemStatus>('PENDING');
  const [statusReason, setStatusReason] = useState('');

  // UI state for adding new preset or custom category
  const [showAddPresetForm, setShowAddPresetForm] = useState(false);
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [showAddCatForm, setShowAddCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title || '');
      setCategory(editItem.category || 'CLASS');
      setCustomCategoryName(editItem.customCategoryName || '');
      setPriority(editItem.priority || 'NORMAL');
      setDate(editItem.date || new Date().toISOString().split('T')[0]);
      setStartTime(editItem.startTime || '08:00');
      setEndTime(editItem.endTime || '09:00');
      setIsAllDay(Boolean(editItem.isAllDay));
      setIsRecurringWeekly(Boolean(editItem.isRecurringWeekly));
      setRecurringDays(editItem.recurringDays || [0, 1, 2, 3, 4]);
      setRecurringWeeksCount(editItem.recurringWeeksCount || 10);
      setSubjectName(editItem.subjectName || '');
      setInstructorName(editItem.instructorName || '');
      setLocation(editItem.location || '');
      setPartnerName(editItem.partnerName || '');
      setReminderMinutes(editItem.reminderMinutes !== undefined ? editItem.reminderMinutes : 15);
      setNotes(editItem.notes || '');
      setStatus(editItem.status || (editItem.isCompleted ? 'DONE' : 'PENDING'));
      setStatusReason(editItem.statusReason || '');
    } else {
      const todayStr = initialDate || new Date().toISOString().split('T')[0];
      setDate(todayStr);
      if (initialHour !== undefined) {
        const startH = String(initialHour).padStart(2, '0');
        const endH = String((initialHour + 1) % 24).padStart(2, '0');
        setStartTime(`${startH}:00`);
        setEndTime(`${endH}:00`);
      } else {
        setStartTime('08:00');
        setEndTime('09:00');
      }
      setTitle('');
      setCategory('CLASS');
      setCustomCategoryName('');
      setPriority('NORMAL');
      setIsAllDay(false);
      setIsRecurringWeekly(false);
      setRecurringDays([0, 1, 2, 3, 4]);
      setRecurringWeeksCount(10);
      setSubjectName('');
      setInstructorName('');
      setLocation('');
      setPartnerName('');
      setReminderMinutes(15);
      setNotes('');
      setStatus('PENDING');
      setStatusReason('');
    }
  }, [editItem, initialDate, initialHour, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (p: { 
    title: string; 
    category: PlannerCategory; 
    startTime?: string; 
    endTime?: string; 
    subject?: string; 
    customCategoryName?: string 
  }) => {
    setTitle(p.title);
    setCategory(p.category);
    if (p.customCategoryName) setCustomCategoryName(p.customCategoryName);
    if (p.subject) setSubjectName(p.subject);
    if (p.startTime) setStartTime(p.startTime);
    if (p.endTime) setEndTime(p.endTime);
  };

  const handleSaveAsCustomPreset = async () => {
    if (!title.trim() || !onAddCustomPreset) return;
    try {
      await onAddCustomPreset({
        title: title.trim(),
        category,
        customCategoryName: category === 'CUSTOM' ? customCategoryName : undefined,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        subject: subjectName.trim() || undefined,
        location: location.trim() || undefined,
        instructor: instructorName.trim() || undefined,
        notes: notes.trim() || undefined
      });
      setShowAddPresetForm(false);
      setNewPresetTitle('');
    } catch (err) {
      console.error('Error adding custom preset:', err);
    }
  };

  const handleSaveCustomCategory = async () => {
    if (!newCatName.trim() || !onAddCustomCategory) return;
    try {
      await onAddCustomCategory(newCatName.trim());
      setCategory('CUSTOM');
      setCustomCategoryName(newCatName.trim());
      setNewCatName('');
      setShowAddCatForm(false);
    } catch (err) {
      console.error('Error adding custom category:', err);
    }
  };

  const toggleRecurringDay = (dayIdx: number) => {
    if (recurringDays.includes(dayIdx)) {
      setRecurringDays(recurringDays.filter(d => d !== dayIdx));
    } else {
      setRecurringDays([...recurringDays, dayIdx].sort((a, b) => a - b));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Calculate recurring start and end date
    let recurringStartDate: string | undefined = undefined;
    let recurringEndDate: string | undefined = undefined;
    if (isRecurringWeekly) {
      recurringStartDate = date;
      const d = new Date(date);
      d.setDate(d.getDate() + (recurringWeeksCount * 7));
      recurringEndDate = d.toISOString().split('T')[0];
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        category,
        customCategoryName: category === 'CUSTOM' ? customCategoryName.trim() : undefined,
        priority,
        date,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        isAllDay,
        isRecurringWeekly,
        recurringDays: isRecurringWeekly ? recurringDays : undefined,
        recurringWeeksCount: isRecurringWeekly ? recurringWeeksCount : undefined,
        recurringStartDate,
        recurringEndDate,
        subjectName: subjectName.trim() || undefined,
        instructorName: instructorName.trim() || undefined,
        location: location.trim() || undefined,
        partnerName: partnerName.trim() || undefined,
        reminderMinutes,
        notes: notes.trim() || undefined,
        status,
        statusReason: statusReason.trim() || undefined,
        isCompleted: status === 'DONE'
      });
      onClose();
    } catch (err) {
      console.error('Error saving planner item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">
                {editItem ? 'ویرایش کامل برنامه و فعالیت' : 'ثبت برنامه جدید طلبه (تقویم شمسی)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatShamsiFull(date)}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Quick Seminary Presets (الگوهای پیشنهادی مدرسه) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>الگوهای آماده (قالب مدرسه و الگوهای شما):</span>
              </label>

              {onAddCustomPreset && (
                <button
                  type="button"
                  onClick={() => setShowAddPresetForm(!showAddPresetForm)}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 hover:bg-amber-300 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>ذخیره عنوان فعلی به عنوان الگوی آماده</span>
                </button>
              )}
            </div>

            {/* Custom preset addition inline form */}
            {showAddPresetForm && (
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 space-y-2">
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                  عنوان فعلی «{title || 'بدون عنوان'}» به عنوان الگوی آماده ذخیره شود؟
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAsCustomPreset}
                    disabled={!title.trim()}
                    className="px-3 py-1 rounded-lg text-xs bg-indigo-600 text-white font-black hover:bg-indigo-700 disabled:opacity-50"
                  >
                    بله، ذخیره کن
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddPresetForm(false)}
                    className="px-3 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            )}

            {/* Presets badges list */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {/* Custom Presets created by student */}
              {customPresets.map((cp) => (
                <div
                  key={cp.id}
                  className="group inline-flex items-center rounded-xl text-xs bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800"
                >
                  <button
                    type="button"
                    onClick={() => handleApplyPreset({
                      title: cp.title,
                      category: cp.category,
                      customCategoryName: cp.customCategoryName,
                      startTime: cp.startTime,
                      endTime: cp.endTime,
                      subject: cp.subject
                    })}
                    className="px-2.5 py-1 text-right hover:underline font-bold"
                  >
                    ⭐ {cp.title}
                  </button>
                  {onDeleteCustomPreset && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustomPreset(cp.id)}
                      className="px-1.5 py-1 text-indigo-400 hover:text-rose-600"
                      title="حذف این الگو"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              {/* School recommended presets */}
              {SCHOOL_RECOMMENDED_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2 py-1 rounded-xl text-[11px] bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-200 hover:text-amber-900 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Title input */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              عنوان برنامه / درس / فعالیت <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: کلاس اول، مباحثه اصول، مطالعه مکاسب، صبحگاه..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Category Selector with Custom Category creation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-200">
                دسته‌بندی فعالیت:
              </label>

              {onAddCustomCategory && (
                <button
                  type="button"
                  onClick={() => setShowAddCatForm(!showAddCatForm)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن دسته جدید</span>
                </button>
              )}
            </div>

            {/* Inline add category form */}
            {showAddCatForm && (
              <div className="mb-2 p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="نام دسته جدید (مثلا: جلسات اخلاق، هیئت، کارهای اداری)..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomCategory}
                  disabled={!newCatName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-black text-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  ثبت
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCatForm(false)}
                  className="px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  بستن
                </button>
              </div>
            )}

            {/* Categories list */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5">
              {DEFAULT_CATEGORY_OPTIONS.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 ${
                      isSelected
                        ? `${cat.bg} border-current ${cat.color} ring-1 ring-current`
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span>{cat.label}</span>
                  </button>
                );
              })}

              {/* Custom categories registered by user */}
              {customCategories.map((cCat) => {
                const isSelected = category === 'CUSTOM' && customCategoryName === cCat.name;
                return (
                  <button
                    key={cCat.id}
                    type="button"
                    onClick={() => {
                      setCategory('CUSTOM');
                      setCustomCategoryName(cCat.name);
                    }}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-400 ring-1 ring-purple-400'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span>🏷️ {cCat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shamsi Date Picker & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <ShamsiDatePicker
                value={date}
                onChange={(newDate) => setDate(newDate)}
                label="تاریخ فعالیت (تقویم شمسی):"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                اولویت برنامه:
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PlannerPriority)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="URGENT">🔴 بسیار مهم و فوری</option>
                <option value="HIGH">🟠 مهم</option>
                <option value="NORMAL">🟢 عادی</option>
                <option value="LOW">⚪ اولویت پایین</option>
              </select>
            </div>
          </div>

          {/* Time pickers */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                ساعات برنامه (نوار زمان ۲۴ ساعته)
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>تمام روز (بدون ساعت مشخص)</span>
              </label>
            </div>

            {!isAllDay && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    ساعت شروع:
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    ساعت پایان:
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Recurring Weekly Switch with WEEKS DURATION */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-indigo-950 dark:text-indigo-200 block">
                  برنامه ثابت هفتگی (کلاس‌های روزانه و تکرارشونده)
                </span>
                <span className="text-[11px] text-indigo-800/70 dark:text-indigo-300/70">
                  تکرار خودکار در جدول هفتگی و نوار روزانه
                </span>
              </div>
              <input
                type="checkbox"
                checked={isRecurringWeekly}
                onChange={(e) => setIsRecurringWeekly(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {isRecurringWeekly && (
              <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/30 space-y-3">
                {/* Days of week selection */}
                <div>
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    روزهای تکرار در طول هفته:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PERSIAN_WEEKDAYS.map((day) => {
                      const isChecked = recurringDays.includes(day.index);
                      return (
                        <button
                          key={day.index}
                          type="button"
                          onClick={() => toggleRecurringDay(day.index)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            isChecked
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {day.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Duration of recurrence (مدت زمان تکرار بر حسب هفته) */}
                <div className="bg-white dark:bg-slate-800/70 p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      مدت زمان تکرار برنامه:
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      برنامه تا چه مدتی هر هفته اجرا شود؟
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={52}
                      value={recurringWeeksCount}
                      onChange={(e) => setRecurringWeeksCount(Math.max(1, Number(e.target.value)))}
                      className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-bold font-mono text-sm text-indigo-700 dark:text-indigo-300"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      هفته
                    </span>
                    <span className="text-[11px] text-slate-400 mr-2">
                      (حدود {Math.round(recurringWeeksCount * 7 / 30)} ماه)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status and Follow-up (انجام شد / نشد / تعطیل / توضیحات) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <label className="block font-bold text-slate-700 dark:text-slate-200 text-xs">
              وضعیت برنامه و پیگیری انجام:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('PENDING')}
                className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
                  status === 'PENDING'
                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                ⚪ در انتظار انجام
              </button>
              <button
                type="button"
                onClick={() => setStatus('DONE')}
                className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
                  status === 'DONE'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                🟢 انجام شد
              </button>
              <button
                type="button"
                onClick={() => setStatus('MISSED')}
                className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
                  status === 'MISSED'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                🟠 انجام نشد (من نرفتم)
              </button>
              <button
                type="button"
                onClick={() => setStatus('HOLIDAY')}
                className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
                  status === 'HOLIDAY'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                🔵 تعطیل بود
              </button>
              <button
                type="button"
                onClick={() => setStatus('CANCELLED')}
                className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
                  status === 'CANCELLED'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                🔴 لغو شد (کنسلی)
              </button>
              <button
                type="button"
                onClick={() => setStatus('POSTPONED')}
                className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
                  status === 'POSTPONED'
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                🟣 موکول به بعد
              </button>
            </div>

            {status !== 'PENDING' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="توضیحات و دلیل (مثلا: کسالت داشتم / استاد حضور نداشتند / تعطیلی حوزوی)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            )}
          </div>

          {/* Seminary Details: Subject, Instructor, Location, Partner */}
          <div className="space-y-3 pt-1">
            <span className="block font-bold text-slate-700 dark:text-slate-200 text-xs">
              جزئیات حوزوی و آموزشی (اختیاری):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  نام کتاب / درس:
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="مکاسب، رسائل، کفایه، لمعه..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  نام استاد یا هم‌بحث:
                </label>
                <input
                  type="text"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="استاد حسینی، شیخ محمدی..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  محل برگزاری / کلاس / حجره:
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="مدرس ۳، سالن مباحثه، مسجد مدرسه..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                  یادآوری قبل از موعد:
                </label>
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value={0}>همزمان با شروع برنامه</option>
                  <option value={5}>۵ دقیقه قبل</option>
                  <option value={15}>۱۵ دقیقه قبل (پیشنهادی)</option>
                  <option value={30}>۳۰ دقیقه قبل</option>
                  <option value={60}>۱ ساعت قبل</option>
                  <option value={-1}>بدون یادآوری</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              یادداشت و نکات مهم:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="نکات تکمیلی، شماره صفحات، تکالیف یا سوالات برای استاد..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'در حال ثبت...' : editItem ? 'ذخیره تغییرات' : 'ثبت برنامه در تقویم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
