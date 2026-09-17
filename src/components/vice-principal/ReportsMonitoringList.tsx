import React, { useState, useMemo } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  BarChart2, FileSpreadsheet, Printer, Filter, Search, Users, Award, AlertTriangle, 
  TrendingUp, CheckCircle2, FileText, Calendar, Download, ShieldAlert, Sparkles, UserCheck, Phone, Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { exportToExcel, triggerPrint, exportElementAsImage } from '../../lib/exportUtils';
import { StudentDetailModal } from '../common/StudentDetailModal';
import { ReportContentDisplay } from '../common/ReportContentDisplay';
import { getReportAuthorInfo } from '../../utils/reportUtils';

function getAssessmentScore(a: any): number {
  if (!a) return 70;
  if (typeof a.score === 'number') return a.score;
  let score = 50;
  const prayers = [a.namazSobh, a.namazZohr, a.namazAsr, a.namazMaghreb, a.namazEsha];
  prayers.forEach(p => {
    if (p === 'ADA_JAMAAT') score += 8;
    else if (p === 'ADA_FORADA') score += 6;
  });
  if (a.saharKhizi) score += 5;
  if (a.telavatNoor) score += 5;
  if (a.classAttendance === true || a.classAttendance === 'FULL') score += 5;
  return Math.min(100, score);
}

