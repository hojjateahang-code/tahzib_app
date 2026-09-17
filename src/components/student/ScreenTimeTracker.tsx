import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store';
import { db } from '../../db';
import { Assessment, ScreenTimeData } from '../../types';
import { uploadFileToMinIO, triggerSync } from '../../sync';
import { 
  Smartphone, Clock, Image as ImageIcon, Info, Save, CheckCircle2, 
  UploadCloud, PieChart, ShieldAlert, Sparkles, AlertCircle, FileText, BarChart, Plus, Trash2, Check
} from 'lucide-react';

const APP_NAME_MAP: Record<string, string> = {
  'ir.eitaa.messenger': 'ایتا',
  'ir.resaneh.bale': 'بله',
  'org.telegram.messenger': 'تلگرام',
  'com.instagram.android': 'اینستاگرام',
  'com.whatsapp': 'واتساپ',
  'ir.rubika': 'روبیکا',
  'com.android.chrome': 'مرورگر کروم',
  'com.google.android.youtube': 'یوتیوب',
  'ir.aparat': 'آپارات',
  'com.lenovo.anyshare.gps': 'شیرایت (ShareIt)',
  'com.supercell.clashofclans': 'کلش آف کلنز',
  'com.supercell.brawlstars': 'براول استارز',
  'com.pubg.imobile': 'پابجی موبایل',
  'org.hafez.quran': 'قرآن کریم',
  'com.hawzah.app': 'برنامه حوزه علمیه',
  'com.noorsoft.tafsir': 'تفسیر نور',
  'ir.farsidic': 'دیکشنری فست‌دیکشنری',
  'org.coursera.android': 'کورسرا',
  'ir.divar': 'دیوار',
  'ir.snapp.passenger': 'اسنپ',
  'ir.tapsi.passenger': 'تپسی',
};

const getReadableAppName = (packageName: string): string => {
  const cleanPkg = packageName.trim().toLowerCase();
  for (const [pkg, displayName] of Object.entries(APP_NAME_MAP)) {
    if (cleanPkg.includes(pkg.toLowerCase()) || pkg.toLowerCase().includes(cleanPkg)) {
      return displayName;
    }
  }
  const parts = packageName.split('.');
  if (parts.length >= 2) {
    const ignoreWords = ['com', 'ir', 'org', 'net', 'gov', 'android', 'google'];
    let mainPart = parts[1];
    if (ignoreWords.includes(parts[0].toLowerCase()) && parts[2]) {
      mainPart = parts[1].toLowerCase() === 'google' || parts[1].toLowerCase() === 'android' ? parts[2] : parts[1];
    }
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
  }
  return packageName;
};

