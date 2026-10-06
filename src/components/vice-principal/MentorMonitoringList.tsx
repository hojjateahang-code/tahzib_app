import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, UserCheck, Activity, FileText } from 'lucide-react';
import { ReportContentDisplay } from '../common/ReportContentDisplay';

export function MentorMonitoringList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);

  const mentors = useLiveQuery(async () => {
    const users = await db.users.where('role').equals('MENTOR').toArray();
    return users.filter(u => u.isApproved);
  });

  const mentorReports = useLiveQuery(
    () => selectedMentorId ? db.reports.where({ authorId: selectedMentorId }).reverse().sortBy('date') : Promise.resolve([]),
    [selectedMentorId]
  );
  
  const allUsers = useLiveQuery(() => db.users.toArray());

  const filteredMentors = React.useMemo(() => {
    if (!mentors) return [];
    if (!searchQuery) return mentors;
    const q = searchQuery.toLowerCase();
    return mentors.filter(m => 
      (m.name && m.name.toLowerCase().includes(q))
    );
  }, [mentors, searchQuery]);

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Mentor List */}
      <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:sticky md:top-20">
        <div className="mb-4 relative">
          <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی استاد راهنما..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pr-10 pl-4 text-sm outline-none focus:border-emerald-500 shadow-xs text-slate-800 dark:text-slate-100"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="space-y-2 max-h-[350px] md:max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {(!filteredMentors || filteredMentors.length === 0) && (
            <div className="text-center text-slate-500 py-10 text-sm">استاد راهنمایی یافت نشد.</div>
          )}
          {filteredMentors?.map(mentor => (
            <button
              key={mentor.id}
              type="button"
              onClick={() => setSelectedMentorId(mentor.id)}
              className={`w-full text-right p-4 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                selectedMentorId === mentor.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{mentor.name}</span>
                <span className={`text-[10px] px-2 py-1 rounded-full ${
                  selectedMentorId === mentor.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                }`}>پایه {mentor.base || '-'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mentor Details */}
      <div className="w-full md:w-2/3 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col p-6">
        {selectedMentorId ? (
          <div className="flex flex-col space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-emerald-600" />
              عملکرد و گزارشات ثبت شده
            </h3>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-4 flex justify-between items-center shadow-sm">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 mb-1">تعداد گزارشات ثبت شده</span>
                <span className="text-xl font-bold text-emerald-600">{mentorReports?.length || 0} مورد</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                لیست گزارشات
              </h4>
              <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                {(!mentorReports || mentorReports.length === 0) && (
                  <p className="text-sm text-slate-500 text-center py-10 bg-white rounded-2xl border border-slate-100">گزارشی از این استاد ثبت نشده است.</p>
                )}
                {mentorReports?.map(report => {
                  const student = allUsers?.find(u => u.id === report.studentId);
                  return (
                    <div key={report.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-xs font-bold text-slate-700">مربوط به طلبه: {student?.name || 'نامشخص'}</span>
                          <span className="text-[10px] text-slate-500 block mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded-full">
                            {report.type === 'EVALUATION' ? 'ارزیابی دوره ای' : report.type === 'COUNSELING_SESSION' ? 'ارجاع/مشاوره' : 'عمومی'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
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
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 border border-slate-200 shadow-sm">
              <UserCheck className="w-10 h-10 text-slate-300" />
            </div>
            <p className="font-medium">برای مشاهده گزارشات، یک استاد راهنما را انتخاب کنید.</p>
          </div>
        )}
      </div>
    </div>
  );
}
