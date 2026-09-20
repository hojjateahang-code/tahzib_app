import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../store';
import { db } from '../../db';
import { triggerSync } from '../../sync';
import { Assessment, PrayerStatus } from '../../types';
import { format, subDays, addDays, startOfToday, isBefore } from 'date-fns';
import { CloudOff, Plus, Info, ChevronDown, ChevronUp, MessageSquarePlus, Calendar, AlertCircle, CheckCircle2, XCircle, Send, Star, Clock, X, Smartphone, Edit3, Trash2, Save } from 'lucide-react';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { useLiveQuery } from 'dexie-react-hooks';
import { ScreenTimeTracker } from './ScreenTimeTracker';

const prayerOptions: { label: string; value: PrayerStatus }[] = [
  { label: 'انجام نشده', value: 'NONE' },
  { label: 'اداء به جماعت', value: 'ADA_JAMAAT' },
  { label: 'اداء فرادی', value: 'ADA_FORADA' },
  { label: 'قضا', value: 'QAZA' },
  { label: 'ترک', value: 'TARK' }
];

export function StudentSelfAssessment() {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [expandedSection, setExpandedSection] = useState<string | null>('prayers');
  
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  
  const isReadOnly = useMemo(() => {
    return selectedDate !== todayDate && selectedDate !== yesterdayDate;
  }, [selectedDate, todayDate, yesterdayDate]);

  const assessment = useLiveQuery(
    async () => {
      if (!currentUser) return null;
      let record = await db.assessments
        .where('studentId')
        .equals(currentUser.id)
        .filter(a => a.date === selectedDate)
        .first();
      return record;
    },
    [currentUser, selectedDate]
  );

  useEffect(() => {
    async function ensureAssessment() {
      if (!currentUser) return;
      
      const record = await db.assessments
        .where('studentId')
        .equals(currentUser.id)
        .filter(a => a.date === selectedDate)
        .first();
      
      if (!record) {
        const newRecord: Assessment = {
          id: crypto.randomUUID(),
          studentId: currentUser.id,
          date: selectedDate,
          synced: false
        };
        try {
          await db.assessments.add(newRecord);
        } catch (error) {
          console.error("Error creating record:", error);
        }
      }
    }
    
    ensureAssessment();
  }, [currentUser, selectedDate]);

  const myHabits = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const habits = await db.personalHabits.where('studentId').equals(currentUser.id).toArray();
      return habits.filter(h => {
        if (!h.endDate) return selectedDate >= h.startDate.split('T')[0]; // No limit
        const isBeforeEnd = selectedDate <= h.endDate.split('T')[0];
        const isAfterStart = selectedDate >= h.startDate.split('T')[0];
        return isBeforeEnd && isAfterStart;
      });
    },
    [currentUser, selectedDate]
  );

  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitDuration, setNewHabitDuration] = useState<string>('0');
  const [newHabitType, setNewHabitType] = useState<'BOOLEAN' | 'MULTICHOICE'>('BOOLEAN');
  const [newHabitOptions, setNewHabitOptions] = useState<string>('عالی, خوب, متوسط, انجام نشد');
  const [courseToReset, setCourseToReset] = useState<any | null>(null);

  // Editing habit state
  const [editingHabit, setEditingHabit] = useState<any | null>(null);
  const [editHabitTitle, setEditHabitTitle] = useState('');
  const [editHabitDuration, setEditHabitDuration] = useState('0');
  const [editHabitType, setEditHabitType] = useState<'BOOLEAN' | 'MULTICHOICE'>('BOOLEAN');
  const [editHabitOptions, setEditHabitOptions] = useState('عالی, خوب, متوسط, انجام نشد');

  const handleStartEditHabit = (habit: any) => {
    setEditingHabit(habit);
    setEditHabitTitle(habit.title || '');
    setEditHabitDuration(String(habit.durationDays || 0));
    setEditHabitType(habit.type || 'BOOLEAN');
    setEditHabitOptions(habit.options && habit.options.length > 0 ? habit.options.join(', ') : 'عالی, خوب, متوسط, انجام نشد');
  };

  const handleSaveEditHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit) return;
    const trimmedTitle = editHabitTitle.trim();
    if (!trimmedTitle) return;

    const durationDays = Number(editHabitDuration) || 0;
    const opts = editHabitType === 'MULTICHOICE'
      ? editHabitOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    await db.personalHabits.update(editingHabit.id, {
      title: trimmedTitle,
      durationDays,
      type: editHabitType,
      options: opts
    });

    setEditingHabit(null);
    triggerSync();
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (window.confirm('آیا از حذف این عنوان شخصی و چله اطمینان دارید؟')) {
      await db.personalHabits.delete(habitId);
      triggerSync();
    }
  };

  // Modals & state for Counseling Requests and Feedback
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTopic, setRequestTopic] = useState('مشاوره تحصیلی و برنامه‌ریزی درسی');
  const [requestUrgency, setRequestUrgency] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL');
  const [requestDesc, setRequestDesc] = useState('');

  const [attendedApptId, setAttendedApptId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [satisfactionLevel, setSatisfactionLevel] = useState('عالی');

  const [missedApptId, setMissedApptId] = useState<string | null>(null);
  const [missedReasonInput, setMissedReasonInput] = useState<string>('');
  const [presetMissedReason, setPresetMissedReason] = useState<string>('تداخل با کلاس یا امتحانات');

  const updateField = async (field: keyof Assessment, value: any) => {
    if (isReadOnly) return alert('امکان تغییر اطلاعات این تاریخ وجود ندارد. (ثبت و ویرایش فقط برای امروز و دیروز فعال است)');
    if (!assessment) return;
    await db.assessments.update(assessment.id, { [field]: value, synced: false, updatedAt: Date.now() } as any);
    triggerSync();
  };

  const updatePrayer = async (prayer: string, status: PrayerStatus) => {
    if (isReadOnly) return alert('امکان تغییر اطلاعات این تاریخ وجود ندارد. (ثبت و ویرایش فقط برای امروز و دیروز فعال است)');
    if (!assessment) return;
    await db.assessments.update(assessment.id, { [prayer]: status, synced: false, updatedAt: Date.now() } as any);
    triggerSync();
  };

  const updateCustomTask = async (habitId: string, value: boolean | string, habitObj?: any) => {
    if (isReadOnly) return alert('امکان تغییر اطلاعات این تاریخ وجود ندارد. (ثبت و ویرایش فقط برای امروز و دیروز فعال است)');
    if (!assessment) return;
    const currentCustom = assessment.customTasks || {};
    await db.assessments.update(assessment.id, {
      customTasks: { ...currentCustom, [habitId]: value },
      synced: false,
      updatedAt: Date.now()
    });
    triggerSync();

    // If user clicked cross (false or 'انجام نشد'), check if habit is a course with duration
    if (value === false || value === 'انجام نشد') {
      const targetHabit = habitObj || myHabits?.find(h => h.id === habitId);
      if (targetHabit && targetHabit.durationDays && targetHabit.durationDays > 0) {
        setCourseToReset(targetHabit);
      }
    }
  };

  const handleSaveEntireAssessment = async () => {
    if (isReadOnly) return alert('امکان تغییر اطلاعات این تاریخ وجود ندارد. (ثبت و ویرایش فقط برای امروز و دیروز فعال است)');
    if (!assessment) return;

    await db.assessments.update(assessment.id, {
      updatedAt: Date.now(),
      synced: false
    });
    triggerSync();

    const faDateStr = new Date(selectedDate).toLocaleDateString('fa-IR');
    setSuccessMsg(`ارزیابی و تغییرات شما برای تاریخ (${faDateStr}) با موفقیت ثبت و بروزرسانی شد.`);
    setTimeout(() => setSuccessMsg(null), 5000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getHabitRemainingInfo = (habit: any) => {
    if (!habit.durationDays || habit.durationDays <= 0) {
      return { isCourse: false, label: 'بدون محدودیت زمان' };
    }
    const start = new Date(habit.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.max(0, Math.floor((today.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    const remaining = Math.max(0, habit.durationDays - diffDays);
    return {
      isCourse: true,
      totalDays: habit.durationDays,
      elapsedDays: diffDays + 1,
      remainingDays: remaining,
      label: `${habit.durationDays} روزه (${remaining} روز باقی‌مانده)`
    };
  };

  const handleResetCourseStartDate = async (habit: any) => {
    if (!habit || !habit.durationDays) return;
    const newStart = new Date();
    const newEnd = new Date();
    newEnd.setDate(newEnd.getDate() + habit.durationDays - 1);

    await db.personalHabits.update(habit.id, {
      startDate: newStart.toISOString(),
      endDate: newEnd.toISOString()
    });

    setCourseToReset(null);
    triggerSync();
  };

  const updateNote = async (key: string, note: string) => {
    if (isReadOnly) return;
    if (!assessment) return;
    const currentNotes = assessment.notes || {};
    await db.assessments.update(assessment.id, {
      notes: { ...currentNotes, [key]: note },
      synced: false
    });
    triggerSync();
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newHabitTitle.trim()) return;
    
    const duration = parseInt(newHabitDuration) || 0;
    let endDate;
    if (duration > 0) {
      const d = new Date();
      d.setDate(d.getDate() + duration - 1);
      endDate = d.toISOString();
    }

    const optionsArray = newHabitType === 'MULTICHOICE'
      ? newHabitOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    await db.personalHabits.add({
      id: crypto.randomUUID(),
      studentId: currentUser.id,
      title: newHabitTitle.trim(),
      startDate: new Date().toISOString(),
      durationDays: duration > 0 ? duration : undefined,
      type: newHabitType,
      options: optionsArray && optionsArray.length > 0 ? optionsArray : undefined,
      ...(endDate && { endDate: endDate })
    });

    setNewHabitTitle('');
    setNewHabitDuration('0');
    setNewHabitType('BOOLEAN');
    setShowAddHabit(false);
    triggerSync();
  };

  // Query appointments: return all SCHEDULED appointments + appointments for selectedDate
  const appointments = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const allAppts = await db.appointments.where({ studentId: currentUser.id }).toArray();
      const selectedDateStart = new Date(selectedDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      const selectedDateEnd = new Date(selectedDate);
      selectedDateEnd.setHours(23, 59, 59, 999);
      
      return allAppts.filter(a => {
        if (a.status === 'SCHEDULED') return true;
        const d = new Date(a.date);
        return d >= selectedDateStart && d <= selectedDateEnd;
      });
    },
    [currentUser, selectedDate]
  );

  // Send new counseling request with 1-click modal
  const handleSendCounselingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const urgencyLabel = requestUrgency === 'URGENT' ? 'فوری / اضطراری' : requestUrgency === 'IMPORTANT' ? 'مهم' : 'عادی';

    // Update tag
    const student = await db.users.get(currentUser.id);
    if (student) {
      const currentTags = student.counselorTags || [];
      if (!currentTags.includes('CONSULT_NEEDED')) {
        await db.users.update(currentUser.id, { counselorTags: [...currentTags, 'CONSULT_NEEDED'] });
      }
    }

    // Add report
    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      studentId: currentUser.id,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: `درخواست مشاوره جدید توسط طلبه - موضوع: ${requestTopic} | درجه فوریت: ${urgencyLabel}${requestDesc.trim() ? ` | توضیحات: ${requestDesc.trim()}` : ''}`,
      isConfidential: true,
      synced: false
    });

    // Send official message to counselors & management
    const recipients = await db.users
      .filter(u => u.role === 'COUNSELOR' || u.role === 'DIRECTOR' || u.role === 'VICE_PRINCIPAL')
      .toArray();

    for (const r of recipients) {
      await db.messages.add({
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        recipientId: r.id,
        subject: `🚨 درخواست مشاوره جدید: ${currentUser.name} (${urgencyLabel})`,
        content: `طلبه ${currentUser.name} (پایه ${currentUser.base || 1}) درخواست مشاوره جدید ثبت کرده است.\n\n📌 موضوع: ${requestTopic}\n⚡ درجه فوریت: ${urgencyLabel}\n📝 توضیحات: ${requestDesc.trim() || 'بدون توضیح'}\n\nلطفاً جهت تعیین زمان جلسه اقدام فرمایید.`,
        date: new Date().toISOString(),
        type: 'OFFICIAL',
        isRead: false,
        synced: false
      });
    }

    setSuccessMsg('درخواست مشاوره شما با موفقیت ثبت شد و پیام اطلاع‌رسانی برای مشاور و مدیریت ارسال گردید.');
    setTimeout(() => setSuccessMsg(null), 5000);
    setShowRequestModal(false);
    setRequestDesc('');
    triggerSync();
  };

  // Confirm attendance & submit feedback
  const handleConfirmAttended = async () => {
    if (!attendedApptId || !currentUser) return;
    const appt = await db.appointments.get(attendedApptId);
    if (!appt) return;

    await db.appointments.update(attendedApptId, { status: 'ATTENDED' });

    const apptDateStr = new Date(appt.date).toLocaleDateString('fa-IR');
    const apptTimeStr = new Date(appt.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const reportContent = `تایید حضور در جلسه مشاوره (تاریخ ${apptDateStr} ساعت ${apptTimeStr})\nمیزان رضایت: ${satisfactionLevel}\nبازخورد طلبه: ${feedbackText.trim() || 'بدون بازخورد متنی'}`;

    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      studentId: currentUser.id,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: reportContent,
      isConfidential: true,
      synced: false
    });

    const managers = await db.users
      .filter(u => u.role === 'DIRECTOR' || u.role === 'VICE_PRINCIPAL' || u.role === 'COUNSELOR')
      .toArray();

    for (const m of managers) {
      await db.messages.add({
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        recipientId: m.id,
        subject: `📊 بازخورد جلسه مشاوره: ${currentUser.name}`,
        content: `طلبه ${currentUser.name} حضور خود در جلسه مشاوره (تاریخ ${apptDateStr} ساعت ${apptTimeStr}) را تایید کرد.\n\n⭐ میزان رضایت: ${satisfactionLevel}\n💬 بازخورد و نظر طلبه: ${feedbackText.trim() || 'بدون بازخورد متنی'}`,
        date: new Date().toISOString(),
        type: 'OFFICIAL',
        isRead: false,
        synced: false
      });
    }

    setAttendedApptId(null);
    setFeedbackText('');
    triggerSync();
  };

  // Confirm missed session & reason
  const handleConfirmMissed = async () => {
    if (!missedApptId || !currentUser) return;
    const appt = await db.appointments.get(missedApptId);
    if (!appt) return;

    const finalReason = presetMissedReason === 'سایر'
      ? (missedReasonInput.trim() || 'دلیل نامشخص')
      : presetMissedReason + (missedReasonInput.trim() ? ` - ${missedReasonInput.trim()}` : '');

    await db.appointments.update(missedApptId, {
      status: 'MISSED',
      cancelReason: finalReason,
      notes: finalReason
    });

    const apptDateStr = new Date(appt.date).toLocaleDateString('fa-IR');
    const apptTimeStr = new Date(appt.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const student = await db.users.get(currentUser.id);
    if (student) {
      let currentTags = student.counselorTags || [];
      if (!currentTags.includes('CONSULT_NEEDED')) {
        await db.users.update(currentUser.id, { counselorTags: [...currentTags, 'CONSULT_NEEDED'] });
      }
    }

    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      studentId: currentUser.id,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: `عدم حضور در جلسه مشاوره (تاریخ ${apptDateStr} ساعت ${apptTimeStr}) - علت: ${finalReason}`,
      isConfidential: true,
      synced: false
    });

    const staff = await db.users
      .filter(u => u.role === 'COUNSELOR' || u.role === 'DIRECTOR' || u.role === 'VICE_PRINCIPAL')
      .toArray();

    for (const s of staff) {
      await db.messages.add({
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        recipientId: s.id,
        subject: `🚨 عدم حضور در جلسه مشاوره: ${currentUser.name}`,
        content: `طلبه ${currentUser.name} (پایه ${currentUser.base || 1}) عدم حضور خود در جلسه مشاوره (تاریخ ${apptDateStr} ساعت ${apptTimeStr}) را ثبت کرد.\n\n❌ علت عدم شرکت: ${finalReason}\n\nطلبه نیازمند تعیین وقت جدید مشاوره است.`,
        date: new Date().toISOString(),
        type: 'OFFICIAL',
        isRead: false,
        synced: false
      });
    }

    setMissedApptId(null);
    setMissedReasonInput('');
    triggerSync();
  };

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  if (!assessment) return <div className="p-10 text-center text-slate-500">در حال بارگذاری فرم...</div>;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs font-bold px-4 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 shadow-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">خوداظهاری روزانه</h2>
            {isReadOnly && <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-xs font-bold px-2 py-1 rounded-lg">فقط مشاهده</span>}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">فرم ارزیابی فعالیت‌های تهذیبی و شخصی شما</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <MessageSquarePlus className="w-4 h-4 shrink-0" />
            <span>ثبت درخواست مشاوره جدید</span>
          </button>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-2xl border border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-1 ml-1">
              <button 
                type="button"
                onClick={() => setSelectedDate(todayDate)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${selectedDate === todayDate ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                امروز
              </button>
              <button 
                type="button"
                onClick={() => setSelectedDate(yesterdayDate)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${selectedDate === yesterdayDate ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                دیروز
              </button>
            </div>
            <DatePicker 
              calendar={persian} 
              locale={persian_fa} 
              value={new Date(selectedDate)}
              onChange={(dateObject) => {
                if (dateObject) {
                  setSelectedDate(format(dateObject.toDate(), 'yyyy-MM-dd'));
                }
              }}
              inputClass="border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-sm focus:ring-2 focus:ring-[#10B981] outline-none text-center w-32 font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Editing Status Banner */}
      {!isReadOnly ? (
        <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200 shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              امکان ثبت، ویرایش و اصلاح اطلاعات برای ارزیابی «امروز» و «دیروز» فعال است. هر زمان متوجه اشتباه شدید می‌توانید موارد را اصلاح کنید.
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              ثبت و ویرایش وضعیت ارزیابی مربوط به امروز و دیروز می‌باشد (اطلاعات این تاریخ فقط قابل مشاهده است).
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        
        {/* Appointments Section */}
        {appointments && appointments.length > 0 && (
          <div className="bg-amber-50/80 dark:bg-amber-950/40 rounded-3xl shadow-sm border border-amber-200 dark:border-amber-900/60 overflow-hidden mb-2">
            <div className="p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-amber-200/60 dark:border-amber-900/40 pb-3">
                <h3 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2 text-base">
                  <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span>جلسات مشاوره و قرار ملاقات‌ها</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRequestModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>درخواست مشاوره جدید</span>
                </button>
              </div>

              <div className="space-y-3">
                {appointments.map(appt => {
                  const apptDateObj = new Date(appt.date);
                  const isFutureAppt = apptDateObj.getTime() > new Date().getTime();
                  const faDateStr = apptDateObj.toLocaleDateString('fa-IR');
                  const faTimeStr = apptDateObj.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={appt.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                              وقت مشاوره - تاریخ {faDateStr} ساعت {faTimeStr}
                            </p>
                          </div>
                          {appt.status === 'SCHEDULED' && isFutureAppt && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                              زمان این جلسه هنوز فرا نرسیده است (در انتظار برگزاری). ثبت وضعیت حضور بعد از ساعت مشاوره فعال خواهد شد.
                            </p>
                          )}
                          {appt.status === 'SCHEDULED' && !isFutureAppt && (
                            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mt-1">
                              آیا در این جلسه مشاوره شرکت کردید؟ لطفاً وضعیت را ثبت کنید:
                            </p>
                          )}
                          {appt.status === 'ATTENDED' && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              شرکت کردید (حضور تایید شده)
                            </p>
                          )}
                          {appt.status === 'MISSED' && (
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-1 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              برگزار نشد {appt.cancelReason || appt.notes ? `- علت: ${appt.cancelReason || appt.notes}` : ''}
                            </p>
                          )}
                        </div>

                        {appt.status === 'SCHEDULED' && !isFutureAppt && (
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setAttendedApptId(appt.id);
                                setMissedApptId(null);
                                setSatisfactionLevel('عالی');
                                setFeedbackText('');
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                            >
                              حضور داشتم
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMissedApptId(appt.id);
                                setAttendedApptId(null);
                                setPresetMissedReason('تداخل با کلاس یا امتحانات');
                                setMissedReasonInput('');
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
                            >
                              عدم حضور
                            </button>
                          </div>
                        )}

                        {(appt.status === 'ATTENDED' || appt.status === 'MISSED') && (
                          <button
                            type="button"
                            onClick={() => setShowRequestModal(true)}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            درخواست تعیین وقت مجدد
                          </button>
                        )}
                      </div>

                      {/* Attended Feedback Form */}
                      {attendedApptId === appt.id && (
                        <div className="mt-2 p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col gap-3 animate-in fade-in duration-150">
                          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                            <span>ثبت بازخورد و ارزیابی جلسه مشاوره</span>
                          </p>
                          
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">میزان رضایت شما از جلسه:</label>
                            <div className="flex flex-wrap gap-2">
                              {['عالی', 'خوب', 'متوسط', 'نیازمند پیگیری مجدد'].map(level => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => setSatisfactionLevel(level)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                    satisfactionLevel === level
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">بازخورد و نکات شما (جهت ارسال به مدیریت و مشاور):</label>
                            <textarea
                              className="w-full border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-20 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              placeholder="بازخورد، راهکارها یا نظرات خود را بنویسید..."
                            />
                          </div>

                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setAttendedApptId(null)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                            >
                              انصراف
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmAttended}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                            >
                              ثبت و ارسال بازخورد
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Missed Session Reason Form */}
                      {missedApptId === appt.id && (
                        <div className="mt-2 p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex flex-col gap-3 animate-in fade-in duration-150">
                          <p className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>علت عدم شرکت در جلسه مشاوره:</span>
                          </p>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">علت اصلی:</label>
                            <select
                              value={presetMissedReason}
                              onChange={e => setPresetMissedReason(e.target.value)}
                              className="w-full bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                            >
                              <option value="تداخل با کلاس یا امتحانات">تداخل با کلاس، آزمون یا برنامه‌های مدرسه‌ای</option>
                              <option value="بیماری یا مشکل شخصی">بیماری یا مشکل شخصی اضطراری</option>
                              <option value="فراموشی یا عدم اطلاع رسانی">فراموشی یا عدم اطلاع از زمان دقیق</option>
                              <option value="لغو یا عدم امکان توسط مشاور">لغو یا عدم امکان توسط مشاور</option>
                              <option value="سایر">سایر موارد (توضیح در زیر)</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">توضیحات تکمیلی (اختیاری):</label>
                            <textarea
                              className="w-full border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-xs focus:ring-2 focus:ring-rose-500 outline-none resize-none h-20 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              value={missedReasonInput}
                              onChange={(e) => setMissedReasonInput(e.target.value)}
                              placeholder="توضیح بیشتر یا علت عدم حضور..."
                            />
                          </div>

                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setMissedApptId(null)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                            >
                              انصراف
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmMissed}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
                            >
                              ثبت علت و اطلاع به مشاور
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Core Prayers Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-emerald-100 dark:border-slate-800 overflow-hidden">
          <button 
            onClick={() => toggleSection('prayers')}
            className="w-full flex justify-between items-center p-5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <h3 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              نمازهای یومیه
              {!assessment.synced && <CloudOff className="w-4 h-4 text-amber-500" title="آفلاین - در انتظار همگام‌سازی" />}
            </h3>
            {expandedSection === 'prayers' ? <ChevronUp className="w-5 h-5 text-emerald-700 dark:text-emerald-300" /> : <ChevronDown className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />}
          </button>
          
          {expandedSection === 'prayers' && (
            <div className="p-5 space-y-3">
              {[
                { id: 'namazSobh', label: 'نماز صبح' },
                { id: 'namazZohr', label: 'نماز ظهر' },
                { id: 'namazAsr', label: 'نماز عصر' },
                { id: 'namazMaghreb', label: 'نماز مغرب' },
                { id: 'namazEsha', label: 'نماز عشاء' }
              ].map(prayer => (
                <div key={prayer.id} className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex justify-between items-center md:w-1/3">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{prayer.label}</span>
                    <select
                      className="border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium min-w-[120px]"
                      value={(assessment as any)[prayer.id] || 'NONE'}
                      onChange={(e) => updatePrayer(prayer.id, e.target.value as PrayerStatus)}
                    >
                      {prayerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <input 
                    type="text" 
                    placeholder="توضیحات و عذر شرعی (اختیاری)"
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl p-2 text-xs outline-none focus:border-emerald-500"
                    value={assessment.notes?.[prayer.id] || ''}
                    onChange={(e) => updateNote(prayer.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Standard Tasks Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-blue-100 dark:border-slate-800 overflow-hidden">
          <button 
            onClick={() => toggleSection('standard')}
            className="w-full flex justify-between items-center p-5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100/50 dark:hover:bg-blue-900/50 transition-colors"
          >
            <h3 className="font-bold text-blue-900 dark:text-blue-200">سایر برنامه‌های تهذیبی</h3>
            {expandedSection === 'standard' ? <ChevronUp className="w-5 h-5 text-blue-700 dark:text-blue-300" /> : <ChevronDown className="w-5 h-5 text-blue-700 dark:text-blue-300" />}
          </button>
          
          {expandedSection === 'standard' && (
            <div className="p-5 space-y-3">
              {[
                { id: 'saharKhizi', label: 'سحرخیزی و تهجد (پیش از اذان صبح)', type: 'check' },
                { id: 'telavatNoor', label: 'تلاوت نور (استماع و همخوانی قرآن)', type: 'check' },
                { id: 'classAttendance', label: 'حضور کامل در کلاس‌ها', type: 'select' },
                { id: 'mabahese', label: 'حضور در مباحثه علمی', type: 'select' },
                { id: 'earlySleep', label: 'خواب اول شب (رعایت خاموشی)', type: 'check' }
              ].map(task => {
                const currentVal = (assessment as any)[task.id];
                return (
                  <div key={task.id} className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center justify-between md:justify-start gap-3 md:w-5/12">
                      <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">{task.label}:</span>
                      {task.type === 'check' ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateField(task.id as keyof Assessment, true)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              currentVal === true
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>انجام شد</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateField(task.id as keyof Assessment, false)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              currentVal === false
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>انجام نشد</span>
                          </button>
                        </div>
                      ) : (
                        <select
                          className="border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium shrink-0"
                          value={currentVal === true ? 'FULL' : (currentVal || 'NONE')}
                          onChange={(e) => updateField(task.id as keyof Assessment, e.target.value)}
                        >
                          <option value="NONE">ثبت نشده / انجام نشده</option>
                          <option value="FULL">کامل</option>
                          <option value="PARTIAL">ناقص</option>
                        </select>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder={task.type === 'select' && (currentVal === 'PARTIAL' || currentVal === 'NONE') ? 'توضیحات (الزامی)' : 'توضیحات و علت (اختیاری)'}
                      className={`flex-1 bg-white dark:bg-slate-800 border ${task.type === 'select' && (currentVal === 'PARTIAL' || currentVal === 'NONE') && !(assessment.notes?.[task.id]?.trim()) ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'} rounded-xl p-2 text-xs outline-none text-slate-800 dark:text-slate-100`}
                      value={assessment.notes?.[task.id] || ''}
                      onChange={(e) => updateNote(task.id, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Personal Habits Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-violet-100 dark:border-slate-800 overflow-hidden">
          <button 
            onClick={() => toggleSection('custom')}
            className="w-full flex justify-between items-center p-5 bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100/50 dark:hover:bg-violet-900/50 transition-colors"
          >
            <h3 className="font-bold text-violet-900 dark:text-violet-200">عناوین شخصی و محرمانه</h3>
            {expandedSection === 'custom' ? <ChevronUp className="w-5 h-5 text-violet-700 dark:text-violet-300" /> : <ChevronDown className="w-5 h-5 text-violet-700 dark:text-violet-300" />}
          </button>
          
          {expandedSection === 'custom' && (
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="bg-violet-100/50 dark:bg-violet-950/60 rounded-xl p-3 flex items-start gap-2 text-[10px] sm:text-xs text-violet-800 dark:text-violet-200 leading-relaxed flex-1 ml-4 border border-violet-200/50 dark:border-violet-900/50">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>این بخش کاملاً خصوصی است. عناوین و وضعیت آنها فقط برای شما قابل مشاهده است.</p>
                </div>
                <button 
                  onClick={() => setShowAddHabit(!showAddHabit)}
                  className="bg-violet-600 text-white p-2.5 rounded-xl hover:bg-violet-500 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {showAddHabit && (
                <form onSubmit={handleAddHabit} className="flex flex-col gap-3 mb-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      placeholder="عنوان برنامه شخصی (مثلاً: چله زیارت عاشورا)..."
                      className="flex-1 border border-violet-200 dark:border-violet-800 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-violet-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      value={newHabitTitle}
                      onChange={(e) => setNewHabitTitle(e.target.value)}
                      required
                    />
                    <select 
                      className="border border-violet-200 dark:border-violet-800 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-violet-500 outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 min-w-[140px] font-bold"
                      value={newHabitDuration}
                      onChange={(e) => setNewHabitDuration(e.target.value)}
                    >
                      <option value="0">بدون محدودیت زمان</option>
                      <option value="7">یک هفته (۷ روز)</option>
                      <option value="14">دو هفته (۱۴ روز)</option>
                      <option value="21">سه هفته (۲۱ روز)</option>
                      <option value="30">یک ماه (۳۰ روز)</option>
                      <option value="40">دوره اربعین (۴۰ روز)</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">نوع پاسخ‌دهی:</span>
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 font-bold cursor-pointer">
                        <input 
                          type="radio" 
                          name="habitType"
                          value="BOOLEAN"
                          checked={newHabitType === 'BOOLEAN'}
                          onChange={() => setNewHabitType('BOOLEAN')}
                          className="text-violet-600 focus:ring-violet-500"
                        />
                        <span>تیک و ضربدر (انجام/عدم انجام)</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 font-bold cursor-pointer">
                        <input 
                          type="radio" 
                          name="habitType"
                          value="MULTICHOICE"
                          checked={newHabitType === 'MULTICHOICE'}
                          onChange={() => setNewHabitType('MULTICHOICE')}
                          className="text-violet-600 focus:ring-violet-500"
                        />
                        <span>چند گزینه‌ای</span>
                      </label>
                    </div>

                    {newHabitType === 'MULTICHOICE' && (
                      <input 
                        type="text" 
                        placeholder="گزینه‌ها (با کاما جدا کنید، مثلا: عالی, خوب, متوسط, انجام نشد)"
                        className="flex-1 border border-violet-200 dark:border-violet-800 rounded-xl p-2 text-xs outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                        value={newHabitOptions}
                        onChange={(e) => setNewHabitOptions(e.target.value)}
                      />
                    )}

                    <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs mr-auto">
                      ثبت عنوان
                    </button>
                  </div>
                </form>
              )}
              
              <div className="space-y-3">
                {myHabits?.length === 0 && !showAddHabit && (
                  <p className="text-xs text-violet-400 dark:text-violet-300 text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 dashed">هنوز عنوان شخصی ثبت نکرده‌اید.</p>
                )}
                {myHabits?.map(habit => {
                  const info = getHabitRemainingInfo(habit);
                  const currentVal = assessment.customTasks?.[habit.id];

                  return (
                    <div key={habit.id} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:w-5/12">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{habit.title}</span>
                          {/* Edit / Delete Habit Buttons */}
                          <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleStartEditHabit(habit)}
                              className="text-slate-400 hover:text-violet-600 dark:hover:text-violet-300 p-1 hover:bg-violet-50 dark:hover:bg-violet-950/50 rounded-lg transition-colors"
                              title="ویرایش عنوان شخصی"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHabit(habit.id)}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                              title="حذف عنوان شخصی"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 w-fit ${
                          info.isCourse 
                            ? 'bg-violet-100 dark:bg-violet-950/70 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-transparent'
                        }`}>
                          {info.label}
                        </span>
                      </div>

                      {/* Controls for completion */}
                      <div className="flex items-center gap-2">
                        {(!habit.type || habit.type === 'BOOLEAN') ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateCustomTask(habit.id, true, habit)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                currentVal === true
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>انجام شد</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateCustomTask(habit.id, false, habit)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                currentVal === false
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                              <span>انجام نشد</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(habit.options && habit.options.length > 0 ? habit.options : ['عالی', 'خوب', 'متوسط', 'انجام نشد']).map((opt: string) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => updateCustomTask(habit.id, opt, habit)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                  currentVal === opt
                                    ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <input 
                        type="text" 
                        placeholder="توضیحات (اختیاری)"
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl p-2 text-xs outline-none focus:border-violet-500 min-w-[120px]"
                        value={assessment.notes?.[habit.id] || ''}
                        onChange={(e) => updateNote(habit.id, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>

              {/* EDIT HABIT MODAL */}
              {editingHabit && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4 dir-rtl">
                  <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        <h3 className="font-bold text-base">ویرایش عنوان شخصی و چله</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingHabit(null)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveEditHabit} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          عنوان برنامه شخصی:
                        </label>
                        <input
                          type="text"
                          value={editHabitTitle}
                          onChange={e => setEditHabitTitle(e.target.value)}
                          className="w-full border border-violet-200 dark:border-violet-800 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-violet-500 outline-none bg-slate-50 dark:bg-slate-800"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          مدت زمان (روز):
                        </label>
                        <select
                          value={editHabitDuration}
                          onChange={e => setEditHabitDuration(e.target.value)}
                          className="w-full border border-violet-200 dark:border-violet-800 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-violet-500 outline-none bg-slate-50 dark:bg-slate-800"
                        >
                          <option value="0">بدون محدودیت زمان</option>
                          <option value="7">یک هفته (۷ روز)</option>
                          <option value="14">دو هفته (۱۴ روز)</option>
                          <option value="21">سه هفته (۲۱ روز)</option>
                          <option value="30">یک ماه (۳۰ روز)</option>
                          <option value="40">دوره اربعین (۴۰ روز)</option>
                        </select>
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          نوع پاسخ‌دهی:
                        </span>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                            <input
                              type="radio"
                              name="editHabitType"
                              value="BOOLEAN"
                              checked={editHabitType === 'BOOLEAN'}
                              onChange={() => setEditHabitType('BOOLEAN')}
                              className="text-violet-600"
                            />
                            <span>دو حالته (انجام / عدم انجام)</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                            <input
                              type="radio"
                              name="editHabitType"
                              value="MULTICHOICE"
                              checked={editHabitType === 'MULTICHOICE'}
                              onChange={() => setEditHabitType('MULTICHOICE')}
                              className="text-violet-600"
                            />
                            <span>چند گزینه‌ای</span>
                          </label>
                        </div>
                      </div>

                      {editHabitType === 'MULTICHOICE' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            گزینه‌ها (با کاما جدا کنید):
                          </label>
                          <input
                            type="text"
                            value={editHabitOptions}
                            onChange={e => setEditHabitOptions(e.target.value)}
                            className="w-full border border-violet-200 dark:border-violet-800 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-violet-500 outline-none bg-slate-50 dark:bg-slate-800"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingHabit(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                          انصراف
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md"
                        >
                          ذخیره تغییرات
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Screen Time & Digital Wellbeing Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-indigo-100 dark:border-slate-800 overflow-hidden">
          <button 
            type="button"
            onClick={() => toggleSection('screentime')}
            className="w-full flex justify-between items-center p-5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
          >
            <h3 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>پایش و خوداظهاری میزان استفاده از گوشی (رفاه دیجیتال)</span>
            </h3>
            {expandedSection === 'screentime' ? <ChevronUp className="w-5 h-5 text-indigo-700 dark:text-indigo-300" /> : <ChevronDown className="w-5 h-5 text-indigo-700 dark:text-indigo-300" />}
          </button>
          
          {expandedSection === 'screentime' && (
            <div className="p-5">
              <ScreenTimeTracker />
            </div>
          )}
        </div>

      </div>

      {/* Explicit Save Assessment Action Bar */}
      {!isReadOnly && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-lg border border-emerald-200 dark:border-emerald-800/80 flex flex-col sm:flex-row justify-between items-center gap-3 sticky bottom-4 z-10 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>تغییرات شما در تمام گزینه‌ها ذخیره می‌شود و تا پایان مهلت زمانی مجاز قابل ویرایش و اصلاح مجدد است.</span>
          </div>
          <button
            type="button"
            onClick={handleSaveEntireAssessment}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>ثبت و ذخیره نهایی ارزیابی</span>
          </button>
        </div>
      )}

      {/* Course Reset Confirmation Modal */}
      {courseToReset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base">
                <AlertCircle className="w-5 h-5" />
                <span>تعیین وضعیت دوره / چله</span>
              </div>
              <button
                type="button"
                onClick={() => setCourseToReset(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                شما عدم انجام برای عنوان «{courseToReset.title}» ({courseToReset.durationDays} روزه) را ثبت کردید.
              </p>
              <p>
                آیا می‌خواهید این دوره/چله از امروز مجدداً از روز ۱ شروع شود یا همین دوره را ادامه می‌دهید؟
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleResetCourseStartDate(courseToReset)}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm text-center"
              >
                شروع مجدد از روز اول (ریست دوره)
              </button>
              <button
                type="button"
                onClick={() => setCourseToReset(null)}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                ادامه دوره بدون ریست
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Counseling Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base">
                <MessageSquarePlus className="w-5 h-5" />
                <span>ثبت درخواست مشاوره جدید</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendCounselingRequest} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">موضوع مشاوره:</label>
                <select
                  value={requestTopic}
                  onChange={e => setRequestTopic(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                >
                  <option value="مشاوره تحصیلی و برنامه‌ریزی درسی">مشاوره تحصیلی و برنامه‌ریزی درسی</option>
                  <option value="مشاوره اخلاقی و تهذیبی">مشاوره اخلاقی و تهذیبی</option>
                  <option value="مشاوره خانوادگی و شخصی">مشاوره خانوادگی و شخصی</option>
                  <option value="مشاوره روحی، انگیزشی و استرس">مشاوره روحی، انگیزشی و استرس</option>
                  <option value="سایر موارد">سایر موارد</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">درجه فوریت:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'NORMAL', label: 'عادی' },
                    { id: 'IMPORTANT', label: 'مهم' },
                    { id: 'URGENT', label: 'فوری / اضطراری' }
                  ].map(urg => (
                    <button
                      type="button"
                      key={urg.id}
                      onClick={() => setRequestUrgency(urg.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                        requestUrgency === urg.id
                          ? 'ring-2 ring-indigo-600 bg-indigo-600 text-white font-black'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {urg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">توضیحات تکمیلی (علت درخواست یا نکات لازم):</label>
                <textarea
                  value={requestDesc}
                  onChange={e => setRequestDesc(e.target.value)}
                  placeholder="خلاصه‌ای از علت درخواست یا نکات مورد نظر شما..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 min-h-[90px] resize-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md shadow-indigo-600/25 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ثبت و ارسال به مشاور</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
