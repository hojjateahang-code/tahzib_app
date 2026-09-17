import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, AlertCircle, Phone, Eye, BarChart2, Smartphone } from 'lucide-react';
import { triggerSync } from '../../sync';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { useAuth } from '../../store';
import { StudentDetailModal } from '../common/StudentDetailModal';


export const AVAILABLE_TAGS = [
  { id: 'URGENT', label: 'نیازمند اقدام فوری', color: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800', weight: 4 },
  { id: 'CONSULT_NEEDED', label: 'لزوم مراجعه به مشاوره', color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', weight: 3 },
  { id: 'FOLLOW_UP', label: 'پیگیری', color: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', weight: 2 },
  { id: 'IMPROVED', label: 'بهبود یافته', color: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', weight: 1 }
];

export function CounselorStudents() {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentForAppt, setSelectedStudentForAppt] = useState<string | null>(null);
  const [apptDate, setApptDate] = useState<any>(null);
  const [apptTime, setApptTime] = useState<string>('10:00');
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  
  // State for missed appointment reason modal
  const [missedApptIdForReason, setMissedApptIdForReason] = useState<string | null>(null);
  const [missedReasonInput, setMissedReasonInput] = useState<string>('');
  const [presetReason, setPresetReason] = useState<string>('عدم حضور طلبه');
  
  const students = useLiveQuery(() => db.users.where('role').equals('STUDENT').toArray());
  const appointments = useLiveQuery(() => db.appointments.toArray());

  const filteredStudents = React.useMemo(() => {
    if (!students) return [];
    
    // Sort logic: higher weight tags first
    const sorted = [...students].sort((a, b) => {
      const aMaxWeight = Math.max(0, ...(a.counselorTags?.map(t => AVAILABLE_TAGS.find(at => at.id === t)?.weight || 0) || []));
      const bMaxWeight = Math.max(0, ...(b.counselorTags?.map(t => AVAILABLE_TAGS.find(at => at.id === t)?.weight || 0) || []));
      return bMaxWeight - aMaxWeight;
    });

    return sorted.filter(student => {
      const q = searchQuery.toLowerCase();
      return (
        (student.name && student.name.toLowerCase().includes(q)) ||
        (student.nationalId && student.nationalId.includes(q))
      );
    });
  }, [students, searchQuery]);

  const toggleTag = async (studentId: string, tagId: string) => {
    const student = students?.find(s => s.id === studentId);
    if (!student) return;

    let currentTags = student.counselorTags || [];
    const tagInfo = AVAILABLE_TAGS.find(t => t.id === tagId);
    let action = '';

    if (currentTags.includes(tagId)) {
      currentTags = currentTags.filter(t => t !== tagId);
      action = 'حذف شد';
    } else {
      currentTags = [...currentTags, tagId];
      action = 'اضافه شد';
    }

    await db.users.update(studentId, { counselorTags: currentTags });

    if (tagInfo) {
      await db.reports.add({
        id: crypto.randomUUID(),
        authorId: currentUser?.id || 'system',
        studentId: studentId,
        type: 'COUNSELING_SESSION',
        date: new Date().toISOString(),
        content: `تغییر وضعیت: برچسب "${tagInfo.label}" ${action}`,
        isConfidential: true,
        synced: false
      });
    }

    triggerSync();
  };

  const handleScheduleAppt = async () => {
    if (!currentUser || !selectedStudentForAppt || !apptDate || !apptTime) return;
    
    const localDate = apptDate.toDate();
    const [hours, minutes] = apptTime.split(':').map(Number);
    localDate.setHours(hours, minutes, 0, 0);
    const isoDate = localDate.toISOString();
    
    await db.appointments.add({
      id: crypto.randomUUID(),
      studentId: selectedStudentForAppt,
      counselorId: currentUser.id,
      date: isoDate,
      status: 'SCHEDULED'
    });
    
    // Also add a general report that an appointment was scheduled for notifications
    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      studentId: selectedStudentForAppt,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: `تعیین وقت مشاوره برای تاریخ ${apptDate.format('YYYY/MM/DD')} ساعت ${apptTime}`,
      isConfidential: false,
      synced: false
    });

    setApptDate(null);
    setSelectedStudentForAppt(null);
    setSuccessMessage('وقت مشاوره با موفقیت ثبت شد و به طلبه اطلاع‌رسانی خواهد شد.');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
    triggerSync();
  };

  const handleMarkApptStatus = async (apptId: string, status: 'ATTENDED' | 'MISSED') => {
    if (status === 'MISSED') {
      setMissedApptIdForReason(apptId);
      setPresetReason('عدم حضور طلبه');
      setMissedReasonInput('');
      return;
    }

    const appt = await db.appointments.get(apptId);
    if (!appt) return;

    await db.appointments.update(apptId, { status: 'ATTENDED' });

    const apptDateStr = new Date(appt.date).toLocaleDateString('fa-IR');
    const apptTimeStr = new Date(appt.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: currentUser?.id || 'system',
      studentId: appt.studentId,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: `تایید وضعیت جلسه مشاوره: برگزار شد (تاریخ ${apptDateStr} ساعت ${apptTimeStr})`,
      isConfidential: true,
      synced: false
    });

    const studentObj = await db.users.get(appt.studentId);
    if (studentObj && studentObj.counselorTags?.includes('CONSULT_NEEDED')) {
      const newTags = studentObj.counselorTags.filter(t => t !== 'CONSULT_NEEDED');
      if (!newTags.includes('FOLLOW_UP') && !newTags.includes('IMPROVED')) {
        newTags.push('FOLLOW_UP');
      }
      await db.users.update(appt.studentId, { counselorTags: newTags });
    }

    triggerSync();
  };

  const handleConfirmMissed = async () => {
    if (!missedApptIdForReason) return;
    const finalReason = presetReason === 'سایر' 
      ? (missedReasonInput.trim() || 'دلیل نامشخص')
      : presetReason + (missedReasonInput.trim() ? ` - ${missedReasonInput.trim()}` : '');

    const appt = await db.appointments.get(missedApptIdForReason);
    if (!appt) return;

    await db.appointments.update(missedApptIdForReason, { 
      status: 'MISSED', 
      cancelReason: finalReason,
      notes: finalReason 
    });

    const apptDateStr = new Date(appt.date).toLocaleDateString('fa-IR');
    const apptTimeStr = new Date(appt.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: currentUser?.id || 'system',
      studentId: appt.studentId,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: `تایید وضعیت جلسه مشاوره: برگزار نشد (تاریخ ${apptDateStr} ساعت ${apptTimeStr}) - علت: ${finalReason}`,
      isConfidential: true,
      synced: false
    });

    setMissedApptIdForReason(null);
    setMissedReasonInput('');
    triggerSync();
  };

  const nowTime = Date.now();

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header with Backdrop Blur */}
      <div className="sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md py-4 border-b border-slate-200/60 dark:border-slate-800/60 mb-6 px-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between max-w-7xl mx-auto">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">مدیریت و پایش طلاب (پنل مشاوره)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">تعیین وقت مشاوره جدید، مدیریت وضعیت جلسات و افزودن برچسب‌های فوریت در پرونده طلاب</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="جستجو بر اساس نام یا کد ملی..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 shadow-2xs"
            />
          </div>
        </div>

        {/* Inline Success Alert Toast */}
        {successMessage && (
          <div className="max-w-7xl mx-auto mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs font-bold px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 pb-12">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="space-y-4">
          {filteredStudents.length === 0 && (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">طلبه‌ای با این مشخصات یافت نشد.</p>
          )}
          
          {filteredStudents.map(student => {
            const studentAppts = appointments?.filter(a => a.studentId === student.id) || [];
            const upcomingAppts = studentAppts.filter(a => a.status === 'SCHEDULED' && new Date(a.date).getTime() >= nowTime);
            const pastPendingAppts = studentAppts.filter(a => a.status === 'SCHEDULED' && new Date(a.date).getTime() < nowTime);
            const pastCompletedAppts = studentAppts.filter(a => a.status === 'ATTENDED' || a.status === 'MISSED');

            return (
              <div key={student.id} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center w-full">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setViewStudentId(student.id)}
                        className="font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline text-sm flex items-center gap-1 cursor-pointer"
                        title="مشاهده کارنامه و پرونده کامل"
                      >
                        <Eye className="w-4 h-4" />
                        <span>{student.name}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewStudentId(student.id)}
                        className="px-2.5 py-1 bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl font-bold text-[11px] flex items-center gap-1.5 hover:bg-indigo-200/80 dark:hover:bg-indigo-900 transition-colors cursor-pointer shadow-2xs"
                        title="رصد و پایش وضعیت کامل و نمودار مصرف گوشی"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>رصد کامل و آمار گوشی</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 items-center">
                      <span>کد ملی: {student.nationalId || 'ثبت نشده'}</span>
                      <span>پایه: {student.base || 'نامشخص'}</span>
                      {student.phone && (
                        <a
                          href={`tel:${student.phone.replace(/[^0-9+]/g, '')}`}
                          className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 dir-ltr cursor-pointer"
                          title="تماس تلفنی"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{student.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  
                  <div className="flex flex-wrap gap-2 items-center justify-end">
                    {AVAILABLE_TAGS.map(tag => {
                      const isActive = student.counselorTags?.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(student.id, tag.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                            isActive 
                              ? tag.color 
                              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isActive && <CheckCircle2 className="w-3 h-3 text-current" />}
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Appointments Display Section */}
                <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 w-full">
                  {/* Past Pending Appointments Inquiry */}
                  {pastPendingAppts.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-300 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200">
                      <div className="flex items-center gap-1.5 font-bold mb-2 text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>استعلام وضعیت وقت‌های گذشته (برگزار شده / نشده؟):</span>
                      </div>
                      <div className="space-y-2">
                        {pastPendingAppts.map(a => (
                          <div key={a.id} className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200 dir-rtl">
                              {new Date(a.date).toLocaleDateString('fa-IR')} - ساعت {new Date(a.date).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">آیا برگزار شد؟</span>
                              <button
                                type="button"
                                onClick={() => handleMarkApptStatus(a.id, 'ATTENDED')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                برگزار شد
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkApptStatus(a.id, 'MISSED')}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                برگزار نشد
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upcoming Scheduled Appointments */}
                  {upcomingAppts.length > 0 && (
                    <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200">
                      <div className="flex items-center gap-1.5 font-bold mb-2 text-indigo-800 dark:text-indigo-300">
                        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>وقت‌های در انتظار برگزاری (آینده):</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {upcomingAppts.map(a => (
                          <span key={a.id} className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                            {new Date(a.date).toLocaleDateString('fa-IR')} - ساعت {new Date(a.date).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed / Missed History */}
                  {pastCompletedAppts.length > 0 && (
                    <div className="bg-slate-100/80 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-400 block mb-1.5 text-[11px]">سوابق وقت‌های تعیین‌شده:</span>
                      <div className="flex flex-wrap gap-2">
                        {pastCompletedAppts.map(a => (
                          <span
                            key={a.id}
                            className={`px-2.5 py-1 rounded-xl border font-bold text-[11px] flex items-center gap-1 ${
                              a.status === 'ATTENDED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {a.status === 'ATTENDED' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>برگزار شد ({new Date(a.date).toLocaleDateString('fa-IR')})</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>
                                  برگزار نشد ({new Date(a.date).toLocaleDateString('fa-IR')})
                                  {(a.cancelReason || a.notes) && ` - علت: ${a.cancelReason || a.notes}`}
                                </span>
                              </>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schedule Appointment Action */}
                  <div className="self-end mt-1">
                    {selectedStudentForAppt === student.id ? (
                      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-xs">
                        <DatePicker 
                          calendar={persian} 
                          locale={persian_fa}
                          format="YYYY/MM/DD"
                          value={apptDate}
                          onChange={setApptDate}
                          inputClass="border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none w-32 text-center bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                          placeholder="انتخاب تاریخ"
                        />
                        <input 
                          type="time" 
                          value={apptTime}
                          onChange={(e) => setApptTime(e.target.value)}
                          className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none w-24 text-center bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        />
                        <button type="button" onClick={handleScheduleAppt} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer">ثبت وقت</button>
                        <button type="button" onClick={() => setSelectedStudentForAppt(null)} className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer">لغو</button>
                      </div>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => setSelectedStudentForAppt(student.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors border border-emerald-200 dark:border-emerald-800/80 cursor-pointer shadow-xs"
                      >
                        <CalendarIcon className="w-4 h-4" />
                        تعیین وقت مشاوره جدید
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

      {/* Missed Appointment Reason Modal */}
      {missedApptIdForReason && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base">
              <AlertCircle className="w-5 h-5" />
              <span>ثبت علت عدم برگزاری جلسه مشاوره</span>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300">
              لطفاً علت اصلی عدم برگزاری جلسه را مشخص کنید تا در پرونده مشاوره طلبه ثبت گردد:
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">علت اصلی:</label>
              <select
                value={presetReason}
                onChange={e => setPresetReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
              >
                <option value="عدم حضور طلبه">عدم حضور طلبه (بدون هماهنگی قبلی)</option>
                <option value="لغو توسط طلبه با اطلاع قبلی">لغو توسط طلبه با اطلاع قبلی</option>
                <option value="لغو یا عدم امکان مشاور">لغو یا عدم امکان توسط مشاور</option>
                <option value="تداخل با کلاس یا امتحانات">تداخل با کلاس یا برنامه‌های مدرسه‌ای</option>
                <option value="سایر">سایر موارد (توضیح در زیر)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">توضیحات تکمیلی (اختیاری):</label>
              <textarea
                value={missedReasonInput}
                onChange={e => setMissedReasonInput(e.target.value)}
                placeholder="توضیح بیشتر در صورت نیاز..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-rose-500 min-h-[80px] resize-none text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setMissedApptIdForReason(null);
                  setMissedReasonInput('');
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmMissed}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                ثبت و نهایی‌سازی
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Student Detail Modal */}
      <StudentDetailModal
        studentId={viewStudentId}
        onClose={() => setViewStudentId(null)}
      />
    </div>
  );
}


