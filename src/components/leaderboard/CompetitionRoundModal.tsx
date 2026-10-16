import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, Calendar, Megaphone, CheckCircle2, AlertCircle, 
  X, Sparkles, Clock, Users, ArrowLeft, RefreshCw, Send, ShieldCheck
} from 'lucide-react';
import { 
  CompetitionRound, 
  getActiveCompetitionRound, 
  saveActiveCompetitionRound, 
  deactivateActiveCompetitionRound,
  getStoredCompetitionRounds 
} from '../../utils/competitionRoundManager';
import { formatJalali, safeFormatDateFa } from '../../utils/date';
import { gregorianToJalali, jalaliToGregorian, JALALI_MONTH_NAMES } from '../../utils/shamsiCalendar';
import { User, Assessment, PrivateNote } from '../../types';
import { calculateLeaderboard, ScoreWeights, DEFAULT_SCORE_WEIGHTS } from '../../utils/scoringSystem';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  assessments: Assessment[];
  notes?: PrivateNote[];
  weights?: ScoreWeights;
  onApplyCustomFilter: (startDate: string, roundTitle?: string) => void;
}

export function CompetitionRoundModal({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  assessments,
  notes = [],
  weights = DEFAULT_SCORE_WEIGHTS,
  onApplyCustomFilter
}: Props) {
  // Current active round from storage
  const [activeRound, setActiveRound] = useState<CompetitionRound | null>(() => getActiveCompetitionRound());

  // Form states
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(''); // ISO YYYY-MM-DD
  const [endDate, setEndDate] = useState('');     // ISO YYYY-MM-DD
  const [description, setDescription] = useState('');
  const [showInAnnouncements, setShowInAnnouncements] = useState(true);
  const [customAnnouncementText, setCustomAnnouncementText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Shamsi selectors
  const [shamsiYear, setShamsiYear] = useState<number>(1405);
  const [shamsiMonth, setShamsiMonth] = useState<number>(1);
  const [shamsiDay, setShamsiDay] = useState<number>(1);

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      const current = getActiveCompetitionRound();
      setActiveRound(current);
      if (current) {
        setTitle(current.title);
        setStartDate(current.startDate);
        setEndDate(current.endDate || '');
        setDescription(current.description || '');
        setShowInAnnouncements(Boolean(current.showInAnnouncements));
        setCustomAnnouncementText(current.customAnnouncementText || '');

        // Convert current.startDate to Shamsi
        try {
          const parts = current.startDate.split('-');
          const gy = parseInt(parts[0], 10);
          const gm = parseInt(parts[1], 10);
          const gd = parseInt(parts[2], 10);
          const j = gregorianToJalali(gy, gm, gd);
          setShamsiYear(j.jy);
          setShamsiMonth(j.jm);
          setShamsiDay(j.jd);
        } catch {
          // ignore
        }
      } else {
        // Default to today
        const now = new Date();
        const j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
        setShamsiYear(j.jy);
        setShamsiMonth(j.jm);
        setShamsiDay(j.jd);
        const iso = now.toISOString().split('T')[0];
        setStartDate(iso);
        setTitle('دور مسابقه جدید امتیازات طلاب');
        setDescription('محاسبه و ارزیابی امتیازات برای ایجاد انگیزه و رقابت سالم در خیرات');
        setShowInAnnouncements(true);
      }
    }
  }, [isOpen]);

  // Handle Shamsi date change and update ISO startDate
  const handleShamsiDateChange = (y: number, m: number, d: number) => {
    setShamsiYear(y);
    setShamsiMonth(m);
    setShamsiDay(d);
    try {
      const g = jalaliToGregorian(y, m, d);
      const iso = `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
      setStartDate(iso);
    } catch {
      // ignore
    }
  };

  // Quick preset dates
  const setQuickPreset = (preset: 'TODAY' | 'WEEK_START' | 'MONTH_START' | '14_DAYS_AGO' | '30_DAYS_AGO') => {
    const now = new Date();
    let target = new Date();

    if (preset === 'TODAY') {
      target = now;
    } else if (preset === '14_DAYS_AGO') {
      target.setDate(now.getDate() - 14);
    } else if (preset === '30_DAYS_AGO') {
      target.setDate(now.getDate() - 30);
    } else if (preset === 'MONTH_START') {
      const curJ = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const g = jalaliToGregorian(curJ.jy, curJ.jm, 1);
      target = new Date(g.gy, g.gm - 1, g.gd);
    } else if (preset === 'WEEK_START') {
      // Saturday is first day in Iran
      const day = now.getDay(); // 0: Sun, 6: Sat
      const diff = day === 6 ? 0 : (day + 1);
      target.setDate(now.getDate() - diff);
    }

    const j = gregorianToJalali(target.getFullYear(), target.getMonth() + 1, target.getDate());
    setShamsiYear(j.jy);
    setShamsiMonth(j.jm);
    setShamsiDay(j.jd);
    const iso = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    setStartDate(iso);
  };

  // Preview calculation for this startDate
  const previewStats = useMemo(() => {
    if (!startDate || allUsers.length === 0) return { count: 0, topScore: 0, avgScore: 0, topStudent: '' };
    const students = allUsers.filter(u => u.role === 'STUDENT' && !u.isDeleted && u.isApproved !== false);
    const board = calculateLeaderboard(students, assessments, notes, 'CUSTOM', weights, [], [], startDate, endDate || undefined);
    if (board.length === 0) return { count: 0, topScore: 0, avgScore: 0, topStudent: '' };
    
    const topScore = board[0]?.periodScore || 0;
    const topStudent = board[0]?.studentName || '';
    const activeCount = board.filter(b => b.periodScore > 0 || b.activeAssessmentsCount > 0).length;
    const sum = board.reduce((acc, b) => acc + b.periodScore, 0);
    const avgScore = Math.round(sum / Math.max(1, board.length));

    return {
      count: activeCount,
      topScore,
      avgScore,
      topStudent
    };
  }, [startDate, endDate, allUsers, assessments, notes, weights]);

  // Save competition round
  const handleSaveRound = async (broadcast: boolean) => {
    if (!title.trim()) {
      alert('لطفاً عنوان دور مسابقه را وارد نمایید.');
      return;
    }
    if (!startDate) {
      alert('لطفاً تاریخ شروع دور مسابقه را انتخاب نمایید.');
      return;
    }

    setIsSaving(true);
    try {
      const round: CompetitionRound = {
        id: activeRound?.id || `round_${Date.now()}`,
        title: title.trim(),
        startDate,
        endDate: endDate ? endDate : undefined,
        description: description.trim(),
        isActive: true,
        showInAnnouncements,
        customAnnouncementText: customAnnouncementText.trim(),
        createdAt: activeRound?.createdAt || new Date().toISOString()
      };

      await saveActiveCompetitionRound(round, currentUser, allUsers, broadcast);
      setActiveRound(round);
      setSuccessMessage(broadcast 
        ? '✅ دور مسابقه با موفقیت فعال شد و اعلان آن برای همه کاربران منتشر گردید.' 
        : '✅ دور مسابقه با موفقیت ذخیره و فعال شد.'
      );
      
      // Also apply filter immediately
      onApplyCustomFilter(startDate, round.title);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    } catch (err: any) {
      alert(`خطا در ذخیره دور مسابقه: ${err.message || 'خطای سیستمی'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Deactivate round
  const handleDeactivate = async () => {
    if (!confirm('آیا مطمئن هستید که می‌خواهید این دور مسابقه را خاتمه دهید؟ (امتیازات به حالت عادی کل دوره بازمی‌گردد)')) {
      return;
    }
    await deactivateActiveCompetitionRound();
    setActiveRound(null);
    setSuccessMessage('دور مسابقه با موفقیت خاتمه یافت.');
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  // Immediate filter apply without saving as official round
  const handleApplyJustFilter = () => {
    if (!startDate) return;
    onApplyCustomFilter(startDate, title || 'بازه انتخابی');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">
                مدیریت دوره‌های مسابقه و اعلان امتیازات
              </h3>
              <p className="text-xs text-amber-200/80">
                لحاظ کردن امتیازات از تاریخی خاص به بعد و مدیریت اعلان‌ها برای همه طلاب
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
          
          {/* Active Round Status Alert */}
          {activeRound && activeRound.isActive ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 p-4 rounded-2xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-900 dark:text-amber-200 text-sm">
                      دور مسابقه فعال در مدرسه: «{activeRound.title}»
                    </span>
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                      فعال
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    امتیازات از تاریخ <strong>{formatJalali(activeRound.startDate)}</strong> تا کنون محاسبه می‌شود.
                    {activeRound.showInAnnouncements && ' (در اعلان‌های همگانی طلاب نیز فعال است)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDeactivate}
                className="px-3 py-1.5 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 whitespace-nowrap cursor-pointer transition-all"
              >
                خاتمه دور مسابقه
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                در حال حاضر دور مسابقه مستقلی فعال نیست و رتبه‌بندی پیش‌فرض بر مبنای کل دوره محاسبه می‌شود.
              </span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-400 text-emerald-800 dark:text-emerald-200 rounded-2xl font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Cutoff Date Selection */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>تاریخ مبدأ و آغاز مسابقه (لحاظ کردن امتیازات از این تاریخ به بعد):</span>
              </label>
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                {startDate ? formatJalali(startDate) : 'انتخاب نشده'}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 font-bold ml-1">انتخاب سریع:</span>
              <button
                type="button"
                onClick={() => setQuickPreset('TODAY')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                امروز
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset('WEEK_START')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                شنبه این هفته
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset('MONTH_START')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                اول این ماه شمسی
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset('14_DAYS_AGO')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                ۱۴ روز اخیر
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset('30_DAYS_AGO')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                ۳۰ روز اخیر
              </button>
            </div>

            {/* Shamsi Year, Month, Day Selectors */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="text-[11px] text-slate-500 font-bold block mb-1">روز</label>
                <select
                  value={shamsiDay}
                  onChange={(e) => handleShamsiDateChange(shamsiYear, shamsiMonth, parseInt(e.target.value, 10))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono text-center font-bold"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-bold block mb-1">ماه</label>
                <select
                  value={shamsiMonth}
                  onChange={(e) => handleShamsiDateChange(shamsiYear, parseInt(e.target.value, 10), shamsiDay)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold text-center"
                >
                  {JALALI_MONTH_NAMES.slice(1).map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>{mName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-bold block mb-1">سال شمسی</label>
                <select
                  value={shamsiYear}
                  onChange={(e) => handleShamsiDateChange(parseInt(e.target.value, 10), shamsiMonth, shamsiDay)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono text-center font-bold"
                >
                  {[1403, 1404, 1405, 1406].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Instant Preview of Stats from this Cutoff Date */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 p-3 rounded-xl">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold block">بالاترین امتیاز دور</span>
                <span className="text-sm font-black text-amber-500 font-mono mt-0.5 block">
                  {previewStats.topScore.toLocaleString('fa-IR')}
                </span>
                <span className="text-[9px] text-slate-500 truncate block">{previewStats.topStudent || '—'}</span>
              </div>

              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold block">میانگین امتیاز طلاب</span>
                <span className="text-sm font-black text-indigo-500 font-mono mt-0.5 block">
                  {previewStats.avgScore.toLocaleString('fa-IR')}
                </span>
                <span className="text-[9px] text-slate-400">امتیاز</span>
              </div>

              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold block">طلاب دارای فعالیت</span>
                <span className="text-sm font-black text-emerald-500 font-mono mt-0.5 block">
                  {previewStats.count.toLocaleString('fa-IR')}
                </span>
                <span className="text-[9px] text-slate-400">نفر</span>
              </div>
            </div>
          </div>

          {/* Section 2: Competition Round Details */}
          <div className="space-y-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                عنوان دور مسابقه / رقابت معنوی:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: دور مسابقه چله نور، فصل بهار ۱۴۰۵، مسابقه سحرخیزی و انس با قرآن"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                توضیحات و اهداف مسابقه (اختیاری):
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="توضیحاتی پیرامون انگیزه شروع این دور مسابقه و جوایز یا تشویق‌های در نظر گرفته شده..."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden text-xs resize-none"
              />
            </div>

            {/* Announcement Section */}
            <div className="bg-amber-500/10 border border-amber-400/30 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInAnnouncements}
                    onChange={(e) => setShowInAnnouncements(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-black text-amber-950 dark:text-amber-200 block">
                      📢 نمایش امتیازات و اعلان همگانی برای همه طلاب
                    </span>
                    <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 block mt-0.5">
                      با فعال‌سازی این گزینه، وضعیت امتیازات از تاریخ انتخابی در تابلوی اعلانات و نوتیفیکیشن‌ها نمایش داده می‌شود.
                    </span>
                  </div>
                </label>
                <Megaphone className="w-5 h-5 text-amber-500 shrink-0" />
              </div>

              {showInAnnouncements && (
                <div className="space-y-2 pt-2 border-t border-amber-300/40 dark:border-amber-700/40">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    متن سفارشی اعلان برای طلاب (اختیاری):
                  </label>
                  <input
                    type="text"
                    value={customAnnouncementText}
                    onChange={(e) => setCustomAnnouncementText(e.target.value)}
                    placeholder="متن پیام اعلان به طلاب... (در صورت خالی بودن، متن استاندارد سامانه نمایش داده می‌شود)"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs"
                  />

                  {/* Preview Banner of Announcement */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-400/40 shadow-2xs">
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 block mb-1">
                      پیش‌نمایش اعلان در پنل طلبه:
                    </span>
                    <div className="text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span>
                          <strong>دور مسابقه «{title || 'مسابقه'}»:</strong> امتیاز شما از تاریخ <strong>{formatJalali(startDate)}</strong> تا کنون: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">۳۵۰ امتیاز</span> (رتبه ۳ در مدرسه)
                        </span>
                      </div>
                      <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold">
                        مشاهده گردونه
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyJustFilter}
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              فقط فیلتر جدول فعلی (بدون ثبت دور)
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold"
            >
              انصراف
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveRound(false)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              ذخیره و فعال‌سازی دور مسابقه
            </button>

            {showInAnnouncements && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveRound(true)}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ذخیره و انتشار فوری در اعلان‌ها</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
