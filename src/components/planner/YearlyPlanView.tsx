import React, { useState } from 'react';
import { 
  Target, Sparkles, Plus, CheckCircle2, Circle, 
  BookOpen, Trophy, Calendar, ChevronRight, Check, 
  Trash2, Edit2, RotateCcw, X, Tag, ListPlus, 
  ChevronDown, Layers, Award, Clock
} from 'lucide-react';
import type { 
  PlannerGoal, 
  PlannerCategory, 
  PlannerAcademicTerm, 
  PlannerGoalMilestone 
} from '../../types';
import { JALALI_MONTH_NAMES, getShamsiInfo } from '../../utils/shamsiCalendar';
import { safeUUID } from '../../lib/crypto';

export interface YearlyPlanViewProps {
  goals: PlannerGoal[];
  onAddGoal: (goal: Partial<PlannerGoal>) => Promise<void>;
  onUpdateGoal: (goal: PlannerGoal) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  academicTerms?: PlannerAcademicTerm[];
  onAddAcademicTerm?: (term: Partial<PlannerAcademicTerm>) => Promise<void>;
  onUpdateAcademicTerm?: (term: PlannerAcademicTerm) => Promise<void>;
  onDeleteAcademicTerm?: (id: string) => Promise<void>;
  onResetAcademicTerms?: (year: number) => Promise<void>;
}

// Canonical default Seminary Seasons
export const DEFAULT_SEMINARY_TERMS: Array<Omit<PlannerAcademicTerm, 'id' | 'studentId' | 'synced' | 'createdAt'>> = [
  {
    name: 'نیمسال اول تحصیلی حوزه (پاییز)',
    tag: 'شروع کلاس‌ها و دروس پایه',
    months: ['مهر', 'آبان', 'آذر'],
    desc: 'آغاز رسمی دروس فقه، اصول، ادبیات و اخلاق در مدارس علمیه',
    color: 'amber',
    keyEvents: [
      'آغاز سال تحصیلی و آیین افتتاحیه حوزه',
      'تثبیت گروه‌های مباحثه علمی و حجره‌ها',
      'برگزاری آزمون‌های کلاسی و ارزیابی آبان‌ماه'
    ]
  },
  {
    name: 'امتحانات نوبت اول و نیمسال دوم (زمستان)',
    tag: 'امتحانات دی‌ماه + نیمسال دوم',
    months: ['دی', 'بهمن', 'اسفند'],
    desc: 'ارزیابی نوبت اول، آغاز مباحثات نیمسال دوم و ایام اعتکاف ماه رجب',
    color: 'blue',
    keyEvents: [
      'امتحانات جامع نوبت اول (دی‌ماه)',
      'شروع نیمسال دوم و کتب درسی جدید',
      'ایام اعتکاف ماه رجب و اردوهای معنوی'
    ]
  },
  {
    name: 'پایان سال تحصیلی و امتحانات خرداد (بهار)',
    tag: 'امتحانات نهایی پایه',
    months: ['فروردین', 'اردیبهشت', 'خرداد'],
    desc: 'اتمام کتب درسی، دوره کردن مباحثات و آزمون‌های کتبی و شفاهی حوزه',
    color: 'emerald',
    keyEvents: [
      'اتمام سرفصل‌های درسی و جمع‌بندی مباحثات',
      'امتحانات کتبی و شفاهی خردادماه',
      'ثبت نمرات و ارزیابی کارنامه تحصیلی'
    ]
  },
  {
    name: 'ایام تبلیغ و دوره‌های ارتقایی (تابستان)',
    tag: 'تبلیغ، پژوهش و مهارت‌افزایی',
    months: ['تیر', 'مرداد', 'شهریور'],
    desc: 'اردوهای تهذیبی، دوره‌های تثبیتی، تبلیغ محرم و صفر و مطالعات آزاد',
    color: 'rose',
    keyEvents: [
      'دوره‌های تثبیتی و ارتقایی تابستانه حوزه',
      'اعزام تبلیغی ایام محرم و صفر',
      'پژوهش‌های حوزوی، زبان عربی و مطالعات آزاد'
    ]
  }
];

