import React, { useState, useRef } from 'react';
import { useAuth } from '../../store';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { UserCheck, FileText, Send, Activity, BarChart2, MessageSquare, Phone, Eye, Smartphone, BookOpen, Info } from 'lucide-react';
import { triggerSync } from '../../sync';
import { StudentProgressChart } from '../student/StudentProgressChart';
import { StudentScreenTimeChart } from '../student/StudentScreenTimeChart';
import { StudentAssessmentDetails } from '../student/StudentAssessmentDetails';
import { CollapsibleCard } from '../common/CollapsibleCard';
import { StudentEscalationAlerts } from '../supervisor/StudentEscalationAlerts';
import { SupervisorStudentNotes } from '../supervisor/SupervisorStudentNotes';
import { StudentDetailModal } from '../common/StudentDetailModal';
import { ReportContentDisplay } from '../common/ReportContentDisplay';
import { getReportAuthorInfo } from '../../utils/reportUtils';

export function MentorStudents() {
  const { currentUser } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [viewStudentModalId, setViewStudentModalId] = useState<string | null>(null);

  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralReason, setReferralReason] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'CHART' | 'ASSESSMENT' | 'NOTES' | 'REPORTS'>('CHART');
  const detailsRef = useRef<HTMLDivElement>(null);

  const students = useLiveQuery(
    async () => {
      let list;
      if (currentUser?.base) {
        list = await db.users.where('role').equals('STUDENT').filter(u => u.base === currentUser.base).toArray();
      } else {
        list = await db.users.where('role').equals('STUDENT').toArray();
      }
      return list.filter(u => !u.isDeleted);
    },
    [currentUser]
  );

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const studentAssessments = useLiveQuery(
    () => selectedStudentId ? db.assessments.where({ studentId: selectedStudentId }).reverse().sortBy('date') : Promise.resolve([]),
    [selectedStudentId]
  );

  const studentReports = useLiveQuery(
    () => selectedStudentId ? db.reports.where({ studentId: selectedStudentId }).reverse().sortBy('date') : Promise.resolve([]),
    [selectedStudentId]
  );
  
  const filteredReports = React.useMemo(() => {
    if (!studentReports) return [];
    if (!reportSearch) return studentReports;
    return studentReports.filter(r => r.content.includes(reportSearch));
  }, [studentReports, reportSearch]);

  const allUsers = useLiveQuery(() => db.users.toArray());
  
  const filteredStudents = React.useMemo(() => {
    if (!students) return [];
    if (!studentSearchQuery) return students;
    const q = studentSearchQuery.toLowerCase();
    return students.filter(s => 
      (s.name && s.name.toLowerCase().includes(q)) || 
      (s.nationalId && s.nationalId.includes(q))
    );
  }, [students, studentSearchQuery]);

  const handleRequestConsult = () => {
    if (!selectedStudentId || !currentUser) return;
    setShowReferralModal(true);
  };

  const submitReferral = async () => {
    if (!selectedStudentId || !currentUser || !referralReason.trim()) return;
    
    const student = students?.find(s => s.id === selectedStudentId);
    if (!student) return;
    
    let currentTags = student.counselorTags || [];
    currentTags = [...currentTags, 'CONSULT_NEEDED'];
    await db.users.update(selectedStudentId, { counselorTags: currentTags });
    
    // Add report for counselor
    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      studentId: selectedStudentId,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: `ارجاع به مشاور توسط استاد راهنما (${currentUser.name}). علت ارجاع: ${referralReason}`,
      isConfidential: true,
      synced: false
    });

    // Send direct official message to counselors for immediate notification bell & badge alert
    const counselors = await db.users.where('role').equals('COUNSELOR').toArray();
    for (const counselor of counselors) {
      await db.messages.add({
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        recipientId: counselor.id,
        subject: `🚨 ارجاع جدید به مشاوره: ${student.name}`,
        content: `طلبه ${student.name} (پایه ${student.base || 1}) توسط استاد راهنما (${currentUser.name}) به مشاوره ارجاع داده شد.\nعلت ارجاع: ${referralReason}`,
        date: new Date().toISOString(),
        type: 'OFFICIAL',
        isRead: false,
        synced: false
      });
    }
    
    alert('درخواست ارجاع به مشاوره ثبت شد و پیام به مشاور ارسال گردید.');
    setShowReferralModal(false);
    setReferralReason('');
    triggerSync();
  };

  const handleSaveReport = async () => {
    if (!currentUser || !selectedStudentId || !reportContent.trim()) return;

    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      studentId: selectedStudentId,
      type: 'MENTOR_EVAL',
      date: new Date().toISOString(),
      content: reportContent,
      isConfidential: false,
      synced: false
    });

    setReportContent('');
    triggerSync();
  };

  const selectedStudent = students?.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      {/* Top Automated Escalation Alert System */}
      <StudentEscalationAlerts onSelectStudent={handleSelectStudent} />

      <div className="flex flex-col md:grid md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden w-full md:sticky md:top-20 md:max-h-[calc(100vh-120px)]">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            لیست طلاب
          </h3>
        </div>
        <div className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی طلبه..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
              value={studentSearchQuery}
              onChange={e => setStudentSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="p-4 space-y-2 flex-1 overflow-y-auto max-h-[350px] md:max-h-[calc(100vh-220px)]">
          {students?.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">طلبه‌ای در لیست شما یافت نشد.</p>
          ) : (
            filteredStudents?.map(student => (
              <button
                key={student.id}
                type="button"
                onClick={() => handleSelectStudent(student.id)}
                className={`w-full text-right p-3.5 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                  selectedStudentId === student.id 
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 shadow-xs' 
                    : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{student.name}</span>
                  {!student.isApproved && <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">تایید نشده</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div ref={detailsRef} className="md:col-span-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col w-full">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-t-3xl">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            گزارش و ارزیابی
          </h3>
        </div>
        
        {selectedStudentId ? (
          <div className="p-4 sm:p-6 space-y-6 flex-1 flex flex-col relative">
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6 pt-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap justify-between items-center bg-indigo-50 dark:bg-indigo-950/50 p-3 sm:p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900 gap-3 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-indigo-900 dark:text-indigo-200">
                      در حال بررسی: <strong className="text-indigo-700 dark:text-indigo-300">{selectedStudent?.name}</strong>
                    </span>
                    <button
                      onClick={() => setViewStudentModalId(selectedStudentId)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="مشاهده پرونده جامع"
                    >
                      <Eye className="w-3 h-3" />
                      <span>پروفایل جامع</span>
                    </button>
                  </div>
                  {selectedStudent?.phone && (
                    <div className="mt-1">
                      <a
                        href={`tel:${selectedStudent.phone.replace(/[^0-9+]/g, '')}`}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 dir-ltr cursor-pointer"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{selectedStudent.phone}</span>
                      </a>
                    </div>
                  )}
                </div>
                <p className="text-xs text-indigo-800 dark:text-indigo-200 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-xl font-bold">
                  پایه: {selectedStudent?.base || 1}
                </p>
              </div>
            </div>

            
            {selectedStudentId && (
              <>
                <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl flex gap-1.5 overflow-x-auto hide-scrollbar border border-slate-200/40 dark:border-slate-700/40 w-full sm:w-auto self-start mt-4 mb-6">
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
                      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                          <MessageSquare className="w-5 h-5 text-emerald-500" />
                          ثبت گزارش مصاحبه / ارزیابی
                        </h4>
                        <div className="flex flex-col gap-4">
                          <textarea
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px] resize-none text-slate-800 dark:text-slate-100"
                            placeholder="نکات، توصیه‌ها و ارزیابی کلی را اینجا بنویسید..."
                            value={reportContent}
                            onChange={e => setReportContent(e.target.value)}
                          />
                          <div className="flex flex-col sm:flex-row gap-3 justify-end">
                            <button
                              onClick={handleRequestConsult}
                              className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
                            >
                              ارجاع به مشاوره
                            </button>
                            <button
                              onClick={handleSaveReport}
                              className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              ثبت ارزیابی
                            </button>
                          </div>
                        </div>
                      </div>

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
              </>
            )}

            <CollapsibleCard
              title="گزارش مصاحبه چهره به چهره"
              icon={MessageSquare}
              defaultOpen={true}
            >
              <div className="flex flex-col pt-2 gap-4">
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[120px] resize-none text-slate-800 dark:text-slate-100"
                  placeholder="نکات، توصیه‌ها و ارزیابی کلی را اینجا بنویسید..."
                  value={reportContent}
                  onChange={e => setReportContent(e.target.value)}
                />
                
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={handleRequestConsult}
                    className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-6 py-3 rounded-2xl text-sm font-bold hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
                  >
                    ارجاع به مشاوره
                  </button>
                  <button
                    onClick={handleSaveReport}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    ثبت ارزیابی
                  </button>
                </div>
              </div>
            </CollapsibleCard>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 bg-slate-50/50">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 border border-slate-200 shadow-sm">
              <UserCheck className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">برای ثبت گزارش، یک طلبه را از لیست انتخاب کنید.</p>
          </div>
        )}
      </div>
      </div>

      {showReferralModal && (


        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 mb-4">ارجاع به مشاوره</h3>
            <p className="text-sm text-slate-600 mb-4">لطفا دلیل ارجاع طلبه به مشاوره را به صورت کامل توضیح دهید. این دلیل برای مشاور ارسال خواهد شد.</p>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:border-amber-500 min-h-[150px] resize-none mb-6"
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
                }}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Student Detail Modal */}
      <StudentDetailModal
        studentId={viewStudentModalId}
        onClose={() => setViewStudentModalId(null)}
      />
    </div>
  );
}

