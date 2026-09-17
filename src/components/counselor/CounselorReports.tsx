import React, { useState } from 'react';
import { useAuth } from '../../store';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { LockKeyhole, UserPlus, Search, Eye, BarChart2, Smartphone } from 'lucide-react';
import { ReportContentDisplay } from '../common/ReportContentDisplay';
import { getReportAuthorInfo } from '../../utils/reportUtils';
import { StudentDetailModal } from '../common/StudentDetailModal';
import { triggerSync } from '../../sync';

export function CounselorReports() {
  const { currentUser } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);
  
  const students = useLiveQuery(() => db.users.where({ role: 'STUDENT' }).toArray());
  const allReports = useLiveQuery(
    () => db.reports.where('type').equals('COUNSELING_SESSION').reverse().sortBy('date'),
    []
  );
  const reports = allReports?.filter(r => r.authorId === currentUser?.id) || [];
  const referralReports = allReports?.filter(r => r.authorId !== currentUser?.id) || [];
  
  const allUsers = useLiveQuery(() => db.users.toArray());

  const handleSaveSession = async () => {
    if (!currentUser || !selectedStudentId || !sessionNotes.trim()) return;
    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      studentId: selectedStudentId,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: sessionNotes,
      isConfidential: true,
      synced: false
    });

    // Automatically update student's counselor tags if they had CONSULT_NEEDED
    const targetStudent = students?.find(s => s.id === selectedStudentId);
    if (targetStudent && targetStudent.counselorTags?.includes('CONSULT_NEEDED')) {
      const newTags = targetStudent.counselorTags.filter(t => t !== 'CONSULT_NEEDED');
      if (!newTags.includes('FOLLOW_UP')) newTags.push('FOLLOW_UP');
      await db.users.update(selectedStudentId, { counselorTags: newTags });
    }

    setSessionNotes('');
    setSelectedStudentId(null);
    alert('گزارش محرمانه مشاوره ثبت شد.');
    triggerSync();
  };

  // Sort students so CONSULT_NEEDED students appear first
  const sortedStudents = React.useMemo(() => {
    if (!students) return [];
    return [...students].sort((a, b) => {
      const aNeeds = a.counselorTags?.includes('CONSULT_NEEDED') ? 1 : 0;
      const bNeeds = b.counselorTags?.includes('CONSULT_NEEDED') ? 1 : 0;
      return bNeeds - aNeeds;
    });
  }, [students]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full">
      <div className="md:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#064E3B]" />
          موارد ارجاعی جدید
        </h3>
        
        <select 
          className="w-full border border-slate-200 rounded-xl p-4 text-sm bg-slate-50 focus:ring-2 focus:ring-[#10B981] outline-none transition-colors mb-4"
          value={selectedStudentId || ''}
          onChange={e => setSelectedStudentId(e.target.value)}
        >
          <option value="">-- انتخاب طلبه ارجاعی --</option>
          {sortedStudents?.map(s => {
            const needsConsult = s.counselorTags?.includes('CONSULT_NEEDED');
            return (
              <option key={s.id} value={s.id}>
                {needsConsult ? '🚨 ' : ''}{s.name} {s.nationalId ? `(${s.nationalId})` : ''} {needsConsult ? '- [ارجاع جدید]' : ''}
              </option>
            );
          })}
        </select>

        {selectedStudentId && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setViewStudentId(selectedStudentId)}
              className="px-3 py-2 bg-[#064E3B]/10 hover:bg-[#064E3B]/20 text-[#064E3B] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              پرونده جامع طلبه
            </button>
            <button
              onClick={() => setViewStudentId(selectedStudentId)}
              className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              آمار استفاده از گوشی و نمودارها
            </button>
          </div>
        )}
        
        <div className="mt-6 flex-1 flex flex-col overflow-hidden">
          <h4 className="font-bold text-slate-700 mb-3 text-sm">دلایل ارجاع و پیام‌ها</h4>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {referralReports.length === 0 ? (
               <p className="text-center text-slate-400 text-xs py-4">پیام جدیدی وجود ندارد.</p>
            ) : (
               referralReports.map(report => {
                 const student = students?.find(s => s.id === report.studentId);
                 const authorInfo = getReportAuthorInfo(report, allUsers);
                 return (
                   <div key={report.id} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                     <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-slate-700">{student?.name}</span>
                       <span className="text-[10px] text-slate-500">{new Date(report.date).toLocaleDateString('fa-IR')}</span>
                     </div>
                     <p className="text-[10px] text-slate-500 mb-1">از طرف: {authorInfo.name} ({authorInfo.roleLabel})</p>
                     <ReportContentDisplay content={report.content} />
                   </div>
                 );
               })
            )}
          </div>
        </div>
      </div>
      
      <div className="md:col-span-8 flex flex-col gap-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <LockKeyhole className="w-5 h-5 text-[#064E3B]" />
            ثبت گزارش جلسه روان‌سنجی
          </h3>
          <textarea
            className="w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#10B981] bg-slate-50 min-h-[150px] resize-none flex-1 outline-none"
            placeholder="یادداشت‌های بالینی جلسه (این محتوا کاملا رمزنگاری می‌شود)..."
            value={sessionNotes}
            onChange={e => setSessionNotes(e.target.value)}
            disabled={!selectedStudentId}
          />
          <button
            onClick={handleSaveSession}
            disabled={!selectedStudentId}
            className="bg-[#064E3B] text-white px-6 py-3 rounded-2xl text-sm font-medium hover:bg-emerald-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 w-full sm:w-auto self-end flex items-center justify-center gap-2"
          >
            <LockKeyhole className="w-4 h-4" />
            ثبت امن و رمزنگاری‌شده
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col flex-1">
          <h3 className="font-bold text-slate-700 mb-4">گزارش‌های پیشین</h3>
          <div className="space-y-4 overflow-y-auto pr-2 max-h-[300px]">
            {reports?.map(report => {
              const student = students?.find(s => s.id === report.studentId);
              return (
                <div key={report.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm text-slate-700">{student?.name || 'نامشخص'}</span>
                    <span className="text-xs text-slate-500" dir="ltr">{new Date(report.date).toLocaleDateString('fa-IR')}</span>
                  </div>
                  <ReportContentDisplay content={report.content} />
                </div>
              );
            })}
            {reports?.length === 0 && (
              <p className="text-center text-slate-500 py-4 text-sm">هیچ گزارشی ثبت نشده است.</p>
            )}
          </div>
        </div>
      </div>

      <StudentDetailModal
        studentId={viewStudentId}
        onClose={() => setViewStudentId(null)}
      />
    </div>
  );
}