const TERM_PRESETS = [
  {
    name: 'نیمسال اول تحصیلی (پاییز)',
    tag: 'دروس پایه و مباحثات',
    months: ['مهر', 'آبان', 'آذر'],
    desc: 'آغاز رسمی سال تحصیلی، استقرار در حجره و تثبیت دروس',
    color: 'amber'
  },
  {
    name: 'امتحانات دی‌ماه و نیمسال دوم (زمستان)',
    tag: 'امتحانات نوبت اول و شروع ترم ۲',
    months: ['دی', 'بهمن', 'اسفند'],
    desc: 'امتحانات میان‌دوره و تدریس مباحث فقهی و اصولی جدید',
    color: 'blue'
  },
  {
    name: 'امتحانات نهایی خردادماه (بهار)',
    tag: 'امتحانات پایان پایه',
    months: ['فروردین', 'اردیبهشت', 'خرداد'],
    desc: 'اتمام کتب درسی، آزمون‌های کتبی و شفاهی پایه',
    color: 'emerald'
  },
  {
    name: 'ایام تبلیغ و دوره‌های ارتقایی (تابستان)',
    tag: 'تبلیغ، اردو و مهارت‌افزایی',
    months: ['تیر', 'مرداد', 'شهریور'],
    desc: 'اعزام تبلیغی، دوره‌های تابستانه و تهذیبی',
    color: 'rose'
  },
  {
    name: 'دوره ارتقایی تابستانه حوزه',
    tag: 'ارتقای پایه تحصیلی',
    months: ['تیر', 'مرداد'],
    desc: 'گذراندن دروس مازاد جهت ارتقا یا تسریع در اتمام پایه',
    color: 'purple'
  },
  {
    name: 'دوره مکالمه تخصصی زبان عربی',
    tag: 'مهارت زبانی و فهم متون',
    months: ['تیر', 'مرداد', 'شهریور'],
    desc: 'کارگاه‌های فشرده مکالمه عربی فصیح و معاصر',
    color: 'cyan'
  },
  {
    name: 'دوره تثبیتی و آموزشی طلاب جدیدالورود',
    tag: 'آشنایی با زی طلبگی',
    months: ['مرداد', 'شهریور'],
    desc: 'برنامه‌های آموزشی و تهذیبی جهت تثبیت در مدرسه علمیه',
    color: 'indigo'
  }
];

const ALL_SHAMSI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 
  'تیر', 'مرداد', 'شهریور', 
  'مهر', 'آبان', 'آذر', 
  'دی', 'بهمن', 'اسفند'
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; lightBg: string }> = {
  amber: {
    bg: 'from-amber-600/10 to-orange-600/10',
    border: 'border-amber-300 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-300',
    badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
    lightBg: 'bg-amber-50 dark:bg-amber-950/30'
  },
  blue: {
    bg: 'from-blue-600/10 to-cyan-600/10',
    border: 'border-blue-300 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-300',
    badge: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300',
    lightBg: 'bg-blue-50 dark:bg-blue-950/30'
  },
  emerald: {
    bg: 'from-emerald-600/10 to-teal-600/10',
    border: 'border-emerald-300 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-300',
    badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/30'
  },
  rose: {
    bg: 'from-rose-600/10 to-pink-600/10',
    border: 'border-rose-300 dark:border-rose-800',
    text: 'text-rose-800 dark:text-rose-300',
    badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300',
    lightBg: 'bg-rose-50 dark:bg-rose-950/30'
  },
  purple: {
    bg: 'from-purple-600/10 to-fuchsia-600/10',
    border: 'border-purple-300 dark:border-purple-800',
    text: 'text-purple-800 dark:text-purple-300',
    badge: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300',
    lightBg: 'bg-purple-50 dark:bg-purple-950/30'
  },
  cyan: {
    bg: 'from-cyan-600/10 to-teal-600/10',
    border: 'border-cyan-300 dark:border-cyan-800',
    text: 'text-cyan-800 dark:text-cyan-300',
    badge: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300',
    lightBg: 'bg-cyan-50 dark:bg-cyan-950/30'
  },
  indigo: {
    bg: 'from-indigo-600/10 to-violet-600/10',
    border: 'border-indigo-300 dark:border-indigo-800',
    text: 'text-indigo-800 dark:text-indigo-300',
    badge: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300',
    lightBg: 'bg-indigo-50 dark:bg-indigo-950/30'
  }
};

