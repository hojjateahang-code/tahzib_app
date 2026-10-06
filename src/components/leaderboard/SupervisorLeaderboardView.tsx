import React, { useState, useMemo } from 'react';
import { useAuth } from '../../store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { 
  Trophy, Medal, Flame, Star, Award, TrendingUp, Users, 
  Calendar, Search, Filter, Download, Settings2, Eye, X, 
  CheckCircle2, BookOpen, Smartphone, ShieldCheck, ChevronRight
} from 'lucide-react';
import { 
  calculateLeaderboard, 
  DEFAULT_SCORE_WEIGHTS, 
  LEVEL_DEFINITIONS,
  StudentScoreProfile,
  ScoreWeights
} from '../../utils/scoringSystem';

interface Props {
  role?: 'VICE_PRINCIPAL' | 'MENTOR' | 'DIRECTOR' | 'TECH_ADMIN';
  defaultBaseFilter?: number;
}

export function SupervisorLeaderboardView({ role, defaultBaseFilter }: Props) {
  const { currentUser } = useAuth();
  const effectiveRole = role || currentUser?.role || 'VICE_PRINCIPAL';

  const [period, setPeriod] = useState<'ALL' | 'MONTH' | 'WEEK'>('ALL');
  const [selectedBase, setSelectedBase] = useState<number | 'ALL'>(defaultBaseFilter || 'ALL');
  const [selectedMentorId, setSelectedMentorId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<StudentScoreProfile | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_SCORE_WEIGHTS);

  // Live queries
  const allUsers = useLiveQuery(() => db.users.toArray(), []) || [];
  const assessments = useLiveQuery(() => db.assessments.toArray(), []) || [];
  const notes = useLiveQuery(() => db.privateNotes.toArray(), []) || [];

  const students = useMemo(() => {
    return allUsers.filter(u => u.role === 'STUDENT' && !u.isDeleted && u.isApproved !== false);
  }, [allUsers]);

  const mentors = useMemo(() => {
    return allUsers.filter(u => (u.role === 'MENTOR' || u.role === 'COUNSELOR') && !u.isDeleted);
  }, [allUsers]);

  // Compute leaderboard
  const rawLeaderboard = useMemo(() => {
    if (students.length === 0) return [];
    return calculateLeaderboard(students, assessments, notes, period, weights);
  }, [students, assessments, notes, period, weights]);

  // Mentors only see their own assigned students by default, unless they choose all
  const filteredProfiles = useMemo(() => {
    let list = [...rawLeaderboard];

    if (effectiveRole === 'MENTOR' && currentUser) {
      list = list.filter(p => p.mentorId === currentUser.id);
    } else if (selectedMentorId !== 'ALL') {
      list = list.filter(p => p.mentorId === selectedMentorId);
    }

    if (selectedBase !== 'ALL') {
      list = list.filter(p => p.base === selectedBase);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p => 
        p.studentName.toLowerCase().includes(q) ||
        (p.nationalId && p.nationalId.includes(q))
      );
    }

    return list;
  }, [rawLeaderboard, effectiveRole, currentUser, selectedMentorId, selectedBase, searchQuery]);

  // High-level statistics
  const stats = useMemo(() => {
    if (rawLeaderboard.length === 0) return { topScore: 0, avgScore: 0, topStreak: 0, topBase: '۱' };

    const topScore = rawLeaderboard[0]?.periodScore || 0;
    const totalScoreSum = rawLeaderboard.reduce((acc, p) => acc + p.periodScore, 0);
    const avgScore = Math.round(totalScoreSum / Math.max(1, rawLeaderboard.length));
    const topStreak = Math.max(0, ...rawLeaderboard.map(p => p.currentStreakDays));

    // Base performance
    const baseMap = new Map<number, { sum: number; count: number }>();
    rawLeaderboard.forEach(p => {
      const b = p.base || 1;
      const cur = baseMap.get(b) || { sum: 0, count: 0 };
      baseMap.set(b, { sum: cur.sum + p.periodScore, count: cur.count + 1 });
    });

    let bestBase = 1;
    let bestAvg = 0;
    baseMap.forEach((val, b) => {
      const avg = val.sum / Math.max(1, val.count);
      if (avg > bestAvg) {
        bestAvg = avg;
        bestBase = b;
      }
    });

    return {
      topScore,
      avgScore,
      topStreak,
      topBase: `پایه ${bestBase}`
    };
  }, [rawLeaderboard]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['رتبه در مدرسه', 'رتبه در پایه', 'نام طلبه', 'کد ملی', 'پایه', 'سطح معنوی', 'استمرار (روز)', 'روزهای ثبت', 'امتیاز نمازها', 'امتیاز سنن', 'امتیاز گوشی', 'امتیاز کل'];
    const rows = filteredProfiles.map(p => [
      p.rankInSchool,
      p.rankInBase,
      `"${p.studentName}"`,
      p.nationalId || '',
      p.base || 1,
      `"${p.level.title}"`,
      p.currentStreakDays,
      p.activeAssessmentsCount,
      p.breakdown.prayers,
      p.breakdown.coreTasks + p.breakdown.tahzibPrograms,
      p.breakdown.digitalDiscipline,
      p.periodScore
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leaderboard_scores_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-lg border border-indigo-900/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-400/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-black text-white">
                سامانه جامع امتیازات، رتبه‌بندی و تشویق معنوی طلاب
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                رصد خودکار فضائل، التزام به جماعت، سحرخیزی، استمرار روزانه و انضباط دیجیتال
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer shadow-xs"
          >
            <Settings2 className="w-4 h-4 text-indigo-300" />
            <span>تنظیمات ضرایب امتیازدهی</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>خروجی اکسل رتبه‌بندی</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">بالاترین امتیاز کسب‌شده</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-amber-500 font-mono">
              {stats.topScore.toLocaleString('fa-IR')}
            </span>
            <span className="text-[10px] text-slate-400">امتیاز</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">میانگین امتیاز کل طلاب</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {stats.avgScore.toLocaleString('fa-IR')}
            </span>
            <span className="text-[10px] text-slate-400">امتیاز</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">برترین پایه تحصیلی</span>
            <Star className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
              {stats.topBase}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">بیشترین میانگین</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">رکورد استمرار و مداومت</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
              {stats.topStreak}
            </span>
            <span className="text-[10px] text-slate-400">روز پیوسته</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        {/* Period Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setPeriod('ALL')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              period === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            کل دوره
          </button>
          <button
            type="button"
            onClick={() => setPeriod('MONTH')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              period === 'MONTH'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            ۳۰ روز اخیر
          </button>
          <button
            type="button"
            onClick={() => setPeriod('WEEK')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              period === 'WEEK'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            ۷ روز اخیر
          </button>
        </div>

        {/* Dropdowns & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Base selector */}
          <select
            value={selectedBase}
            onChange={e => setSelectedBase(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">همه پایه‌های تحصیلی</option>
            {[1, 2, 3, 4, 5, 6].map(b => (
              <option key={b} value={b}>پایه {b}</option>
            ))}
          </select>

          {/* Mentor selector if not mentor */}
          {effectiveRole !== 'MENTOR' && mentors.length > 0 && (
            <select
              value={selectedMentorId}
              onChange={e => setSelectedMentorId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">همه اساتید راهنما</option>
              {mentors.map(m => (
                <option key={m.id} value={m.id}>استاد {m.name}</option>
              ))}
            </select>
          )}

          {/* Search box */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="جستجوی نام یا کدملی..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
              جدول رتبه‌بندی جامع طلاب مدرسه
            </h4>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
              {filteredProfiles.length} نفر
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-extrabold">
                <th className="p-3.5 text-center w-14">رتبه</th>
                <th className="p-3.5">طلبه</th>
                <th className="p-3.5 text-center">پایه</th>
                <th className="p-3.5 text-center">سطح معنوی</th>
                <th className="p-3.5 text-center">روزهای مداومت</th>
                <th className="p-3.5 text-center">تعداد ثبت</th>
                <th className="p-3.5 text-center">تفکیک امتیازات</th>
                <th className="p-3.5 text-left pl-6">امتیاز دوره</th>
                <th className="p-3.5 text-center w-20">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 font-bold">
                    طلبه‌ای در این دسته‌بندی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p, idx) => (
                  <tr
                    key={p.studentId}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-3.5 text-center font-mono font-black">
                      {p.rankInSchool === 1 && <span className="text-base">🥇</span>}
                      {p.rankInSchool === 2 && <span className="text-base">🥈</span>}
                      {p.rankInSchool === 3 && <span className="text-base">🥉</span>}
                      {p.rankInSchool > 3 && (
                        <span className="w-7 h-7 rounded-xl inline-flex items-center justify-center font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.rankInSchool}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-200 dark:border-indigo-800">
                          {p.studentName.slice(0, 1)}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 block">
                            {p.studentName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {p.nationalId || 'بدون کدملی'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-center font-bold text-slate-600 dark:text-slate-300">
                      پایه {p.base || 1}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${p.level.badgeColor} ${p.level.bgLight} ${p.level.borderLight}`}>
                        {p.level.title}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      {p.currentStreakDays > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                          <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{p.currentStreakDays} روز</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                      {p.activeAssessmentsCount} روز
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold" title="نمازها">
                          نماز: {p.breakdown.prayers}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold" title="سنن و برنامه‌ها">
                          سنن: {p.breakdown.coreTasks + p.breakdown.tahzibPrograms}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold" title="انضباط گوشی">
                          گوشی: {p.breakdown.digitalDiscipline}
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 text-left pl-6 font-mono font-black text-sm text-indigo-700 dark:text-indigo-300">
                      {p.periodScore.toLocaleString('fa-IR')}
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedProfile(p)}
                        className="p-1.5 hover:bg-indigo-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                        title="مشاهده جزئیات کارنامه"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Breakdown Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  {selectedProfile.studentName.slice(0, 1)}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    کارنامه جامع: {selectedProfile.studentName}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold">
                    پایه {selectedProfile.base || 1} • کدملی: {selectedProfile.nationalId || 'نامشخص'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedProfile(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">امتیاز بازه انتخابی</span>
                <span className="text-base font-black text-indigo-600 font-mono">
                  {selectedProfile.periodScore.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">رتبه در مدرسه</span>
                <span className="text-base font-black text-amber-500 font-mono">
                  {selectedProfile.rankInSchool}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">رتبه در پایه</span>
                <span className="text-base font-black text-emerald-600 font-mono">
                  {selectedProfile.rankInBase}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-extrabold text-slate-700 dark:text-slate-200 block text-xs mb-1">
                تفکیک ریز امتیازات:
              </span>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center">
                <span>نمازهای یومیه (جماعت و فرادی)</span>
                <strong className="text-emerald-600 font-mono">+{selectedProfile.breakdown.prayers}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center">
                <span>سنن و تکالیف تهذیبی (سحر، تلاوت، کلاس، مباحثه)</span>
                <strong className="text-indigo-600 font-mono">+{selectedProfile.breakdown.coreTasks}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center">
                <span>برنامه‌های مصوب تهذیب مدرسه</span>
                <strong className="text-teal-600 font-mono">+{selectedProfile.breakdown.tahzibPrograms}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center">
                <span>سنن و چله‌های اختصاصی</span>
                <strong className="text-blue-600 font-mono">+{selectedProfile.breakdown.habits}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center">
                <span>انضباط دیجیتال و پرهیز از گوشی بعد از ۲۲:۳۰</span>
                <strong className="text-purple-600 font-mono">+{selectedProfile.breakdown.digitalDiscipline}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center">
                <span>نظم در ثبت روزانه خوداظهاری</span>
                <strong className="text-slate-700 dark:text-slate-200 font-mono">+{selectedProfile.breakdown.consistency}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center">
                <span>پاداش استمرار متوالی ({selectedProfile.currentStreakDays} روز streak)</span>
                <strong className="text-amber-600 font-mono">+{selectedProfile.breakdown.streakBonus}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProfile(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-5 py-2 rounded-xl text-xs cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-black text-base">
                <Settings2 className="w-5 h-5" />
                <span>تنظیم اوزان و ضرایب امتیازدهی نظام تهذیب</span>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              شما می‌توانید ضرایب امتیازدهی هر بخش را بر اساس سیاست‌های تربیتی مدرسه تنظیم کنید. این تغییرات بر محاسبه کارنامه تأثیر مستقیم خواهد داشت.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">نماز جماعت (هر وعده):</label>
                  <input 
                    type="number"
                    min="1" max="100"
                    value={weights.prayerJamaat}
                    onChange={e => setWeights(prev => ({ ...prev, prayerJamaat: Number(e.target.value) }))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 font-bold"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">سحرخیزی و نماز شب:</label>
                  <input 
                    type="number"
                    min="1" max="100"
                    value={weights.saharKhizi}
                    onChange={e => setWeights(prev => ({ ...prev, saharKhizi: Number(e.target.value) }))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 font-bold"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">تلاوت قرآن (تلاوت نور):</label>
                  <input 
                    type="number"
                    min="1" max="100"
                    value={weights.telavatNoor}
                    onChange={e => setWeights(prev => ({ ...prev, telavatNoor: Number(e.target.value) }))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 font-bold"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">برنامه‌های تهذیبی مدرسه:</label>
                  <input 
                    type="number"
                    min="1" max="100"
                    value={weights.tahzibProgramCompleted}
                    onChange={e => setWeights(prev => ({ ...prev, tahzibProgramCompleted: Number(e.target.value) }))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 font-bold"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">پرهیز از گوشی بعد از ۲۲:۳۰:</label>
                  <input 
                    type="number"
                    min="1" max="100"
                    value={weights.screenTimeNoNightUsage}
                    onChange={e => setWeights(prev => ({ ...prev, screenTimeNoNightUsage: Number(e.target.value) }))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 font-bold"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">نظم در ثبت روزانه:</label>
                  <input 
                    type="number"
                    min="1" max="100"
                    value={weights.onTimeSubmission}
                    onChange={e => setWeights(prev => ({ ...prev, onTimeSubmission: Number(e.target.value) }))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setWeights(DEFAULT_SCORE_WEIGHTS)}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
              >
                بازنشانی به ضرایب پیش‌فرض
              </button>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-2 rounded-xl text-xs cursor-pointer shadow-md"
              >
                ذخیره و اعمال ضرایب
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