export function ScreenTimeTracker() {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  // Dynamic Apps Dictionary State: { [appName]: durationInMinutes }
  const [dynamicApps, setDynamicApps] = useState<Record<string, number>>({});
  
  // Custom app input fields
  const [newAppName, setNewAppName] = useState<string>('');
  const [newAppMins, setNewAppMins] = useState<number>(30);
  
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [extractNotice, setExtractNotice] = useState<string | null>(null);

  // Parse legacy state to dynamic
  const getDynamicAppsFromLegacy = (st: ScreenTimeData): Record<string, number> => {
    if (st.dynamicApps && Object.keys(st.dynamicApps).length > 0) {
      return st.dynamicApps;
    }
    const dynamic: Record<string, number> = {};
    if (st.apps) {
      if (st.apps.eitaa) dynamic['ایتا'] = st.apps.eitaa;
      if (st.apps.bale) dynamic['بله'] = st.apps.bale;
      if (st.apps.telegramSocial) dynamic['تلگرام'] = st.apps.telegramSocial;
      if (st.apps.studyReading) dynamic['کتب حوزوی و علمی'] = st.apps.studyReading;
      if (st.apps.gamesMedia) dynamic['بازی و سرگرمی'] = st.apps.gamesMedia;
      if (st.apps.other) dynamic['سایر برنامه‌ها'] = st.apps.other;
    }
    return dynamic;
  };

  const isAppProductive = (name: string): boolean => {
    const l = name.toLowerCase();
    return l.includes('ایتا') || l.includes('بله') || l.includes('روبیکا') || 
           l.includes('قرآن') || l.includes('کتاب') || l.includes('درس') || 
           l.includes('حوزه') || l.includes('مطالعه') || l.includes('tafsir') || 
           l.includes('quran') || l.includes('hawzah') || l.includes('study') || 
           l.includes('noor') || l.includes('علمی');
  };

  // Load existing screen time assessment for selected date
  useEffect(() => {
    let isSubscribed = true;
    if (!currentUser) return;

    db.assessments
      .where('studentId')
      .equals(currentUser.id)
      .filter(a => a.date === selectedDate)
      .first()
      .then(existing => {
        if (!isSubscribed) return;
        if (existing) {
          setAssessment(existing);
          if (existing.screenTime) {
            const st = existing.screenTime;
            setDynamicApps(getDynamicAppsFromLegacy(st));
            setScreenshotUrl(st.screenshotUrl || '');
            setNotes(st.notes || '');
          }
        } else {
          setAssessment(null);
          setDynamicApps({});
          setScreenshotUrl('');
          setNotes('');
        }
      });

    return () => { isSubscribed = false; };
  }, [currentUser?.id, selectedDate]);

  // Extract usage stats automatically from Android bridge or simulate for web preview
  const handleExtractUsageStats = () => {
    const bridge = (window as any).AndroidBridge;

    if (bridge) {
      try {
        if (!bridge.hasUsageStatsPermission()) {
          bridge.requestUsageStatsPermission();
          setExtractNotice('صفحه تنظیمات باز شد. دسترسی پایش را فعال نموده و مجدداً امتحان کنید.');
          return;
        }

        const statsString = bridge.getAppUsageStats();
        if (statsString) {
          const statsList: { packageName: string; usageTimeMillis: number }[] = JSON.parse(statsString);
          
          const extracted: Record<string, number> = {};
          statsList.forEach(item => {
            const mins = Math.round(item.usageTimeMillis / 60000);
            if (mins <= 0) return;

            const friendlyName = getReadableAppName(item.packageName);
            extracted[friendlyName] = (extracted[friendlyName] || 0) + mins;
          });

          setDynamicApps(extracted);
          setExtractNotice('✅ آمار زنده گوشی استخراج و در لیست جای‌گذاری شد.');
          setTimeout(() => setExtractNotice(null), 4000);
        }
      } catch (err) {
        console.error('Error fetching usage stats:', err);
        setExtractNotice('خطا در دریافت اطلاعات آمار مصرف.');
      }
    } else {
      // Simulation for web preview / Eitaa mini app
      setDynamicApps({
        'ایتا': 110,
        'بله': 40,
        'تلگرام': 25,
        'قرآن کریم': 85,
        'بازی کلش': 15,
      });

      setExtractNotice('ℹ️ در نسخه وب/ایتا آمار آزمایشی لود شد. در نسخه اندروید (APK)، آمار زنده گوشی استخراج می‌شود.');
      setTimeout(() => setExtractNotice(null), 6000);
    }
  };

  const totalCalculatedMinutes = (Object.values(dynamicApps) as number[]).reduce((acc: number, v: number) => acc + (Number(v) || 0), 0);
  const productiveMinutes = (Object.entries(dynamicApps) as [string, number][])
    .filter(([name]) => isAppProductive(name))
    .reduce((acc: number, [_, mins]) => acc + (Number(mins) || 0), 0);
  const usefulRatio = Number(totalCalculatedMinutes) > 0 ? Math.round((productiveMinutes / totalCalculatedMinutes) * 100) : 0;

  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} دقیقه`;
    if (m === 0) return `${h} ساعت`;
    return `${h}س و ${m}د`;
  };

  // Upload Screenshot of Digital Wellbeing
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const minioRes = await uploadFileToMinIO(file);
    setIsUploading(false);

    if (minioRes.success && minioRes.url) {
      setScreenshotUrl(minioRes.url);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenshotUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Screen Time Assessment
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    // We also map legacy fields to keep historical reporting working smoothly
    const screenTimeData: ScreenTimeData = {
      totalMinutes: Number(totalCalculatedMinutes),
      apps: {
        eitaa: Number(dynamicApps['ایتا']) || 0,
        bale: Number(dynamicApps['بله']) || 0,
        telegramSocial: (Number(dynamicApps['تلگرام']) || 0) + (Number(dynamicApps['اینستاگرام']) || 0),
        studyReading: (Number(dynamicApps['قرآن کریم']) || 0) + (Number(dynamicApps['کتب حوزوی و علمی']) || 0) + (Number(dynamicApps['برنامه حوزه علمیه']) || 0) + (Number(dynamicApps['تفسیر نور']) || 0),
        gamesMedia: (Number(dynamicApps['بازی کلش']) || 0) + (Number(dynamicApps['کلش آف کلنز']) || 0) + (Number(dynamicApps['بازی و سرگرمی']) || 0),
        other: Object.entries(dynamicApps)
          .filter(([k]) => !['ایتا', 'بله', 'تلگرام', 'اینستاگرام', 'قرآن کریم', 'کتب حوزوی و علمی', 'برنامه حوزه علمیه', 'تفسیر نور', 'بازی کلش', 'کلش آف کلنز', 'بازی و سرگرمی'].includes(k))
          .reduce((acc: number, [_, v]) => acc + (Number(v) || 0), 0)
      },
      dynamicApps,
      screenshotUrl,
      notes
    };

    if (assessment) {
      await db.assessments.update(assessment.id, {
        screenTime: screenTimeData,
        updatedAt: Date.now(),
        synced: false
      });
    } else {
      const newAssessment: Assessment = {
        id: crypto.randomUUID(),
        studentId: currentUser.id,
        date: selectedDate,
        screenTime: screenTimeData,
        updatedAt: Date.now(),
        synced: false
      };
      await db.assessments.add(newAssessment);
    }

    triggerSync();
    setSaveSuccessNotice('آمار با موفقیت ثبت شد.');
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAppName.trim();
    if (!trimmed) return;

    setDynamicApps(prev => ({
      ...prev,
      [trimmed]: (prev[trimmed] || 0) + newAppMins
    }));
    setNewAppName('');
    setNewAppMins(30);
  };

  const handleRemoveApp = (appName: string) => {
    setDynamicApps(prev => {
      const updated = { ...prev };
      delete updated[appName];
      return updated;
    });
  };

  const handleUpdateAppMins = (appName: string, value: number) => {
    setDynamicApps(prev => ({
      ...prev,
      [appName]: value
    }));
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Dynamic Extract Header Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-md border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/20 shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black">استخراج زمان مصرف از گوشی</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">دریافت زنده اطلاعات مصرف برنامه‌ها بدون نیاز به سرورهای گوگل</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExtractUsageStats}
          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black px-4 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 border border-emerald-500/20"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>استخراج خودکار</span>
        </button>
      </div>

      {extractNotice && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>{extractNotice}</span>
        </div>
      )}

      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Main Panel Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Side: Stats and App List */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-4">
            
            {/* Form Top Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">زمان برنامه‌های فعال</h5>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">تاریخ:</span>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-2.5 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-center">
                <p className="text-[10px] font-bold text-slate-500">کل زمان</p>
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">{formatMins(Number(totalCalculatedMinutes))}</p>
              </div>
              <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/40 text-center">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">آموزشی/مفید</p>
                <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{formatMins(productiveMinutes)}</p>
              </div>
              <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/40 text-center">
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">بهره‌وری</p>
                <p className="text-xs font-black text-indigo-700 dark:text-indigo-400 mt-0.5">{usefulRatio}٪</p>
              </div>
            </div>

            {/* Dynamic App List */}
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {Object.keys(dynamicApps).length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Smartphone className="w-8 h-8 mx-auto opacity-40 mb-1.5" />
                  <p className="text-[11px] font-bold">هیچ برنامه‌ای ثبت نشده است</p>
                  <p className="text-[10px] mt-0.5 text-slate-500">برای شروع، آمار را استخراج کنید یا به صورت دستی بیفزایید.</p>
                </div>
              ) : (
                Object.entries(dynamicApps).map(([appName, minsVal]) => {
                  const mins = Number(minsVal) || 0;
                  const isProductive = isAppProductive(appName);
                  return (
                    <div 
                      key={appName}
                      className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 group hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-2 w-1/3">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isProductive ? 'bg-emerald-500 shadow-sm' : 'bg-amber-500 shadow-sm'}`}></span>
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{appName}</span>
                      </div>

                      <div className="flex-1 flex items-center gap-2">
                        <input 
                          type="range" min="0" max="480" step="10"
                          value={mins}
                          onChange={e => handleUpdateAppMins(appName, Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 w-14 text-left whitespace-nowrap">{formatMins(mins)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveApp(appName)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                        title="حذف برنامه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Save Button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => handleSave()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>ثبت آمار نهایی</span>
              </button>
            </div>

          </div>
        </div>

        {/* Right Side: Manual App Addition, Screenshot and Notes */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Quick Manual Add Form */}
          <form onSubmit={handleAddCustomApp} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>افزودن دستی برنامه</span>
            </h5>

            <div className="space-y-2">
              <input 
                type="text"
                placeholder="نام برنامه را بنویسید (مثال: شاد)..."
                value={newAppName}
                onChange={e => setNewAppName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              />

              <div className="flex gap-2 items-center">
                <input 
                  type="number" min="5" max="480" step="5"
                  value={newAppMins}
                  onChange={e => setNewAppMins(Number(e.target.value))}
                  className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-center"
                />
                <span className="text-[11px] text-slate-500">دقیقه مصرف</span>
                
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن</span>
                </button>
              </div>
            </div>
          </form>

          {/* Screenshot Upload Block */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
            <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              <span>اسکرین‌شات رفاه دیجیتال</span>
            </h5>
            
            <p className="text-[10px] text-slate-500 leading-normal">تصویر صفحه Digital Wellbeing جهت تایید مشاور (اختیاری):</p>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-[11px] font-bold cursor-pointer transition-colors justify-center">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isUploading ? 'درحال ارسال...' : 'انتخاب تصویر'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleScreenshotUpload} 
                  className="hidden" 
                  disabled={isUploading}
                />
              </label>

              {screenshotUrl && (
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <img src={screenshotUrl} alt="Wellbeing" className="w-6 h-6 rounded object-cover border border-slate-200 dark:border-slate-700" />
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">تصویر آماده</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setScreenshotUrl('')}
                    className="text-rose-500 hover:text-rose-700 font-bold text-[10px] cursor-pointer"
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes Block */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>توضیحات اختیاری</span>
            </h5>
            <textarea 
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-[11px] bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-16 leading-relaxed"
              placeholder="مثال: کاربری درسی شاد..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

        </div>

      </div>

    </div>
  );
}
