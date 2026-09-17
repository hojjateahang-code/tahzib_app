import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardList } from 'lucide-react';
import { StudentMonitoringList } from '../StudentMonitoringList';
import { MentorMonitoringList } from './MentorMonitoringList';
import { ReportsMonitoringList } from './ReportsMonitoringList';
import { UserCheck, Users, FileText } from 'lucide-react';

export function VicePrincipalDashboard() {
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'MENTORS' | 'REPORTS'>('STUDENTS');
  const users = useLiveQuery(() => db.users.toArray());
  const reports = useLiveQuery(() => db.reports.toArray());

  const studentsCount = users?.filter(u => u.role === 'STUDENT' && u.isApproved).length || 0;
  const mentorsCount = users?.filter(u => u.role === 'MENTOR').length || 0;
  const recentReportsCount = reports?.filter(r => new Date(r.date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Quick Stats Panel */}
      <div className="md:col-span-12 bg-[#064E3B] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
        <div className="relative z-10">
          <h3 className="font-bold text-emerald-300 mb-6 flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            نمای کلی مدرسه
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <li className="flex justify-between items-center text-sm font-medium bg-white/10 p-4 rounded-2xl border border-white/10">
              <span className="text-emerald-50">تعداد طلاب</span>
              <span className="bg-emerald-500/20 text-emerald-200 px-3 py-1 rounded-lg font-bold">{studentsCount} نفر</span>
            </li>
            <li className="flex justify-between items-center text-sm font-medium bg-white/10 p-4 rounded-2xl border border-white/10">
              <span className="text-emerald-50">اساتید راهنما</span>
              <span className="bg-emerald-500/20 text-emerald-200 px-3 py-1 rounded-lg font-bold">{mentorsCount} نفر</span>
            </li>
            <li className="flex justify-between items-center text-sm font-medium bg-white/10 p-4 rounded-2xl border border-white/10">
              <span className="text-emerald-50">گزارشات جدید (هفته)</span>
              <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg font-bold shadow-sm">{recentReportsCount} مورد</span>
            </li>
          </ul>
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      <div className="md:col-span-12 bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('STUDENTS')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'STUDENTS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <UserCheck className="w-4 h-4" />
            رصد طلاب
          </button>
          <button 
            onClick={() => setActiveTab('MENTORS')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'MENTORS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-4 h-4" />
            اساتید راهنما
          </button>
          <button 
            onClick={() => setActiveTab('REPORTS')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'REPORTS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText className="w-4 h-4" />
            گزارشات تجمیعی
          </button>
        </div>
        
        <div className="mt-4">
          {activeTab === 'STUDENTS' && <StudentMonitoringList />}
          {activeTab === 'MENTORS' && <MentorMonitoringList />}
          {activeTab === 'REPORTS' && <ReportsMonitoringList />}
        </div>
      </div>
    </div>
  );
}
