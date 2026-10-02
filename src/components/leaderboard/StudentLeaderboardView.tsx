import React, { useState, useMemo } from 'react';
import { useAuth } from '../../store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { 
  Trophy, Medal, Flame, Sparkles, Star, ChevronDown, 
  HelpCircle, Search, ShieldCheck, Award, ArrowUpRight,
  TrendingUp, Users, Calendar, Moon, Smartphone, CheckCircle2,
  BookOpen, HeartHandshake, Eye, X
} from 'lucide-react';
import { 
  calculateLeaderboard, 
  LEVEL_DEFINITIONS, 
  DEFAULT_SCORE_WEIGHTS,
  StudentScoreProfile 
} from '../../utils/scoringSystem';
import { GraduationCap } from 'lucide-react';

export function StudentLeaderboardView() {
  const { currentUser } = useAuth();
  const [period, setPeriod] = useState<'ALL' | 'MONTH' | 'WEEK'>('ALL');
  const [baseFilter, setBaseFilter] = useState<'ALL' | 'MY_BASE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [selectedProfileModal, setSelectedProfileModal] = useState<StudentScoreProfile | null>(null);

  // Live queries
  const students = useLiveQuery(() => db.users.where('role').equals('STUDENT').toArray(), []);
  const assessments = useLiveQuery(() => db.assessments.toArray(), []);
  const notes = useLiveQuery(() => db.privateNotes.toArray(), []);
  const enrollments = useLiveQuery(() => db.studentCourseEnrollments.toArray(), []);
  const programs = useLiveQuery(() => db.tahzibPrograms.toArray(), []);

  // Compute full leaderboard
  const fullLeaderboard = useMemo(() => {
    if (!students || !assessments) return [];
    return calculateLeaderboard(
      students, 
      assessments, 
      notes || [], 
      period, 
      DEFAULT_SCORE_WEIGHTS, 
      enrollments || [], 
      programs || []
    );
  }, [students, assessments, notes, period, enrollments, programs]);

  // Current user's profile
  const myProfile = useMemo(() => {
    if (!currentUser || fullLeaderboard.length === 0) return null;
    return fullLeaderboard.find(p => p.studentId === currentUser.id) || null;
  }, [fullLeaderboard, currentUser]);

  // Filtered leaderboard list based on baseFilter and search
  const displayedProfiles = useMemo(() => {
    let list = [...fullLeaderboard];

    if (baseFilter === 'MY_BASE' && currentUser?.base) {
      list = list.filter(p => p.base === currentUser.base);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p => 
        p.studentName.toLowerCase().includes(q) ||
        (p.nationalId && p.nationalId.includes(q))
      );
    }

    return list;
  }, [fullLeaderboard, baseFilter, currentUser?.base, searchQuery]);

  // Top 3 Podium
  const topThree = useMemo(() => {
    return displayedProfiles.slice(0, 3);
  }, [displayedProfiles]);

  if (!currentUser) return null;

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* Top Spiritual Competition Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 p-6 sm:p-8 text-white shadow-xl border border-indigo-800/60">
        <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 bg-amber-400/20 text-amber-300 rounded-2xl border border-amber-400/30 shadow-inner">
                <Trophy className="w-6 h-6" />
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                گردونه امتیازات و سبقت در خیرات طلاب
              </h3>
              <span className="text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-400/30">
                فَاسْتَبِقُوا الْخَيْرَاتِ
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              سامانه هوشمند ثبت و ارزیابی فضائل، عبادات، سنن تهذیبی، استمرار روزانه و انضباط اخلاقی. در میدان رشد معنوی، هر عمل صالح و هر روز مداومت دارای اجر و ارتقای رتبه است.
            </p>

            <div className="flex items-center gap-3 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="bg-white/10 hover:bg-white/20 active:scale-95 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 border border-white/20 cursor-pointer shadow-sm"
              >
                <HelpCircle className="w-4 h-4 text-amber-300" />
                <span>نظام‌نامه و جدول ضرایب امتیازات</span>
              </button>

              {myProfile && myProfile.currentStreakDays > 0 && (
                <div className="bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                  <span>{myProfile.currentStreakDays} روز مداومت پیاپی</span>
                </div>
              )}
            </div>
          </div>

          {/* Current User Quick Summary Card */}
          {myProfile && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 w-full lg:w-80 shadow-2xl flex flex-col justify-between shrink-0">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 text-indigo-200 border border-indigo-400/30 flex items-center justify-center font-black text-sm shadow-inner">
                    {currentUser.name ? currentUser.name.slice(0, 1) : 'ط'}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{currentUser.name}</h4>
                    <span className="text-[10px] text-slate-300">
                      پایه {currentUser.base || 1} تحصیلی
                    </span>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[10px] text-slate-300 font-bold block">امتیاز کل:</span>
                  <span className="text-lg font-black text-amber-300 font-mono">
                    {myProfile.totalScore.toLocaleString('fa-IR')}
                  </span>
                </div>
              </div>

              {/* Ranks */}
              <div className="grid grid-cols-2 gap-2 my-3">
                <div className="bg-slate-900/60 p-2.5 rounded-2xl border border-white/10 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">رتبه در مدرسه</span>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <Medal className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-black text-white font-mono">
                      {myProfile.rankInSchool.toLocaleString('fa-IR')}
                    </span>
                    <span className="text-[10px] text-slate-400">از {myProfile.totalStudentsInSchool}</span>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-2xl border border-white/10 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">رتبه در پایه</span>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <Award className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-black text-white font-mono">
                      {myProfile.rankInBase.toLocaleString('fa-IR')}
                    </span>
                    <span className="text-[10px] text-slate-400">از {myProfile.totalStudentsInBase}</span>
                  </div>
                </div>
              </div>

              {/* Level Progress */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-extrabold text-amber-300 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    <span>سطح: {myProfile.level.title}</span>
                  </span>
                  <span className="text-[10px] text-slate-300">
                    {myProfile.level.progressPercent}٪ تا سطح بعد
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden border border-white/10 flex">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${myProfile.level.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Period Selection Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        {/* Period Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setPeriod('ALL')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              period === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>کل دوره (همیشگی)</span>
          </button>

          <button
            type="button"
            onClick={() => setPeriod('MONTH')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              period === 'MONTH'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>۳۰ روز اخیر (ماهانه)</span>
          </button>

          <button
            type="button"
            onClick={() => setPeriod('WEEK')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              period === 'WEEK'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>۷ روز اخیر (هفتگی)</span>
          </button>
        </div>

        {/* Base Filter & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setBaseFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                baseFilter === 'ALL' 
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs font-black' 
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              کل مدرسه
            </button>
            <button
              type="button"
              onClick={() => setBaseFilter('MY_BASE')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                baseFilter === 'MY_BASE' 
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-black' 
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              پایه من ({currentUser.base || 1})
            </button>
          </div>

          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="جستجوی نام طلبه..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards (سکوی افتخار) */}
      {topThree.length > 0 && !searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Rank 2 (Silver) */}
          {topThree[1] && (
            <div 
              onClick={() => setSelectedProfileModal(topThree[1])}
              className="order-2 md:order-1 bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-md hover:shadow-lg transition-all flex flex-col items-center text-center relative overflow-hidden cursor-pointer group"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-slate-300/20 dark:bg-slate-700/20 rounded-bl-full pointer-events-none"></div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 flex items-center justify-center font-black text-base shadow-md mb-2 relative">
                🥈
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 text-white rounded-full text-[10px] font-black flex items-center justify-center border border-white">
                  ۲
                </span>
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                {topThree[1].studentName}
              </h4>
              <span className="text-[11px] text-slate-500 font-bold mt-0.5">
                پایه {topThree[1].base || 1} • {topThree[1].level.title}
              </span>
              <div className="mt-3 bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono font-black text-slate-800 dark:text-slate-100 text-sm">
                {topThree[1].periodScore.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-500">امتیاز</span>
              </div>
            </div>
          )}

          {/* Rank 1 (Gold - Highest) */}
          {topThree[0] && (
            <div 
              onClick={() => setSelectedProfileModal(topThree[0])}
              className="order-1 md:order-2 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 p-6 rounded-3xl border-2 border-amber-400 dark:border-amber-500 shadow-xl hover:shadow-2xl transition-all flex flex-col items-center text-center relative overflow-hidden cursor-pointer group scale-100 md:-translate-y-2"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/20 rounded-bl-full pointer-events-none"></div>
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-amber-950 flex items-center justify-center font-black text-2xl shadow-lg mb-2 relative border-2 border-white">
                👑
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-amber-600 text-white rounded-full text-xs font-black flex items-center justify-center border-2 border-white shadow-md">
                  ۱
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-600 dark:text-amber-400 mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>رتبه اول اخلاق و تهذیب</span>
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                {topThree[0].studentName}
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                پایه {topThree[0].base || 1} • {topThree[0].level.title}
              </span>
              <div className="mt-3 bg-amber-100 dark:bg-amber-900/60 px-5 py-2 rounded-2xl border border-amber-300 dark:border-amber-700 font-mono font-black text-amber-950 dark:text-amber-200 text-base shadow-xs">
                {topThree[0].periodScore.toLocaleString('fa-IR')} <span className="text-xs font-normal">امتیاز</span>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {topThree[2] && (
            <div 
              onClick={() => setSelectedProfileModal(topThree[2])}
              className="order-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-amber-700/40 dark:border-amber-800/50 shadow-md hover:shadow-lg transition-all flex flex-col items-center text-center relative overflow-hidden cursor-pointer group"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-700/10 rounded-bl-full pointer-events-none"></div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center font-black text-base shadow-md mb-2 relative">
                🥉
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-800 text-white rounded-full text-[10px] font-black flex items-center justify-center border border-white">
                  ۳
                </span>
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                {topThree[2].studentName}
              </h4>
              <span className="text-[11px] text-slate-500 font-bold mt-0.5">
                پایه {topThree[2].base || 1} • {topThree[2].level.title}
              </span>
              <div className="mt-3 bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono font-black text-slate-800 dark:text-slate-100 text-sm">
                {topThree[2].periodScore.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-500">امتیاز</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Leaderboard Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">
              جدول رده‌بندی عمومی طلاب
            </h4>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
              {displayedProfiles.length} طلبه
            </span>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            کلیک روی هر سطر جهت مشاهده ریز امتیازات و کارنامه
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-extrabold">
                <th className="p-3.5 text-center w-16">رتبه</th>
                <th className="p-3.5">نام طلبه</th>
                <th className="p-3.5 text-center">پایه</th>
                <th className="p-3.5 text-center">سطح معنوی</th>
                <th className="p-3.5 text-center">استمرار</th>
                <th className="p-3.5 text-left pl-6">امتیاز دوره</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {displayedProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-bold">
                    طلبه‌ای با این مشخصات یافت نشد.
                  </td>
                </tr>
              ) : (
                displayedProfiles.map((p, idx) => {
                  const isMe = p.studentId === currentUser.id;
                  const rankNumber = baseFilter === 'MY_BASE' ? p.rankInBase : p.rankInSchool;

                  return (
                    <tr
                      key={p.studentId}
                      onClick={() => setSelectedProfileModal(p)}
                      className={`transition-colors cursor-pointer ${
                        isMe 
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/50 font-bold' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Rank */}
                      <td className="p-3.5 text-center font-mono font-black">
                        {rankNumber === 1 && <span className="text-base">🥇</span>}
                        {rankNumber === 2 && <span className="text-base">🥈</span>}
                        {rankNumber === 3 && <span className="text-base">🥉</span>}
                        {rankNumber > 3 && (
                          <span className={`w-7 h-7 rounded-xl inline-flex items-center justify-center font-bold text-xs ${
                            isMe ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {rankNumber}
                          </span>
                        )}
                      </td>

                      {/* Name & Badge */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isMe ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}>
                            {p.studentName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-800 dark:text-slate-100">
                                {p.studentName}
                              </span>
                              {isMe && (
                                <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-black">
                                  شما
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {p.activeAssessmentsCount} روز ارزیابی ثبت‌شده
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Base */}
                      <td className="p-3.5 text-center font-bold text-slate-600 dark:text-slate-300">
                        پایه {p.base || 1}
                      </td>

                      {/* Level */}
                      <td className="p-3.5 text-center">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border ${p.level.badgeColor} ${p.level.bgLight} ${p.level.borderLight}`}>
                          {p.level.title}
                        </span>
                      </td>

                      {/* Streak */}
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

                      {/* Period Points */}
                      <td className="p-3.5 text-left pl-6 font-mono font-black text-sm text-indigo-700 dark:text-indigo-300">
                        {p.periodScore.toLocaleString('fa-IR')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules & Guidelines Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-black text-base">
                <HelpCircle className="w-5 h-5" />
                <span>نظام‌نامه جامع امتیازدهی و ضرایب معنوی</span>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                امتیازات سامانه تهذیب برای تشویق طلاب به نظم، مداومت و انس با سنن حوزوی به صورت خودکار از فعالیت‌های روزانه محاسبه می‌شود:
              </p>

              {/* Rules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>نمازهای یومیه (حداکثر ۱۰۰ امتیاز روزانه)</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                    <li>نماز به جماعت: <strong>۲۰ امتیاز</strong> به ازای هر وعده</li>
                    <li>نماز فرادی: <strong>۱۰ امتیاز</strong> به ازای هر وعده</li>
                    <li>نماز قضا: <strong>۲ امتیاز</strong></li>
                  </ul>
                </div>

                <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-indigo-800 dark:text-indigo-200">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>سنن و تکالیف تهذیبی</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                    <li>سحرخیزی و نماز شب: <strong>۲۵ امتیاز</strong></li>
                    <li>تلاوت قرآن (تلاوت نور): <strong>۱۵ امتیاز</strong></li>
                    <li>حضور منظم در کلاس‌ها: <strong>۱۵ امتیاز</strong></li>
                    <li>مباحثه علمی: <strong>۱۵ امتیاز</strong></li>
                    <li>خواب اول شب: <strong>۱۰ امتیاز</strong></li>
                  </ul>
                </div>

                <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-purple-800 dark:text-purple-200">
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    <span>انضباط دیجیتال و پایش گوشی</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                    <li>استخراج خودکار از گوشی: <strong>۱۰ امتیاز</strong></li>
                    <li>پرهیز از گوشی بعد از ۲۲:۳۰: <strong>۱۵ امتیاز تشویقی</strong></li>
                    <li>استفاده کل روزانه زیر ۹۰ دقیقه: <strong>۱۰ امتیاز تشویقی</strong></li>
                  </ul>
                </div>

                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-200">
                    <Flame className="w-4 h-4 text-amber-600" />
                    <span>امتیاز استمرار و مداومت متوالی</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                    <li>ثبت خوداظهاری در موعد مقرر: <strong>۱۰ امتیاز</strong></li>
                    <li>۳ روز متوالی: <strong>+۱۵ امتیاز</strong> | ۷ روز متوالی: <strong>+۵۰ امتیاز</strong></li>
                    <li>۱۴ روز متوالی: <strong>+۱۲۰ امتیاز</strong> | ۲۱ روز: <strong>+۲۰۰ امتیاز</strong></li>
                    <li>۴۰ روز پیاپی (چله کامل): <strong>+۴۰۰ امتیاز ویژه</strong></li>
                  </ul>
                </div>
              </div>

              {/* Levels explanation */}
              <div className="pt-2">
                <h5 className="font-black text-slate-800 dark:text-slate-100 mb-2">درجات و سطوح معنوی:</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  {LEVEL_DEFINITIONS.map(lvl => (
                    <div key={lvl.levelNumber} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className={`font-black block ${lvl.badgeColor}`}>{lvl.title}</span>
                      <span className="text-slate-400 text-[10px]">از {lvl.minScore} امتیاز</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="bg-indigo-600 text-white font-black px-6 py-2 rounded-xl text-xs cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Breakdown Modal */}
      {selectedProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  {selectedProfileModal.studentName.slice(0, 1)}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    کارنامه امتیازی: {selectedProfileModal.studentName}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold">
                    پایه {selectedProfileModal.base || 1} • {selectedProfileModal.level.title}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedProfileModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">امتیاز کل</span>
                <span className="text-base font-black text-amber-500 font-mono">
                  {selectedProfileModal.totalScore.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">رتبه در مدرسه</span>
                <span className="text-base font-black text-indigo-600 font-mono">
                  {selectedProfileModal.rankInSchool}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">رتبه در پایه</span>
                <span className="text-base font-black text-emerald-600 font-mono">
                  {selectedProfileModal.rankInBase}
                </span>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-2 pt-1 text-xs">
              <span className="font-extrabold text-slate-700 dark:text-slate-200 block text-xs">
                تفکیک امتیازات کسب‌شده در این بازه:
              </span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">نمازهای یومیه (جماعت و فرادی)</span>
                  <span className="font-mono font-black text-emerald-600">+{selectedProfileModal.breakdown.prayers}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">سنن تهذیبی (سحرخیزی، تلاوت، کلاس، مباحثه)</span>
                  <span className="font-mono font-black text-indigo-600">+{selectedProfileModal.breakdown.coreTasks}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">برنامه‌های مصوب تهذیب مدرسه</span>
                  <span className="font-mono font-black text-teal-600">+{selectedProfileModal.breakdown.tahzibPrograms}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">سنن اختصاصی و چله‌های فردی</span>
                  <span className="font-mono font-black text-blue-600">+{selectedProfileModal.breakdown.habits}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">انضباط دیجیتال و عدم استفاده شبانه از گوشی</span>
                  <span className="font-mono font-black text-purple-600">+{selectedProfileModal.breakdown.digitalDiscipline}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">نظم در ثبت روزانه خوداظهاری</span>
                  <span className="font-mono font-black text-slate-700 dark:text-slate-200">+{selectedProfileModal.breakdown.consistency}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">پاداش مداومت متوالی (استمرار)</span>
                  <span className="font-mono font-black text-amber-600">+{selectedProfileModal.breakdown.streakBonus}</span>
                </div>
                {selectedProfileModal.breakdown.notes > 0 && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl flex justify-between items-center">
                    <span className="font-bold text-slate-700 dark:text-slate-300">یادداشت‌های محاسبه نفس</span>
                    <span className="font-mono font-black text-rose-600">+{selectedProfileModal.breakdown.notes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProfileModal(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-5 py-2 rounded-xl text-xs cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
