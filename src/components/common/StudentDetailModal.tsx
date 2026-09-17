import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { 
  X, Phone, MessageSquare, User, Calendar, ShieldCheck, 
  BarChart2, Smartphone, FileText, CheckCircle2, AlertCircle, ExternalLink, Clock, BookOpen, Info, Activity
} from 'lucide-react';
import { StudentAssessmentDetails } from '../student/StudentAssessmentDetails';
import { StudentScreenTimeChart } from '../student/StudentScreenTimeChart';
import { StudentProgressChart } from '../student/StudentProgressChart';
import { SupervisorStudentNotes } from '../supervisor/SupervisorStudentNotes';
import { ReportContentDisplay } from './ReportContentDisplay';
import { getReportAuthorInfo } from '../../utils/reportUtils';

interface Props {
  studentId: string | null;
  onClose: () => void;
}

export function StudentDetailModal({ studentId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'CHART' | 'ASSESSMENT' | 'NOTES' | 'REPORTS'>('CHART');
  const [reportSearch, setReportSearch] = useState('');

  const student = useLiveQuery(
    async () => {
      if (!studentId) return null;
      return await db.users.get(studentId);
    },
    [studentId]
  );

  const mentor = useLiveQuery(
    async () => {
      if (!student?.mentorId) return null;
      return await db.users.get(student.mentorId);
    },
    [student?.mentorId]
  );

  const assessments = useLiveQuery(
    async () => {
      if (!studentId) return [];
      return await db.assessments
        .where('studentId')
        .equals(studentId)
        .reverse()
        .sortBy('date');
    },
    [studentId]
  );

  const reports = useLiveQuery(
    async () => {
      if (!studentId) return [];
      return await db.reports
        .where('studentId')
        .equals(studentId)
        .reverse()
        .sortBy('date');
    },
    [studentId]
  );

  const allUsers = useLiveQuery(() => db.users.toArray());

  const filteredReports = React.useMemo(() => {
    if (!reports) return [];
    if (!reportSearch) return reports;
    return reports.filter(r => r.content.includes(reportSearch));
  }, [reports, reportSearch]);

  if (!studentId || !student) return null;

  const phoneFormatted = student.phone || 'نامشخص';
  const cleanPhone = student.phone ? student.phone.replace(/[^0-9+]/g, '') : '';

  // Get screen time logs
  const screenTimeLogs = assessments?.filter(a => a.screenTime) || [];

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-start sm:items-center gap-4 border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-extrabold text-lg shrink-0 shadow-inner">
              {student.name.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white">{student.name}</h3>
                <span className="text-[11px] font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  پایه {student.base || 1}
                </span>
                {student.isApproved ? (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    تایید شده
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    در انتظار تایید
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
                <span>کد ملی: <strong className="text-white font-mono">{student.nationalId || 'ثبت نشده'}</strong></span>
                {mentor && <span>استاد راهنما: <strong className="text-indigo-300">{mentor.name}</strong></span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar (Click to Call & Profile Info) */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">اطلاعات تماس و وضعیت طلبه</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {cleanPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer dir-ltr"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>تماس: {phoneFormatted}</span>
              </a>
            )}
            <a
              href={`https://eitaa.com`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>ارسال پیام در ایتا</span>
            </a>
          </div>
        </div>

        {/* Tabs Header */}
        <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-start">
          <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl flex gap-1.5 overflow-x-auto hide-scrollbar border border-slate-200/40 dark:border-slate-700/40 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('CHART')}
              className={`whitespace-nowrap px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer ${
                activeTab === 'CHART'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40'
              }`}
            >
              <BarChart2 className="w-4 h-4 shrink-0" />
              <span>نمودار پیشرفت</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ASSESSMENT')}
              className={`whitespace-nowrap px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer ${
                activeTab === 'ASSESSMENT'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>جزئیات و توضیحات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('NOTES')}
              className={`whitespace-nowrap px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer ${
                activeTab === 'NOTES'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>یادداشت‌ها</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('REPORTS')}
              className={`whitespace-nowrap px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer ${
                activeTab === 'REPORTS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40'
              }`}
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>گزارشات و ارجاعات</span>
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'CHART' && (
            <StudentProgressChart studentId={studentId} />
          )}


          {activeTab === 'ASSESSMENT' && (
            <StudentAssessmentDetails studentId={studentId} />
          )}

          {activeTab === 'NOTES' && (
            <SupervisorStudentNotes studentId={studentId} studentName={student?.name} />
          )}

          {activeTab === 'REPORTS' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-indigo-500" />
                  گزارشات و ارجاعات پیشین
                </h4>
                
                <div className="mb-3 relative pt-1">
                  <Activity className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="جستجو در گزارش‌ها..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-9 pl-3 text-xs outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                    value={reportSearch}
                    onChange={e => setReportSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                  {(!filteredReports || filteredReports.filter(r => !r.isConfidential).length === 0) && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">گزارشی یافت نشد.</p>
                  )}
                  {filteredReports && filteredReports.filter(r => !r.isConfidential).map(report => {
                    const authorInfo = getReportAuthorInfo(report, allUsers);
                    return (
                      <div key={report.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>{authorInfo.name}</span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                              ({authorInfo.roleLabel})
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400" dir="ltr">
                            {new Date(report.date).toLocaleDateString('fa-IR')}
                          </span>
                        </div>
                        <ReportContentDisplay content={report.content} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <span className="text-xs text-slate-500 font-medium">شناسه طلبه: {student.id.slice(0, 8)}...</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl font-bold text-xs cursor-pointer transition-colors"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
}
