import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Calendar, FileText, CheckCircle2, XCircle, AlertCircle, MessageSquare } from 'lucide-react';

interface Props {
  studentId: string;
}

const PRAYER_LABELS: Record<string, string> = {
  namazSobh: 'نماز صبح',
  namazZohr: 'نماز ظهر',
  namazAsr: 'نماز عصر',
  namazMaghreb: 'نماز مغرب',
  namazEsha: 'نماز عشاء',
};

const TASK_LABELS: Record<string, string> = {
  saharKhizi: 'سحرخیزی و نماز شب',
  telavatNoor: 'تلاوت قرآن (تلاوت نور)',
  classAttendance: 'حضور منظم در کلاس‌ها',
  mabahese: 'مباحثه و مطالعه گروهی',
  earlySleep: 'خواب اول شب',
};

export function StudentAssessmentDetails({ studentId }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PRAYERS' | 'TASKS' | 'NOTES'>('PRAYERS');

  const assessments = useLiveQuery(
    () => db.assessments.where('studentId').equals(studentId).reverse().sortBy('date'),
    [studentId]
  );

  if (!assessments || assessments.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
        هیچ ارزیابی خوداظهاری توسط این طلبه به ثبت نرسیده است.
      </div>
    );
  }

  const activeAssessment = selectedDate 
    ? assessments.find(a => a.date === selectedDate) 
    : assessments[0];

  const dateSelector = (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">تاریخ:</span>
      <select
        value={activeAssessment?.date || ''}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {assessments.map(a => (
          <option key={a.id} value={a.date}>
            {new Date(a.date).toLocaleDateString('fa-IR')}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          جزئیات خوداظهاری و توضیحات طلبه
        </h4>
        {dateSelector}
      </div>

      {activeAssessment ? (
        <div className="space-y-4 pt-4">
          <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl flex gap-1.5 overflow-x-auto hide-scrollbar border border-slate-200/40 dark:border-slate-700/40 w-full sm:w-auto self-start">
            <button
              onClick={() => setActiveTab('PRAYERS')}
              className={`whitespace-nowrap px-4 py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer ${
                activeTab === 'PRAYERS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40'
              }`}
            >
              نمازهای یومیه
            </button>
            <button
              onClick={() => setActiveTab('TASKS')}
              className={`whitespace-nowrap px-4 py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer ${
                activeTab === 'TASKS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40'
              }`}
            >
              برنامه‌ها و سنن تهذیبی
            </button>
            <button
              onClick={() => setActiveTab('NOTES')}
              className={`whitespace-nowrap px-4 py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer ${
                activeTab === 'NOTES'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40'
              }`}
            >
              توضیحات کلی
            </button>
          </div>

          {activeTab === 'PRAYERS' && (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center justify-between">
              <span>وضعیت نمازهای یومیه</span>
              <span className="text-[10px] text-slate-400 font-normal">سبز: جماعت | آبی: فرادی | زرد: قضا | قرمز: ترک | خاکستری: ثبت نشده</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              {Object.entries(PRAYER_LABELS).map(([key, label]) => {
                const status = (activeAssessment as any)[key];
                const note = activeAssessment.notes?.[key];
                
                let badgeBg = 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600';
                let statusText = 'ثبت نشده';

                if (status === 'ADA_JAMAAT') {
                  badgeBg = 'bg-emerald-600 text-white border-emerald-700 font-black shadow-xs';
                  statusText = 'اداء به جماعت ✓';
                } else if (status === 'ADA_FORADA') {
                  badgeBg = 'bg-teal-600 text-white border-teal-700 font-black shadow-xs';
                  statusText = 'اداء فرادی';
                } else if (status === 'QAZA') {
                  badgeBg = 'bg-amber-500 text-white border-amber-600 font-black shadow-xs';
                  statusText = 'قضا شد ⚠️';
                } else if (status === 'TARK') {
                  badgeBg = 'bg-rose-600 text-white border-rose-700 font-black shadow-xs';
                  statusText = 'ترک شد ✖';
                }

                return (
                  <div key={key} className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 flex flex-col gap-2 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">{label}:</span>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badgeBg}`}>
                        {statusText}
                      </span>
                    </div>
                    {note && (
                      <div className="mt-1 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 text-[11px] flex gap-1.5 items-start">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed"><strong>توضیح و عذر طلبه:</strong> {note}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {activeTab === 'TASKS' && (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
              برنامه‌ها و سنن تهذیبی
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              {Object.entries(TASK_LABELS).map(([key, label]) => {
                const status = (activeAssessment as any)[key];
                const note = activeAssessment.notes?.[key];

                let badgeBg = 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600';
                let statusText = 'ثبت نشده';

                if (status === true || status === 'FULL') {
                  badgeBg = 'bg-emerald-600 text-white border-emerald-700 font-black shadow-xs';
                  statusText = 'انجام شد ✓';
                } else if (status === 'PARTIAL') {
                  badgeBg = 'bg-violet-600 text-white border-violet-700 font-black shadow-xs';
                  statusText = 'ناقص';
                } else if (status === false || status === 'NONE') {
                  badgeBg = 'bg-rose-600 text-white border-rose-700 font-black shadow-xs';
                  statusText = 'انجام نشد ✖';
                } else if (typeof status === 'string' && status.length > 0) {
                  badgeBg = 'bg-indigo-600 text-white border-indigo-700 font-black shadow-xs';
                  statusText = status;
                }

                return (
                  <div key={key} className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 flex flex-col gap-2 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">{label}:</span>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badgeBg}`}>
                        {statusText}
                      </span>
                    </div>
                    {note && (
                      <div className="mt-1 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 text-[11px] flex gap-1.5 items-start">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed"><strong>توضیح طلبه:</strong> {note}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* General Notes */}
          {activeTab === 'NOTES' && (
            <div className="bg-indigo-50 dark:bg-indigo-950/60 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 text-indigo-950 dark:text-indigo-200 text-xs shadow-xs">
              <span className="font-extrabold block mb-1 text-indigo-900 dark:text-indigo-300 text-sm">
                📝 یادداشت کلی طلبه برای این روز:
              </span>
              {activeAssessment.notes?.general ? (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-100 text-xs font-medium">
                  {activeAssessment.notes.general}
                </p>
              ) : (
                <p className="text-slate-500">یادداشتی ثبت نشده است.</p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
