import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAuth } from '../../store';
import { PersonalHabit } from '../../types';
import { Check, X, Flame, Award, Printer, Download } from 'lucide-react';

export function PersonalHabitCourseTable({ studentId }: { studentId?: string }) {
  const { currentUser } = useAuth();
  const targetStudentId = studentId || currentUser?.id;

  // Personal habits & chilleh table is strictly confidential to the student.
  // Supervisors/Managers/Officials must NOT see or export this table.
  if (currentUser?.role !== 'STUDENT') {
    return null;
  }

  const habits = useLiveQuery(
    async () => {
      if (!targetStudentId) return [];
      const all = await db.personalHabits.where('studentId').equals(targetStudentId).toArray();
      // Only habits with duration
      return all.filter(h => h.durationDays && h.durationDays > 0);
    },
    [targetStudentId]
  );

  const assessments = useLiveQuery(
    async () => {
      if (!targetStudentId) return [];
      return db.assessments.where('studentId').equals(targetStudentId).toArray();
    },
    [targetStudentId]
  );

  if (!habits || habits.length === 0) {
    return null;
  }

  const assessmentMap = new Map<string, any>();
  assessments?.forEach(a => assessmentMap.set(a.date, a));

  const todayStr = new Date().toISOString().split('T')[0];

  const handleExportCSV = () => {
    let csvContent = "\uFEFFعنوان دوره,روز,تاریخ,وضعیت\n";
    habits.forEach(habit => {
      const totalDays = habit.durationDays || 40;
      const startDateObj = new Date(habit.startDate);
      for (let i = 0; i < totalDays; i++) {
        const dayDateObj = new Date(startDateObj);
        dayDateObj.setDate(startDateObj.getDate() + i);
        const dateStr = dayDateObj.toISOString().split('T')[0];
        const assessment = assessmentMap.get(dateStr);
        const val = assessment?.customTasks?.[habit.id];

        let statusText = 'ثبت نشده';
        if (dateStr > todayStr) statusText = 'آینده';
        else if (val === true || (typeof val === 'string' && val.length > 0 && val !== 'انجام نشد')) statusText = typeof val === 'string' ? val : 'انجام شد';
        else if (val === false || val === 'انجام نشد') statusText = 'انجام نشد';

        csvContent += `"${habit.title}",روز ${i + 1},${dateStr},"${statusText}"\n`;
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `chilleh_report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-violet-100 dark:border-slate-800 p-5 mt-6 flex flex-col gap-5 print:shadow-none print:border-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              جدول اختصاصی روند چله‌ها و دوره‌های شخصی
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              رهگیری چهل‌ روزه عملکرد تهذیبی و قابلیت چاپ و خروجی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto print:hidden">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
            title="دانلود فایل اکسل / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-xs"
            title="پرینت و ذخیره PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>چاپ / PDF</span>
          </button>

          <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-3 py-1 rounded-full border border-violet-200 dark:border-violet-800">
            {habits.length} دوره فعال
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {habits.map((habit: PersonalHabit) => {
          const totalDays = habit.durationDays || 40;
          const startDateObj = new Date(habit.startDate);
          
          const daysList = [];
          let completedCount = 0;
          let missedCount = 0;

          for (let i = 0; i < totalDays; i++) {
            const dayDateObj = new Date(startDateObj);
            dayDateObj.setDate(startDateObj.getDate() + i);
            const dateStr = dayDateObj.toISOString().split('T')[0];
            const faDateStr = dayDateObj.toLocaleDateString('fa-IR', { month: 'numeric', day: 'numeric' });
            
            const assessment = assessmentMap.get(dateStr);
            const val = assessment?.customTasks?.[habit.id];

            let status: 'COMPLETED' | 'MISSED' | 'FUTURE' | 'UNRECORDED' = 'UNRECORDED';
            if (dateStr > todayStr) {
              status = 'FUTURE';
            } else if (val === true || (typeof val === 'string' && val.length > 0 && val !== 'انجام نشد' && val !== 'NONE')) {
              status = 'COMPLETED';
              completedCount++;
            } else if (val === false || val === 'انجام نشد') {
              status = 'MISSED';
              missedCount++;
            }

            daysList.push({
              dayNum: i + 1,
              dateStr,
              faDateStr,
              status,
              val
            });
          }

          const elapsedDays = Math.min(
            totalDays,
            Math.max(0, Math.floor((new Date().getTime() - startDateObj.getTime()) / (1000 * 3600 * 24)) + 1)
          );
          const remainingDays = Math.max(0, totalDays - elapsedDays + 1);
          const progressPercent = Math.round((completedCount / totalDays) * 100);

          return (
            <div key={habit.id} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {habit.title} ({totalDays} روزه)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    تاریخ شروع: {startDateObj.toLocaleDateString('fa-IR')} | روزهای باقی‌مانده: <span className="font-bold text-violet-600 dark:text-violet-300">{remainingDays} روز</span> | روز کنونی: روز {elapsedDays}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{completedCount} انجام شده</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-xs font-bold text-rose-500">{missedCount} عدم انجام</span>
                  </div>
                  <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 min-w-[32px]">{progressPercent}%</span>
                </div>
              </div>

              {/* Grid of days */}
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 pt-1">
                {daysList.map(day => {
                  let bgClasses = 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/40';

                  if (day.status === 'COMPLETED') {
                    if (typeof day.val === 'string') {
                      if (day.val === 'عالی') bgClasses = 'bg-emerald-600 text-white border-emerald-700 shadow-xs';
                      else if (day.val === 'خوب') bgClasses = 'bg-teal-600 text-white border-teal-700 shadow-xs';
                      else if (day.val === 'متوسط') bgClasses = 'bg-indigo-600 text-white border-indigo-700 shadow-xs';
                      else bgClasses = 'bg-violet-600 text-white border-violet-700 shadow-xs';
                    } else {
                      bgClasses = 'bg-emerald-500 text-white border-emerald-600 shadow-xs';
                    }
                  } else if (day.status === 'MISSED') {
                    bgClasses = 'bg-rose-500 text-white border-rose-600 shadow-xs';
                  } else if (day.status === 'FUTURE') {
                    bgClasses = 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 opacity-60';
                  }

                  return (
                    <div
                      key={day.dayNum}
                      title={`روز ${day.dayNum} (${day.faDateStr}): ${day.status === 'COMPLETED' ? (typeof day.val === 'string' ? day.val : 'انجام شد') : day.status === 'MISSED' ? 'انجام نشد' : day.status === 'FUTURE' ? 'آینده' : 'ثبت نشده'}`}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-bold transition-all border ${bgClasses}`}
                    >
                      <span className="opacity-80 text-[8px]">روز {day.dayNum}</span>
                      <span className="font-extrabold my-0.5 text-[10px]">{day.faDateStr}</span>
                      <div className="mt-0.5 flex items-center justify-center h-4 w-full">
                        {day.status === 'COMPLETED' && (
                          typeof day.val === 'string' ? (
                            <span className="text-[8px] font-black truncate max-w-full px-0.5">
                              {day.val}
                            </span>
                          ) : (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          )
                        )}
                        {day.status === 'MISSED' && (
                          typeof day.val === 'string' && day.val !== 'انجام نشد' ? (
                            <span className="text-[8px] font-black truncate max-w-full px-0.5">
                              {day.val}
                            </span>
                          ) : (
                            <X className="w-3.5 h-3.5 stroke-[3]" />
                          )
                        )}
                        {day.status === 'FUTURE' && <span className="text-[9px] text-slate-400">•</span>}
                        {day.status === 'UNRECORDED' && <span className="text-[9px] text-amber-600 dark:text-amber-400">-</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
