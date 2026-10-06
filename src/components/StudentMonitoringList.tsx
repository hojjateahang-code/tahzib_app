import React, { useState, useRef } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Info, BarChart2, Smartphone, FileText, BookOpen, UserCheck } from 'lucide-react';
import { triggerSync } from '../sync';
import { AVAILABLE_TAGS } from './counselor/CounselorStudents';
import { StudentProgressChart } from './student/StudentProgressChart';
import { StudentScreenTimeChart } from './student/StudentScreenTimeChart';
import { StudentAssessmentDetails } from './student/StudentAssessmentDetails';
import { CollapsibleCard } from './common/CollapsibleCard';
import { StudentEscalationAlerts } from './supervisor/StudentEscalationAlerts';
import { SupervisorStudentNotes } from './supervisor/SupervisorStudentNotes';
import { ReportContentDisplay } from './common/ReportContentDisplay';
import { getReportAuthorInfo } from '../utils/reportUtils';

export function StudentMonitoringList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referringStudentId, setReferringStudentId] = useState<string | null>(null);
  const [referralReason, setReferralReason] = useState('');
  const [activeTab, setActiveTab] = useState<'CHART' | 'ASSESSMENT' | 'NOTES' | 'REPORTS'>('CHART');
  const detailsRef = useRef<HTMLDivElement>(null);

  const students = useLiveQuery(async () => {
    const users = await db.users.where('role').equals('STUDENT').toArray();
    return users.filter(u => u.isApproved && !u.isDeleted);
  });
  const reports = useLiveQuery(
    () => selectedStudentId ? db.reports.where({ studentId: selectedStudentId }).reverse().sortBy('date') : [],
    [selectedStudentId]
  );
  
  // Also get the authors for reports
  const rawUsers = useLiveQuery(() => db.users.toArray());
  const allUsers = rawUsers?.filter(u => !u.isDeleted);

  const selectedStudent = students?.find(s => s.id === selectedStudentId);

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const filteredStudents = React.useMemo(() => {
    if (!students) return [];
    return students.filter(student => {
      const q = searchQuery.toLowerCase();
      return (
        (student.name && student.name.toLowerCase().includes(q)) ||
        (student.firstName && student.firstName.toLowerCase().includes(q)) ||
        (student.lastName && student.lastName.toLowerCase().includes(q)) ||
        (student.nationalId && student.nationalId.includes(q))
      );
    });
  }, [students, searchQuery]);

  const handleRequestConsult = (studentId: string) => {
    setReferringStudentId(studentId);
    setShowReferralModal(true);
  };

  const submitReferral = async () => {
    if (!referringStudentId || !referralReason.trim()) return;
    const student = students?.find(s => s.id === referringStudentId);
    if (!student) return;
    
    let currentTags = student.counselorTags || [];
    if (!currentTags.includes('CONSULT_NEEDED')) {
      currentTags = [...currentTags, 'CONSULT_NEEDED'];
      await db.users.update(referringStudentId, { counselorTags: currentTags });
    }
    
    // Add report for counselor
    const author = JSON.parse(localStorage.getItem('currentUser') || '{}');
    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: author.id || 'system',
      studentId: referringStudentId,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: `ارجاع به مشاور. علت ارجاع: ${referralReason}`,
      isConfidential: true,
      synced: false
    });

    // Send official message to counselors for immediate notification bell & badge alert
    const counselors = await db.users.where('role').equals('COUNSELOR').toArray();
    for (const counselor of counselors) {
      await db.messages.add({
        id: crypto.randomUUID(),
        senderId: author.id || 'system',
        recipientId: counselor.id,
        subject: `🚨 ارجاع جدید به مشاوره: ${student.name}`,
        content: `طلبه ${student.name} (پایه ${student.base || 1}) به مشاوره ارجاع داده شد.\nعلت ارجاع: ${referralReason}\nارسال‌کننده: ${author.name || 'مسئول مرکز'}`,
        date: new Date().toISOString(),
        type: 'OFFICIAL',
        isRead: false,
        synced: false
      });
    }
    
    setShowReferralModal(false);
    setReferralReason('');
    setReferringStudentId(null);
    alert('درخواست ارجاع به مشاوره با موفقیت ثبت شد.');
    triggerSync();
  };

  return (
    <div className="space-y-6">
      {/* Top Escalation Warning Alert System */}
      <StudentEscalationAlerts onSelectStudent={handleSelectStudent} />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Student List */}
        <div className="w-full md:w-1/3 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:sticky md:top-20 md:max-h-[calc(100vh-120px)] overflow-hidden">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 text-sm">لیست طلاب</h3>
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="جستجو..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[350px] md:max-h-[calc(100vh-220px)]">
          {filteredStudents.map(student => (
            <button
              key={student.id}
              type="button"
              onClick={() => handleSelectStudent(student.id)}
              className={`w-full text-right p-3 rounded-xl border text-sm transition-all cursor-pointer ${
                selectedStudentId === student.id 
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold' 
                  : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="font-bold text-xs">{student.name}</div>
              <div className="text-[10px] opacity-70 mt-1">پایه: {student.base}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Details Area */}
      <div ref={detailsRef} className="flex-1 w-full bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-col relative">
        {selectedStudentId ? (
          <div className="flex flex-col space-y-6">
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6 pt-2 pb-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-500" />
                  {students?.find(s => s.id === selectedStudentId)?.name}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {students?.find(s => s.id === selectedStudentId)?.counselorTags?.map(tagId => {
                    const tagInfo = AVAILABLE_TAGS.find(t => t.id === tagId);
                    if (!tagInfo) return null;
                    return (
                      <span key={tagId} className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${tagInfo.color}`}>
                        {tagInfo.label}
                      </span>
                    );
                  })}
                  {(!students?.find(s => s.id === selectedStudentId)?.counselorTags || students?.find(s => s.id === selectedStudentId)?.counselorTags?.length === 0) && (
                    <span className="text-xs text-slate-400">بدون برچسب</span>
                  )}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => handleRequestConsult(selectedStudentId)}
                className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-200 transition-colors"
              >
                ارجاع به مشاوره
              </button>
            </div>

            <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl flex gap-1.5 overflow-x-auto hide-scrollbar border border-slate-200/40 dark:border-slate-700/40 w-full sm:w-auto self-start mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('CHART')}
                className={`whitespace-nowrap px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer ${
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
                className={`whitespace-nowrap px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer ${
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
                className={`whitespace-nowrap px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer ${
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
                className={`whitespace-nowrap px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer ${
                  activeTab === 'REPORTS'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40'
                }`}
              >
                <Info className="w-4 h-4 shrink-0" />
                <span>گزارشات و ارجاعات</span>
              </button>
            </div>

            <div className="space-y-6">
              {activeTab === 'CHART' && (
                <StudentProgressChart studentId={selectedStudentId} />
              )}
              {activeTab === 'ASSESSMENT' && (
                <StudentAssessmentDetails studentId={selectedStudentId} />
              )}
              {activeTab === 'NOTES' && (
                <SupervisorStudentNotes studentId={selectedStudentId} studentName={selectedStudent?.name} />
              )}
              {activeTab === 'REPORTS' && (
                <div className="space-y-6">
                  {/* Historical Reports & Referrals */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                      <Info className="w-5 h-5 text-indigo-500" />
                      گزارشات و ارجاعات پیشین
                    </h4>
                    <div className="space-y-3 pt-2 max-h-[50vh] overflow-y-auto pr-1">
                      {reports?.filter(r => !r.isConfidential).length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">گزارشی برای این طلبه ثبت نشده است.</p>
                      )}
                      {reports?.filter(r => !r.isConfidential).map(report => {
                        const authorInfo = getReportAuthorInfo(report, allUsers);
                        return (
                          <div key={report.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-2">
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
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
            برای مشاهده جزئیات و گزارشات، یک طلبه را انتخاب کنید.
          </div>
        )}
      </div>

      {showReferralModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4">ارجاع به مشاوره</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">لطفا دلیل ارجاع طلبه به مشاوره را به صورت کامل توضیح دهید. این دلیل برای مشاور ارسال خواهد شد.</p>
            <textarea
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm outline-none focus:border-amber-500 min-h-[150px] resize-none mb-6 text-slate-800 dark:text-slate-100"
              placeholder="دلیل ارجاع..."
              value={referralReason}
              onChange={e => setReferralReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={submitReferral}
                disabled={!referralReason.trim()}
                className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                ثبت و ارجاع
              </button>
              <button
                onClick={() => {
                  setShowReferralModal(false);
                  setReferralReason('');
                  setReferringStudentId(null);
                }}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