export function ReportsMonitoringList() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'TABLE' | 'ARCHIVE'>('ANALYTICS');

  // Filters State
  const [selectedBase, setSelectedBase] = useState<string>('ALL'); // ALL or '1'..'6'
  const [selectedMentorId, setSelectedMentorId] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'ALL'>('30');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NO_SELF_CHECK' | 'ESCALATED' | 'CONSULT' | 'EXCELLENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);


  // DB Data Queries
  const students = useLiveQuery(async () => {
    const users = await db.users.where('role').equals('STUDENT').toArray();
    return users.filter(u => u.isApproved);
  });

  const mentors = useLiveQuery(() => db.users.where('role').equals('MENTOR').toArray());
  const reports = useLiveQuery(() => db.reports.reverse().sortBy('date'));
  const allSelfAssessments = useLiveQuery(() => db.assessments.toArray());
  const allUsers = useLiveQuery(() => db.users.toArray());

  // Filtered Students List according to controls
  const filteredStudents = useMemo(() => {
    if (!students) return [];

    return students.filter(student => {
      // Base Filter
      if (selectedBase !== 'ALL' && String(student.base) !== selectedBase) {
        return false;
      }

      // Mentor Filter
      if (selectedMentorId !== 'ALL' && student.mentorId !== selectedMentorId) {
        return false;
      }

      // Status / Risk Filter
      if (statusFilter !== 'ALL') {
        const studentAssessments = allSelfAssessments?.filter(a => a.studentId === student.id) || [];
        const hasConsultNeeded = student.counselorTags?.includes('CONSULT_NEEDED');
        const hasEscalation = student.counselorTags?.includes('ESCALATED');

        if (statusFilter === 'CONSULT' && !hasConsultNeeded) return false;
        if (statusFilter === 'ESCALATED' && !hasEscalation) return false;

        // Days since last self-assessment
        const sortedAssessments = [...studentAssessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastDate = sortedAssessments[0] ? new Date(sortedAssessments[0].date) : null;
        const daysDiff = lastDate ? Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24)) : 999;

        if (statusFilter === 'NO_SELF_CHECK' && daysDiff < 2) return false;
        if (statusFilter === 'EXCELLENT' && (daysDiff >= 2 || getAssessmentScore(sortedAssessments[0]) < 80)) return false;
      }

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = student.name?.toLowerCase().includes(q);
        const matchNationalId = student.nationalId?.includes(q);
        if (!matchName && !matchNationalId) return false;
      }

      return true;
    });
  }, [students, selectedBase, selectedMentorId, statusFilter, searchQuery, allSelfAssessments]);

  // Derived Aggregate KPI Metrics
  const metrics = useMemo(() => {
    if (!filteredStudents || filteredStudents.length === 0) {
      return {
        totalStudents: 0,
        selfAssessmentRate: 0,
        avgSpiritualScore: 0,
        atRiskCount: 0,
        consultNeededCount: 0,
        supervisorNotesCount: 0
      };
    }

    const totalStudents = filteredStudents.length;
    let totalAssessmentsCount = 0;
    let scoreSum = 0;
    let atRiskCount = 0;
    let consultNeededCount = 0;

    const studentIds = new Set(filteredStudents.map(s => s.id));

    filteredStudents.forEach(st => {
      const stAssessments = allSelfAssessments?.filter(a => a.studentId === st.id) || [];
      if (stAssessments.length > 0) {
        totalAssessmentsCount += stAssessments.length;
        const stAvg = stAssessments.reduce((sum, a) => sum + getAssessmentScore(a), 0) / stAssessments.length;
        scoreSum += stAvg;
      } else {
        scoreSum += 60; // baseline neutral
      }

      // Check last assessment date for risk
      const sorted = [...stAssessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastDate = sorted[0] ? new Date(sorted[0].date) : null;
      const daysDiff = lastDate ? Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24)) : 999;

      if (daysDiff >= 2 || st.counselorTags?.includes('ESCALATED')) {
        atRiskCount++;
      }

      if (st.counselorTags?.includes('CONSULT_NEEDED')) {
        consultNeededCount++;
      }
    });

    const supNotes = reports?.filter(r => studentIds.has(r.studentId) && (r.title?.includes('یادداشت') || r.content?.includes('[SUPERVISOR_NOTE]'))).length || 0;

    return {
      totalStudents,
      selfAssessmentRate: Math.round((totalAssessmentsCount / Math.max(1, totalStudents * 30)) * 100),
      avgSpiritualScore: Math.round(scoreSum / Math.max(1, totalStudents)),
      atRiskCount,
      consultNeededCount,
      supervisorNotesCount: supNotes
    };
  }, [filteredStudents, allSelfAssessments, reports]);

  // Chart Data 1: Base Comparison (Bar Chart)
  const baseChartData = useMemo(() => {
    const bases = [1, 2, 3, 4, 5, 6];
    return bases.map(baseNum => {
      const baseStudents = students?.filter(s => s.base === baseNum) || [];
      const count = baseStudents.length;
      let totalScore = 0;
      let activeAssessments = 0;

      baseStudents.forEach(st => {
        const stAssessments = allSelfAssessments?.filter(a => a.studentId === st.id) || [];
        activeAssessments += stAssessments.length;
        if (stAssessments.length > 0) {
          totalScore += stAssessments.reduce((s, a) => s + getAssessmentScore(a), 0) / stAssessments.length;
        } else {
          totalScore += 65;
        }
      });

      return {
        name: `پایه ${baseNum}`,
        تعداد_طلاب: count,
        میانگین_نمره: Math.round(totalScore / Math.max(1, count)),
        میزان_خوداظهاری: Math.min(100, Math.round((activeAssessments / Math.max(1, count * 10)) * 100))
      };
    });
  }, [students, allSelfAssessments]);

  // Chart Data 2: Status Distribution (Pie Chart)
  const statusPieData = useMemo(() => {
    const total = metrics.totalStudents || 1;
    const excellent = Math.max(0, total - metrics.atRiskCount - metrics.consultNeededCount);
    return [
      { name: 'طلاب فعال و منظم', value: excellent, color: '#10b981' },
      { name: 'نیازمند پیگیری/عدم خوداظهاری', value: metrics.atRiskCount, color: '#f59e0b' },
      { name: 'ارجاع داده‌شده به مشاوره', value: metrics.consultNeededCount, color: '#e11d48' }
    ];
  }, [metrics]);

  // Chart Data 3: Mentor Activity Data
  const mentorActivityData = useMemo(() => {
    if (!mentors) return [];
    return mentors.map(m => {
      const assignedStudents = students?.filter(s => s.mentorId === m.id) || [];
      const mNotes = reports?.filter(r => r.mentorId === m.id || (r.authorId === m.id && r.content?.includes('[SUPERVISOR_NOTE]'))).length || 0;

      return {
        name: m.name || 'استاد',
        طلاب_تحت_پوشش: assignedStudents.length,
        یادداشت_های_ثبت_شده: mNotes
      };
    });
  }, [mentors, students, reports]);

  // Export to Excel handler using universal exportUtils
  const handleExportExcel = () => {
    if (!filteredStudents || filteredStudents.length === 0) {
      alert('اطلاعاتی برای خروجی اکسل وجود ندارد.');
      return;
    }

    const dataToExport = filteredStudents.map((st, index) => {
      const mentor = allUsers?.find(u => u.id === st.mentorId);
      const stAssessments = allSelfAssessments?.filter(a => a.studentId === st.id) || [];
      const sorted = [...stAssessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastAssessment = sorted[0];

      let statusText = 'منظم و فعال';
      if (st.counselorTags?.includes('CONSULT_NEEDED')) statusText = 'ارجاع به مشاوره';
      else if (st.counselorTags?.includes('ESCALATED')) statusText = 'هشدار عدم خوداظهاری (بیش از ۳ روز)';

      return {
        'ردیف': index + 1,
        'نام و نام خانوادگی': st.name,
        'کد ملی': st.nationalId || 'نامشخص',
        'پایه تحصیلی': `پایه ${st.base || 1}`,
        'استاد راهنما': mentor?.name || 'تعیین نشده',
        'میانگین نمره تهذیبی': lastAssessment ? `${getAssessmentScore(lastAssessment)} از ۱۰۰` : 'ثبت نشده',
        'آخرین تاریخ خوداظهاری': lastAssessment ? new Date(lastAssessment.date).toLocaleDateString('fa-IR') : 'بدون ثبت',
        'وضعیت پیگیری': statusText,
        'شماره تماس': st.phone || 'نامشخص'
      };
    });

    exportToExcel(dataToExport, `Tahzib_Aggregate_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Print Report Handler
  const handlePrint = () => {
    triggerPrint();
  };


  return (
    <div className="flex flex-col gap-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 min-h-[600px]">
      
      {/* Header & Main Controls Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>گزارش‌های تجمیعی و تحلیلی تهذیبی</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            رصد تجمیعی وضعیت خوداظهاری، نمازها، عملکرد پایه‌ها و فعالیت اساتید راهنما
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="دانلود فایل خروجی کامل اکسل"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>خروجی اکسل (Excel)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="چاپ رسمی گزارش"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ / PDF</span>
          </button>
        </div>
      </div>

      {/* Customizable Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">
          <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>فیلترها و شخصی‌سازی گزارش:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Base / Grade Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              پایه تحصیلی:
            </label>
            <select
              value={selectedBase}
              onChange={e => setSelectedBase(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">همه پایه‌های تحصیلی (۱ تا ۶)</option>
              <option value="1">پایه ۱</option>
              <option value="2">پایه ۲</option>
              <option value="3">پایه ۳</option>
              <option value="4">پایه ۴</option>
              <option value="5">پایه ۵</option>
              <option value="6">پایه ۶</option>
            </select>
          </div>

          {/* Supervisor / Mentor Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              استاد راهنما:
            </label>
            <select
              value={selectedMentorId}
              onChange={e => setSelectedMentorId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">همه اساتید راهنما</option>
              {mentors?.map(m => (
                <option key={m.id} value={m.id}>
                  استاد {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Performance / Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              وضعیت خوداظهاری و هشدار:
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="NO_SELF_CHECK">عدم خوداظهاری (۲ روز و بیشتر)</option>
              <option value="ESCALATED">هشدار تصاعدی مسئولین</option>
              <option value="CONSULT">ارجاع‌شده به مشاوره</option>
              <option value="EXCELLENT">طلاب منظم و ممتاز</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              جستجوی مستقیم:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="نام طلبه یا کد ملی..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-8 pl-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">تعداد طلاب تحت رصد</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{metrics.totalStudents} نفر</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">میانگین شاخص تهذیبی</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.avgSpiritualScore} از ۱۰۰</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">نیازمند پیگیری / عدم ثبت</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.atRiskCount} نفر</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">ارزیابی و یادداشت اساتید</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{metrics.supervisorNotesCount} ثبت</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tab Switcher inside Module */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'ANALYTICS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>📊 نمودارها و آمار بصری تجمیعی</span>
        </button>

        <button
          onClick={() => setActiveTab('TABLE')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'TABLE'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>📋 جدول تفکیکی طلاب با خروجی اکسل</span>
        </button>

        <button
          onClick={() => setActiveTab('ARCHIVE')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'ARCHIVE'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>📝 آرشیو کلیه یادداشت‌ها و گزارش‌ها</span>
        </button>
      </div>

      {/* TAB 1: VISUAL CHARTS & ANALYTICS */}
      {activeTab === 'ANALYTICS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Base Comparison Bar Chart */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                مقایسه عملکرد و خوداظهاری پایه‌های تحصیلی
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                میانگین نمره تهذیبی و میزان مشارکت طلاب به تفکیک پایه ۱ تا ۶
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={baseChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="میانگین_نمره" name="میانگین نمره تهذیبی" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="میزان_خوداظهاری" name="میزان مشارکت (%)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution Pie Chart */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                توزیع وضعیت طلاب (منظم، عدم خوداظهاری، مشاوره)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                نسبت طلاب دارای هشدارهای تصاعدی به طلاب فعال
              </p>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={4}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mentor Activity Bar Chart */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs lg:col-span-2">
            <div className="mb-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                رصد میزان فعالیت و ثبت یادداشت اساتید راهنما
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                مقایسه تعداد طلاب تحت پوشش و حجم یادداشت‌های ثبت‌شده توسط هر استاد راهنما
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mentorActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="طلاب_تحت_پوشش" name="طلاب تحت پوشش" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="یادداشت_های_ثبت_شده" name="یادداشت‌های اختصاصی ثبت‌شده" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DETAILED DATA TABLE WITH EXCEL DOWNLOAD */}
      {activeTab === 'TABLE' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                جدول جامع وضعیت طلاب و اساتید راهنما ({filteredStudents.length} مورد)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                امکان مشاهده تفکیکی و خروجی اکسل کامل با تمام جزئیات
              </p>
            </div>

            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>دانلود اکسل</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">نام و نام خانوادگی</th>
                  <th className="p-3">پایه</th>
                  <th className="p-3">استاد راهنما</th>
                  <th className="p-3">آخرین ثبت خوداظهاری</th>
                  <th className="p-3">نمره تهذیبی</th>
                  <th className="p-3">وضعیت پیگیری / هشدار</th>
                  <th className="p-3">شماره تماس</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-bold">
                      طلبه‌ای با این فیلترها یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const mentor = allUsers?.find(u => u.id === st.mentorId);
                    const stAssessments = allSelfAssessments?.filter(a => a.studentId === st.id) || [];
                    const sorted = [...stAssessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    const last = sorted[0];

                    const hasConsult = st.counselorTags?.includes('CONSULT_NEEDED');
                    const hasEscalation = st.counselorTags?.includes('ESCALATED');

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <button
                            onClick={() => setViewStudentId(st.id)}
                            className="font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                            title="مشاهده وضعیت و پرونده کامل طلبه"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{st.name}</span>
                          </button>
                        </td>
                        <td className="p-3 font-bold text-indigo-700 dark:text-indigo-300">پایه {st.base || 1}</td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">{mentor?.name || 'تعیین نشده'}</td>
                        <td className="p-3 text-slate-500">
                          {last ? new Date(last.date).toLocaleDateString('fa-IR') : 'ثبت نشده'}
                        </td>
                        <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                          {last ? `${getAssessmentScore(last)} از ۱۰۰` : '-'}
                        </td>
                        <td className="p-3">
                          {hasConsult ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              🚨 ارجاع به مشاوره
                            </span>
                          ) : hasEscalation ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              ⚠️ عدم خوداظهاری
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              ✅ منظم
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {st.phone ? (
                            <a
                              href={`tel:${st.phone.replace(/[^0-9+]/g, '')}`}
                              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-mono font-bold flex items-center gap-1 w-max transition-colors cursor-pointer"
                              title="برقراری تماس مستقیم"
                              dir="ltr"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{st.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );

                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LOGGED REPORTS ARCHIVE */}
      {activeTab === 'ARCHIVE' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            {(!reports || reports.length === 0) ? (
              <div className="text-center py-12 text-slate-400 font-bold">
                گزارش یا یادداشتی ثبت نشده است.
              </div>
            ) : (
              reports.map(report => {
                const authorInfo = getReportAuthorInfo(report, allUsers);
                const student = allUsers?.find(u => u.id === report.studentId);

                return (
                  <div key={report.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span>نویسنده: {authorInfo.name}</span>
                          <span className="text-[10px] font-normal text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md">
                            ({authorInfo.roleLabel})
                          </span>
                        </span>
                        <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                          طلبه: {student?.name || 'نامشخص'} (پایه {student?.base || 1})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {new Date(report.date).toLocaleDateString('fa-IR')}
                      </span>
                    </div>

                    <ReportContentDisplay content={report.content} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Student Detail Full Modal */}
      <StudentDetailModal
        studentId={viewStudentId}
        onClose={() => setViewStudentId(null)}
      />

    </div>
  );
}