const GOAL_TEMPLATES = [
  { title: 'اتمام کتاب‌های درسی پایه با نمره عالی (بالای ۱۸)', category: 'CLASS' as PlannerCategory },
  { title: 'حفظ ۳ جزء جدید از قرآن کریم با تثبیت', category: 'WORSHIP' as PlannerCategory },
  { title: 'نگارش مقاله پژوهشی با استانداردهای علمی', category: 'STUDY' as PlannerCategory },
  { title: 'تقریرنویسی منظم درس خارج یا سطح استاد در هر روز', category: 'MABAHESE' as PlannerCategory },
  { title: 'مطالعه دوره ۵ جلدی کتاب‌های اخلاقی و معنوی', category: 'STUDY' as PlannerCategory },
  { title: 'آمادگی کامل و منبرهای تبلیغی در دهه محرم و صفر', category: 'TABLIGH' as PlannerCategory },
  { title: 'ورزش روزانه منظم و حفظ نشاط و سلامت جسمانی', category: 'FITNESS' as PlannerCategory }
];

export function YearlyPlanView({
  goals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  academicTerms = [],
  onAddAcademicTerm,
  onUpdateAcademicTerm,
  onDeleteAcademicTerm,
  onResetAcademicTerms
}: YearlyPlanViewProps) {
  const currentShamsi = getShamsiInfo(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(currentShamsi.jy);

  // Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PlannerGoal | null>(null);

  const [showTermModal, setShowTermModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PlannerAcademicTerm | null>(null);

  // Goal Form State
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<PlannerCategory>('STUDY');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalTermId, setGoalTermId] = useState<string>('');
  const [goalProgress, setGoalProgress] = useState(0);

  // Term Form State
  const [termName, setTermName] = useState('');
  const [termTag, setTermTag] = useState('');
  const [termDesc, setTermDesc] = useState('');
  const [termMonths, setTermMonths] = useState<string[]>([]);
  const [termColor, setTermColor] = useState('amber');
  const [termKeyEvents, setTermKeyEvents] = useState<string[]>([]);
  const [newEventInput, setNewEventInput] = useState('');

  // Category filter for goals
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Milestone input per goal
  const [activeMilestoneGoalId, setActiveMilestoneGoalId] = useState<string | null>(null);
  const [newMilestoneInput, setNewMilestoneInput] = useState('');

  // Effective academic terms (either loaded from DB or default seminary seasons)
  const userTermsForYear = academicTerms.filter(t => !t.isDeleted && (!t.year || t.year === selectedYear));
  
  const displayTerms: Array<PlannerAcademicTerm | (typeof DEFAULT_SEMINARY_TERMS[0] & { id: string; studentId: string; year: number })> = 
    userTermsForYear.length > 0
      ? userTermsForYear
      : DEFAULT_SEMINARY_TERMS.map((def, idx) => ({
          ...def,
          id: `default_term_${idx}`,
          studentId: 'default',
          year: selectedYear,
          synced: true
        }));

  const isUsingDefaults = userTermsForYear.length === 0;

  // Filter goals by year and category
  const filteredGoals = goals.filter(g => {
    if (g.isDeleted) return false;
    const matchYear = g.year === selectedYear || !g.year;
    const matchCat = selectedCategoryFilter === 'ALL' || g.category === selectedCategoryFilter;
    return matchYear && matchCat;
  });

  // --- Handlers for Goals ---
  const handleOpenAddGoal = () => {
    setEditingGoal(null);
    setGoalTitle('');
    setGoalCategory('STUDY');
    setGoalDesc('');
    setGoalTermId('');
    setGoalProgress(0);
    setShowGoalModal(true);
  };

  const handleOpenEditGoal = (goal: PlannerGoal) => {
    setEditingGoal(goal);
    setGoalTitle(goal.title);
    setGoalCategory(goal.category);
    setGoalDesc(goal.description || '');
    setGoalTermId(goal.termId || '');
    setGoalProgress(goal.progressPercent || 0);
    setShowGoalModal(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    if (editingGoal) {
      await onUpdateGoal({
        ...editingGoal,
        title: goalTitle.trim(),
        category: goalCategory,
        description: goalDesc.trim() || undefined,
        termId: goalTermId || undefined,
        year: selectedYear,
        progressPercent: goalProgress,
        isCompleted: goalProgress === 100
      });
    } else {
      await onAddGoal({
        title: goalTitle.trim(),
        category: goalCategory,
        description: goalDesc.trim() || undefined,
        termId: goalTermId || undefined,
        year: selectedYear,
        progressPercent: goalProgress,
        isCompleted: goalProgress === 100
      });
    }

    setShowGoalModal(false);
  };

  const handleToggleComplete = async (goal: PlannerGoal) => {
    const isCompleted = !goal.isCompleted;
    await onUpdateGoal({
      ...goal,
      isCompleted,
      progressPercent: isCompleted ? 100 : goal.progressPercent
    });
  };

  const handleUpdateProgress = async (goal: PlannerGoal, progress: number) => {
    await onUpdateGoal({
      ...goal,
      progressPercent: progress,
      isCompleted: progress === 100
    });
  };

  // Milestone check / uncheck
  const handleToggleMilestone = async (goal: PlannerGoal, milestoneId: string) => {
    const updatedMilestones = (goal.milestones || []).map(m => 
      m.id === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m
    );
    
    // Auto-update progress if all or some milestones complete
    const total = updatedMilestones.length;
    const completedCount = updatedMilestones.filter(m => m.isCompleted).length;
    const calculatedProgress = total > 0 ? Math.round((completedCount / total) * 100) : goal.progressPercent;

    await onUpdateGoal({
      ...goal,
      milestones: updatedMilestones,
      progressPercent: calculatedProgress,
      isCompleted: calculatedProgress === 100
    });
  };

  // Add milestone to goal
  const handleAddMilestone = async (goal: PlannerGoal) => {
    if (!newMilestoneInput.trim()) return;
    const newM: PlannerGoalMilestone = {
      id: safeUUID(),
      title: newMilestoneInput.trim(),
      isCompleted: false
    };
    const updatedMilestones = [...(goal.milestones || []), newM];
    await onUpdateGoal({
      ...goal,
      milestones: updatedMilestones
    });
    setNewMilestoneInput('');
  };

  const handleDeleteMilestone = async (goal: PlannerGoal, milestoneId: string) => {
    const updatedMilestones = (goal.milestones || []).filter(m => m.id !== milestoneId);
    await onUpdateGoal({
      ...goal,
      milestones: updatedMilestones
    });
  };

  // --- Handlers for Academic Terms ---
  const handleOpenAddTerm = () => {
    setEditingTerm(null);
    setTermName('');
    setTermTag('');
    setTermDesc('');
    setTermMonths(['مهر', 'آبان', 'آذر']);
    setTermColor('amber');
    setTermKeyEvents([]);
    setNewEventInput('');
    setShowTermModal(true);
  };

  const handleOpenEditTerm = (term: any) => {
    // If it's a default synthetic term, we create it as a proper object
    setEditingTerm(term);
    setTermName(term.name);
    setTermTag(term.tag || '');
    setTermDesc(term.desc || '');
    setTermMonths([...term.months]);
    setTermColor(term.color || 'amber');
    setTermKeyEvents([...(term.keyEvents || [])]);
    setNewEventInput('');
    setShowTermModal(true);
  };

  const handleToggleMonth = (month: string) => {
    if (termMonths.includes(month)) {
      setTermMonths(termMonths.filter(m => m !== month));
    } else {
      setTermMonths([...termMonths, month]);
    }
  };

  const handleAddKeyEvent = () => {
    if (!newEventInput.trim()) return;
    setTermKeyEvents([...termKeyEvents, newEventInput.trim()]);
    setNewEventInput('');
  };

  const handleRemoveKeyEvent = (idx: number) => {
    setTermKeyEvents(termKeyEvents.filter((_, i) => i !== idx));
  };

  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termName.trim()) return;

    if (editingTerm && !editingTerm.id.startsWith('default_term_')) {
      // Editing existing DB term
      if (onUpdateAcademicTerm) {
        await onUpdateAcademicTerm({
          ...editingTerm,
          year: selectedYear,
          name: termName.trim(),
          tag: termTag.trim() || undefined,
          desc: termDesc.trim() || undefined,
          months: termMonths,
          color: termColor,
          keyEvents: termKeyEvents
        });
      }
    } else {
      // Either creating new, or persisting an edited default term
      if (onAddAcademicTerm) {
        await onAddAcademicTerm({
          year: selectedYear,
          name: termName.trim(),
          tag: termTag.trim() || undefined,
          desc: termDesc.trim() || undefined,
          months: termMonths,
          color: termColor,
          keyEvents: termKeyEvents
        });
      }
    }

    setShowTermModal(false);
  };

  const handleDeleteTerm = async (term: any) => {
    if (!confirm(`آیا از حذف دوره «${term.name}» اطمینان دارید؟`)) return;
    if (onDeleteAcademicTerm && !term.id.startsWith('default_term_')) {
      await onDeleteAcademicTerm(term.id);
    }
  };

  const handleResetToSeminaryDefaults = async () => {
    if (!confirm('آیا می‌خواهید تقویم فصلی و نیمسال‌ها به ۴ فصل مصوب حوزه علمیه بازنشانی شوند؟')) return;
    if (onResetAcademicTerms) {
      await onResetAcademicTerms(selectedYear);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with year selection & actions */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Target className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                برنامه‌ریزی سالانه و چشم‌انداز تحصیلی سال {selectedYear}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تقویم فصلی، نیمسال‌های آموزشی حوزه، اهداف جامع علمی و مسیر رشد تهذیبی طلبه
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-bold text-slate-500 px-2">سال تحصیلی:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="انتخاب سال تحصیلی"
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 focus:outline-none"
            >
              {[1403, 1404, 1405, 1406, 1407].map(y => (
                <option key={y} value={y}>سال {y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenAddGoal}
            className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت هدف جدید</span>
          </button>
        </div>
      </div>

      {/* Seminary 4 Seasons & Academic Terms (Editable Section) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              تقویم فصلی و نیمسال‌های آموزشی حوزه علمیه
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              دوره‌ها، نیمسال‌ها، رویدادها و ماه‌های تحصیلی قابل ویرایش و شخصی‌سازی هستند
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onResetAcademicTerms && (
              <button
                onClick={handleResetToSeminaryDefaults}
                className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="بازنشانی تقویم به ۴ فصل استاندارد حوزه"
              >
                <RotateCcw className="w-3 h-3" />
                <span>بازنشانی به پیش‌فرض حوزه</span>
              </button>
            )}

            <button
              onClick={handleOpenAddTerm}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن دوره / نیمسال جدید</span>
            </button>
          </div>
        </div>

        {/* Term Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {displayTerms.map((term: any) => {
            const colorTheme = COLOR_MAP[term.color || 'amber'] || COLOR_MAP.amber;
            const isDefaultItem = term.id.startsWith('default_term_');

            return (
              <div
                key={term.id}
                className={`p-4 rounded-3xl border bg-linear-to-b ${colorTheme.bg} bg-white dark:bg-slate-900 ${colorTheme.border} shadow-xs flex flex-col justify-between group relative transition-all hover:shadow-md`}
              >
                <div>
                  {/* Tag and Actions */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${colorTheme.badge}`}>
                      {term.tag || 'دوره تحصیلی'}
                    </span>

                    {/* Action buttons: Edit & Delete */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditTerm(term)}
                        className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        title="ویرایش این دوره / نیمسال"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!isDefaultItem && onDeleteAcademicTerm && (
                        <button
                          onClick={() => handleDeleteTerm(term)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                          title="حذف دوره"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 mb-1 leading-snug">
                    {term.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                    {term.desc || 'برنامه‌ریزی و ارزیابی آموزشی'}
                  </p>

                  {/* Key Events Checklist if any */}
                  {term.keyEvents && term.keyEvents.length > 0 && (
                    <div className="mb-3 space-y-1 bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">
                        رویدادها و نقاط عطف کلیدی:
                      </span>
                      {term.keyEvents.map((evt: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                          <Check className="w-3 h-3 text-indigo-500 mt-0.5 shrink-0" />
                          <span>{evt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Covered Months footer */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>ماه‌ها:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">
                    {Array.isArray(term.months) && term.months.length > 0
                      ? term.months.join(' · ')
                      : 'نامشخص'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Yearly Goals & Milestones Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              اهداف و چشم‌انداز تحصیلی من ({filteredGoals.length} هدف)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              پیگیری اهداف علمی، تهذیبی، مهارتی و پژوهشی در طول سال تحصیلی {selectedYear}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 text-[11px]">دسته‌بندی:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                aria-label="فیلتر دسته‌بندی اهداف"
                className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">همه دسته‌ها</option>
                <option value="CLASS">کلاس‌های درس</option>
                <option value="MABAHESE">مباحثه علمی</option>
                <option value="STUDY">مطالعه و پژوهش</option>
                <option value="WORSHIP">عبادی و اخلاقی</option>
                <option value="TABLIGH">تبلیغ و منبر</option>
                <option value="FITNESS">ورزش و نشاط</option>
                <option value="PERSONAL">شخصی</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddGoal}
              className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن هدف</span>
            </button>
          </div>
        </div>

        {filteredGoals.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 bg-slate-50/50 dark:bg-slate-850/30">
            <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              هنوز هدفی برای این سال یا دسته ثبت نکرده‌اید
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
              تعیین هدف‌های روشن به تمرکز در تحصیل حوزوی، تقریرنویسی، حفظ قرآن و خودسازی معنوی کمک می‌کند.
            </p>
            <button
              onClick={handleOpenAddGoal}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20"
            >
              افزودن اولین هدف سالانه
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredGoals.map((goal) => {
              const isDone = Boolean(goal.isCompleted);
              const progress = goal.progressPercent || 0;
              const isMilestoneOpen = activeMilestoneGoalId === goal.id;
              const milestones = goal.milestones || [];
              const completedMilestones = milestones.filter(m => m.isCompleted).length;

              // Find linked term name if any
              const linkedTerm = goal.termId ? displayTerms.find(t => t.id === goal.termId) : null;

              return (
                <div
                  key={goal.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                    isDone
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-50/80 dark:bg-slate-850 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(goal)}
                        className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                        title={isDone ? 'علامت‌گذاری به عنوان در حال پیگیری' : 'علامت‌گذاری به عنوان انجام‌شده'}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="w-6 h-6 text-slate-400 hover:text-indigo-600" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className={`text-sm sm:text-base font-black ${
                            isDone 
                              ? 'line-through text-slate-500 dark:text-slate-400' 
                              : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            {goal.title}
                          </h4>

                          {linkedTerm && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                              {linkedTerm.name}
                            </span>
                          )}
                        </div>

                        {goal.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {goal.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Edit & Delete actions for this goal */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditGoal(goal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                        title="ویرایش هدف"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="حذف هدف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar & slider */}
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span>میزان پیشرفت هدف:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">{progress}٪</span>
                      </div>

                      {milestones.length > 0 && (
                        <span className="text-[11px] text-slate-400">
                          {completedMilestones} از {milestones.length} مرحله کامل شده
                        </span>
                      )}
                    </div>

                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-indigo-500 to-indigo-600 transition-all rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Progress Slider */}
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={progress}
                        onChange={(e) => handleUpdateProgress(goal, Number(e.target.value))}
                        aria-label="تغییر درصد پیشرفت هدف"
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Milestones / Sub-tasks Checklist toggle */}
                  <div className="mt-3 pt-2">
                    <button
                      onClick={() => setActiveMilestoneGoalId(isMilestoneOpen ? null : goal.id)}
                      className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      <span>
                        مراحل و ریزاقدامات ({milestones.length})
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMilestoneOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Milestone items list */}
                    {isMilestoneOpen && (
                      <div className="mt-2.5 space-y-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-750">
                        {milestones.length === 0 ? (
                          <p className="text-[11px] text-slate-400">
                            هنوز مرحله‌ای برای این هدف ثبت نشده است. می‌توانید مراحل رسیدن به این هدف را اضافه کنید.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {milestones.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                              >
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                  <input
                                    type="checkbox"
                                    checked={m.isCompleted}
                                    onChange={() => handleToggleMilestone(goal, m.id)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className={m.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}>
                                    {m.title}
                                  </span>
                                </label>

                                <button
                                  onClick={() => handleDeleteMilestone(goal, m.id)}
                                  className="text-slate-400 hover:text-rose-500 p-1"
                                  title="حذف مرحله"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add milestone inline input */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <input
                            type="text"
                            value={newMilestoneInput}
                            onChange={(e) => setNewMilestoneInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddMilestone(goal);
                              }
                            }}
                            placeholder="افزودن مرحله جدید (مثلاً مطالعه کتاب مکاسب جلد ۲)..."
                            className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddMilestone(goal)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                          >
                            ثبت مرحله
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT ACADEMIC TERM / SEASON */}
      {/* ============================================================== */}
      {showTermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-5 h-5" />
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {editingTerm ? 'ویرایش نیمسال / بازه آموزشی' : 'افزودن نیمسال یا بازه آموزشی جدید'}
                </h3>
              </div>
              <button
                onClick={() => setShowTermModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Seminary Presets */}
            {!editingTerm && (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/60 dark:border-slate-750">
                <span className="text-[11px] font-bold text-slate-500 block mb-2">
                  الگوهای پیشنهادی دوره‌های حوزوی:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TERM_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTermName(p.name);
                        setTermTag(p.tag);
                        setTermDesc(p.desc);
                        setTermMonths(p.months);
                        setTermColor(p.color);
                      }}
                      className="text-xs px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 font-medium transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveTerm} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان دوره یا نیمسال: *
                </label>
                <input
                  type="text"
                  required
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  placeholder="مثال: نیمسال اول تحصیلی حوزه (پاییز) یا دوره ارتقایی تابستان..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  برچسب یا رویکرد شاخص:
                </label>
                <input
                  type="text"
                  value={termTag}
                  onChange={(e) => setTermTag(e.target.value)}
                  placeholder="مثال: شروع کلاس‌ها و دروس پایه / امتحانات نهایی"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Covered Months Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ماه‌های تحت پوشش این بازه (کلیک برای انتخاب/حذف):
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {ALL_SHAMSI_MONTHS.map((m) => {
                    const isSelected = termMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleToggleMonth(m)}
                        className={`py-1.5 px-2 rounded-xl font-bold text-center border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توضیحات و اهداف دوره:
                </label>
                <textarea
                  rows={2}
                  value={termDesc}
                  onChange={(e) => setTermDesc(e.target.value)}
                  placeholder="توضیحاتی پیرامون سرفصل‌ها، اردوها یا امتحانات این دوره..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              {/* Key Events / Milestones */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رویدادها و نقاط عطف کلیدی:
                </label>
                
                {termKeyEvents.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {termKeyEvents.map((evt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                      >
                        <span className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{evt}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyEvent(idx)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newEventInput}
                    onChange={(e) => setNewEventInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyEvent();
                      }
                    }}
                    placeholder="افزودن رویداد کلیدی (مثلاً آزمون دی‌ماه، اعتکاف رجب)..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyEvent}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white font-bold transition-colors"
                  >
                    افزودن
                  </button>
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  رنگ کارت:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: 'amber', label: 'کهربایی / پاییز', dot: 'bg-amber-500' },
                    { id: 'blue', label: 'آبی / زمستان', dot: 'bg-blue-500' },
                    { id: 'emerald', label: 'سبز زمردی / بهار', dot: 'bg-emerald-500' },
                    { id: 'rose', label: 'سرخ‌فام / تابستان', dot: 'bg-rose-500' },
                    { id: 'purple', label: 'بنفش', dot: 'bg-purple-500' },
                    { id: 'cyan', label: 'فیروزه‌ای', dot: 'bg-cyan-500' },
                    { id: 'indigo', label: 'نیلی', dot: 'bg-indigo-500' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setTermColor(c.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        termColor === c.id
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTermModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                  {editingTerm ? 'ذخیره تغییرات' : 'ثبت دوره / نیمسال'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT YEARLY GOAL */}
      {/* ============================================================== */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                {editingGoal ? 'ویرایش هدف سالانه' : 'ثبت هدف جدید سالانه'}
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets (only on add) */}
            {!editingGoal && (
              <div className="mb-4">
                <span className="text-xs font-bold text-slate-500 block mb-1.5">
                  الگوهای آماده برای طلبه:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {GOAL_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setGoalTitle(tmpl.title);
                        setGoalCategory(tmpl.category);
                      }}
                      className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-700"
                    >
                      {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveGoal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان هدف: *
                </label>
                <input
                  type="text"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="مثال: اتمام کتاب مکاسب محرمه و تقریر کامل مباحث..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    دسته‌بندی هدف:
                  </label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value as PlannerCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="CLASS">کلاس درس حوزه</option>
                    <option value="MABAHESE">مباحثه علمی</option>
                    <option value="STUDY">مطالعه و پژوهش</option>
                    <option value="WORSHIP">عبادی و تهذیبی</option>
                    <option value="TABLIGH">تبلیغ و منبر</option>
                    <option value="FITNESS">ورزش و سلامت</option>
                    <option value="PERSONAL">امور شخصی و خانوادگی</option>
                    <option value="OTHER">سایر</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نیمسال یا دوره مرتبط (اختیاری):
                  </label>
                  <select
                    value={goalTermId}
                    onChange={(e) => setGoalTermId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="">کل سال تحصیلی</option>
                    {displayTerms.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توضیحات تکمیلی:
                </label>
                <textarea
                  rows={2}
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  placeholder="مراحل، شروط موفقیت یا کتب مرتبط..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  درصد پیشرفت فعلی: {goalProgress}٪
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={goalProgress}
                  onChange={(e) => setGoalProgress(Number(e.target.value))}
                  aria-label="درصد پیشرفت فعلی"
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                  {editingGoal ? 'ذخیره تغییرات' : 'ثبت هدف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
