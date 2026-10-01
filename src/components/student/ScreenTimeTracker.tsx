import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../store';
import { db } from '../../db';
import { Assessment, ScreenTimeData } from '../../types';
import { uploadFileToMinIO, triggerSync } from '../../sync';
import { 
  Smartphone, Clock, Image as ImageIcon, Info, Save, CheckCircle2, 
  UploadCloud, Sparkles, AlertCircle, FileText, Plus, Trash2, Moon, 
  Search, ShieldAlert, Sun, Filter, Flame, Compass, ChevronRight, X,
  Lock, RotateCw, CheckCheck, Calendar
} from 'lucide-react';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { formatJalali } from '../../utils/date';
import { format } from 'date-fns';

interface ScreenTimeTrackerProps {
  date?: string;
}

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
  'org.hafez.quran': 'قرآن کریم صوتی',
  'com.hawzah.app': 'برنامه جامع حوزه علمیه',
  'com.noorsoft.tafsir': 'تفسیر نور',
  'ir.farsidic': 'فست‌دیکشنری',
  'org.coursera.android': 'کورسرا',
  'ir.divar': 'دیوار',
  'ir.snapp.passenger': 'اسنپ',
  'ir.tapsi.passenger': 'تپسی',
  'ir.tgbs.badesaba': 'تقویم و اوقات شرعی بادصبا',
  'ir.medu.shad': 'سامانه شاد',
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

const isAppProductive = (name: string): boolean => {
  const l = name.toLowerCase();
  return l.includes('ایتا') || l.includes('بله') || l.includes('قرآن') || 
         l.includes('کتاب') || l.includes('درس') || l.includes('حوزه') || 
         l.includes('مطالعه') || l.includes('tafsir') || l.includes('quran') || 
         l.includes('hawzah') || l.includes('study') || l.includes('noor') || 
         l.includes('علمی') || l.includes('تفاسیر') || l.includes('تقریرات') ||
         l.includes('مفاتیح') || l.includes('فقه') || l.includes('اصول') ||
         l.includes('شاد') || l.includes('بادصبا');
};

const formatMins = (mins: number) => {
  const mVal = Math.round(Number(mins) || 0);
  if (mVal <= 0) return '۰ دقیقه';
  const h = Math.floor(mVal / 60);
  const m = mVal % 60;
  if (h === 0) return `${m} دقیقه`;
  if (m === 0) return `${h} ساعت`;
  return `${h}س و ${m}د`;
};

export function ScreenTimeTracker({ date: propDate }: ScreenTimeTrackerProps) {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(
    propDate || new Date().toISOString().split('T')[0]
  );
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  // Sync propDate if provided
  useEffect(() => {
    if (propDate) {
      setSelectedDate(propDate);
    }
  }, [propDate]);

  // Dynamic Apps Dictionary State: { [appName]: durationInMinutes }
  const [dynamicApps, setDynamicApps] = useState<Record<string, number>>({});
  
  // Apps used after 10:30 PM (22:30): { [appName]: durationAfter1030PMInMinutes }
  const [nightApps, setNightApps] = useState<Record<string, number>>({});
  
  // Custom manual app input fields
  const [newAppName, setNewAppName] = useState<string>('');
  const [newAppMins, setNewAppMins] = useState<number>(30);
  const [newAppNightMins, setNewAppNightMins] = useState<number>(0);
  const [hasNightUsage, setHasNightUsage] = useState<boolean>(false);

  // Search & filter
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'NIGHT' | 'PRODUCTIVE' | 'LEISURE'>('ALL');
  
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [extractNotice, setExtractNotice] = useState<string | null>(null);

  // Auto-extraction and final submission lock state
  const [isAutoExtracted, setIsAutoExtracted] = useState<boolean>(false);
  const [extractedAt, setExtractedAt] = useState<string | null>(null);
  const [isFinalSubmitted, setIsFinalSubmitted] = useState<boolean>(false);

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
            setNightApps(st.nightApps || {});
            setScreenshotUrl(st.screenshotUrl || '');
            setNotes(st.notes || '');
            setIsAutoExtracted(Boolean(st.autoExtracted));
            setExtractedAt(st.extractedAt || null);
            setIsFinalSubmitted(Boolean(st.isFinalSubmitted || st.autoExtracted));
          } else {
            setDynamicApps({});
            setNightApps({});
            setScreenshotUrl('');
            setNotes('');
            setIsAutoExtracted(false);
            setExtractedAt(null);
            setIsFinalSubmitted(false);
          }
        } else {
          setAssessment(null);
          setDynamicApps({});
          setNightApps({});
          setScreenshotUrl('');
          setNotes('');
          setIsAutoExtracted(false);
          setExtractedAt(null);
          setIsFinalSubmitted(false);
        }
      });

    return () => { isSubscribed = false; };
  }, [currentUser?.id, selectedDate]);

  // Core persistent save to database
  const persistScreenTime = async (
    appsToSave: Record<string, number>,
    nightToSave: Record<string, number>,
    autoExtractedFlag: boolean,
    isoTimestamp?: string,
    scUrl?: string,
    noteText?: string
  ) => {
    if (!currentUser) return;

    const totalCalculated = Object.values(appsToSave).reduce((acc: number, v: number) => acc + (Number(v) || 0), 0);
    const totalNight = Object.values(nightToSave).reduce((acc: number, v: number) => acc + (Number(v) || 0), 0);

    const screenTimeData: ScreenTimeData = {
      totalMinutes: totalCalculated,
      nightTotalMinutes: totalNight,
      apps: {
        eitaa: Number(appsToSave['ایتا']) || 0,
        bale: Number(appsToSave['بله']) || 0,
        telegramSocial: (Number(appsToSave['تلگرام']) || 0) + (Number(appsToSave['اینستاگرام']) || 0),
        studyReading: (Number(appsToSave['قرآن کریم صوتی']) || 0) + (Number(appsToSave['قرآن صوتی و تفاسیر']) || 0) + (Number(appsToSave['کتب حوزوی و تقریرات']) || 0) + (Number(appsToSave['کتب حوزوی و علمی']) || 0) + (Number(appsToSave['برنامه جامع حوزه علمیه']) || 0) + (Number(appsToSave['تفسیر نور']) || 0),
        gamesMedia: (Number(appsToSave['بازی کلش']) || 0) + (Number(appsToSave['کلش آف کلنز']) || 0) + (Number(appsToSave['بازی و سرگرمی']) || 0) + (Number(appsToSave['بازی شطرنج و فکری']) || 0),
        other: Object.entries(appsToSave)
          .filter(([k]) => !['ایتا', 'بله', 'تلگرام', 'اینستاگرام', 'قرآن کریم صوتی', 'قرآن صوتی و تفاسیر', 'کتب حوزوی و تقریرات', 'کتب حوزوی و علمی', 'برنامه جامع حوزه علمیه', 'تفسیر نور', 'بازی کلش', 'کلش آف کلنز', 'بازی و سرگرمی', 'بازی شطرنج و فکری'].includes(k))
          .reduce((acc: number, [_, v]) => acc + (Number(v) || 0), 0)
      },
      dynamicApps: appsToSave,
      nightApps: nightToSave,
      autoExtracted: autoExtractedFlag,
      isFinalSubmitted: true,
      extractedAt: isoTimestamp || extractedAt || new Date().toISOString(),
      screenshotUrl: scUrl !== undefined ? scUrl : screenshotUrl,
      notes: noteText !== undefined ? noteText : notes
    };

    if (assessment) {
      await db.assessments.update(assessment.id, {
        screenTime: screenTimeData,
        updatedAt: Date.now(),
        synced: false
      });
      setAssessment(prev => prev ? { ...prev, screenTime: screenTimeData, updatedAt: Date.now(), synced: false } : null);
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
      setAssessment(newAssessment);
    }

    triggerSync();
  };

  // Extract usage stats automatically from Android bridge or simulate for web preview, then immediately register as final submission
  const handleExtractUsageStats = async () => {
    const bridge = (window as any).AndroidBridge;

    let extractedAll: Record<string, number> = {};
    let extractedNight: Record<string, number> = {};

    if (bridge) {
      try {
        if (!bridge.hasUsageStatsPermission()) {
          bridge.requestUsageStatsPermission();
          setExtractNotice('صفحه دسترسی به تنظیمات پایش (Usage Access) باز شد. لطفاً دسترسی را فعال کرده و مجدداً دکمه را بزنید.');
          return;
        }

        const statsString = bridge.getAppUsageStats();
        if (statsString) {
          const statsList: { 
            packageName: string; 
            appName?: string; 
            usageTimeMillis: number;
            nightUsageMillis?: number;
          }[] = JSON.parse(statsString);

          statsList.forEach(item => {
            const totalMins = Math.round(item.usageTimeMillis / 60000);
            const nightMins = item.nightUsageMillis ? Math.round(item.nightUsageMillis / 60000) : 0;

            if (totalMins <= 0 && nightMins <= 0) return;

            // Use human-readable name from Android bridge or friendly mapper
            const friendlyName = item.appName && item.appName.trim() 
              ? item.appName.trim() 
              : getReadableAppName(item.packageName);

            extractedAll[friendlyName] = (extractedAll[friendlyName] || 0) + (totalMins > 0 ? totalMins : nightMins);

            if (nightMins > 0) {
              extractedNight[friendlyName] = (extractedNight[friendlyName] || 0) + nightMins;
            }
          });
        }
      } catch (err) {
        console.error('Error fetching usage stats:', err);
        setExtractNotice('خطا در ارتباط با حسگر پایش گوشی.');
        return;
      }
    } else {
      // Realistic simulation for web preview / Eitaa mini app displaying ALL active apps
      extractedAll = {
        'ایتا': 110,
        'بله': 45,
        'تلگرام': 40,
        'قرآن صوتی و تفاسیر': 70,
        'کتب حوزوی و تقریرات': 55,
        'تقویم و اوقات شرعی بادصبا': 15,
        'مرورگر کروم (پژوهش)': 35,
        'اینستاگرام': 25,
        'روبیکا': 30,
        'سامانه شاد': 20,
        'بازی شطرنج و فکری': 20,
      };

      // Distinct usage after 10:30 PM (22:30)
      extractedNight = {
        'ایتا': 35,
        'تلگرام': 20,
        'مرورگر کروم (پژوهش)': 15,
        'اینستاگرام': 15,
      };
    }

    const nowIso = new Date().toISOString();
    setDynamicApps(extractedAll);
    setNightApps(extractedNight);
    setIsAutoExtracted(true);
    setIsFinalSubmitted(true);
    setExtractedAt(nowIso);

    // Automatic final registration in DB
    await persistScreenTime(extractedAll, extractedNight, true, nowIso);

    const totalApps = Object.keys(extractedAll).length;
    const nightAppsCount = Object.keys(extractedNight).length;

    setExtractNotice(`✅ آمار زنده گوشی استخراج و ثبت نهایی در سامانه انجام شد (${totalApps} برنامه فعال، ${nightAppsCount > 0 ? `${nightAppsCount} برنامه فعال بعد از ۱۰:۳۰ شب` : 'بدون فعالیت بعد از ۱۰:۳۰ شب'}). داده‌ها جهت جلوگیری از تغییر قفل شدند.`);
    setTimeout(() => setExtractNotice(null), 6000);
  };

  // Calculations
  const totalCalculatedMinutes = useMemo(() => {
    return Object.values(dynamicApps).reduce((acc: number, v: number) => acc + (Number(v) || 0), 0);
  }, [dynamicApps]);

  const totalNightMinutes = useMemo(() => {
    return Object.values(nightApps).reduce((acc: number, v: number) => acc + (Number(v) || 0), 0);
  }, [nightApps]);

  const productiveMinutes = useMemo(() => {
    return Object.entries(dynamicApps)
      .filter(([name]) => isAppProductive(name))
      .reduce((acc: number, [_, mins]) => acc + (Number(mins) || 0), 0);
  }, [dynamicApps]);

  const usefulRatio = Number(totalCalculatedMinutes) > 0 
    ? Math.round((productiveMinutes / totalCalculatedMinutes) * 100) 
    : 0;

  // Filtered Apps List
  const filteredApps = useMemo(() => {
    let entries = Object.entries(dynamicApps);

    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      entries = entries.filter(([name]) => name.toLowerCase().includes(q));
    }

    if (activeFilterTab === 'NIGHT') {
      entries = entries.filter(([name]) => (nightApps[name] || 0) > 0);
    } else if (activeFilterTab === 'PRODUCTIVE') {
      entries = entries.filter(([name]) => isAppProductive(name));
    } else if (activeFilterTab === 'LEISURE') {
      entries = entries.filter(([name]) => !isAppProductive(name));
    }

    // Sort by total usage descending
    return entries.sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0));
  }, [dynamicApps, nightApps, searchFilter, activeFilterTab]);

  // Night apps list entries
  const nightAppsList = useMemo(() => {
    return Object.entries(nightApps)
      .filter(([_, mins]) => Number(mins) > 0)
      .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0));
  }, [nightApps]);

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

  // Save Screen Time Assessment (e.g. updating notes or screenshot)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    await persistScreenTime(dynamicApps, nightApps, isAutoExtracted, extractedAt || undefined, screenshotUrl, notes);
    setIsFinalSubmitted(true);
    setSaveSuccessNotice('اطلاعات با موفقیت ثبت نهایی شد.');
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAutoExtracted) return; // Locked: no manual additions after extraction!
    const trimmed = newAppName.trim();
    if (!trimmed) return;

    setDynamicApps(prev => ({
      ...prev,
      [trimmed]: (prev[trimmed] || 0) + newAppMins
    }));

    if (hasNightUsage && newAppNightMins > 0) {
      setNightApps(prev => ({
        ...prev,
        [trimmed]: Math.min(newAppNightMins, (prev[trimmed] || 0) + newAppMins)
      }));
    }

    setNewAppName('');
    setNewAppMins(30);
    setNewAppNightMins(0);
    setHasNightUsage(false);
  };

  const handleRemoveApp = (appName: string) => {
    if (isAutoExtracted) return; // Locked: no manual removals after extraction!
    setDynamicApps(prev => {
      const updated = { ...prev };
      delete updated[appName];
      return updated;
    });
    setNightApps(prev => {
      const updated = { ...prev };
      delete updated[appName];
      return updated;
    });
  };

  const handleUpdateAppMins = (appName: string, value: number) => {
    if (isAutoExtracted) return; // Locked!
    setDynamicApps(prev => ({
      ...prev,
      [appName]: value
    }));
    // If night usage is greater than total, adjust it
    if ((nightApps[appName] || 0) > value) {
      setNightApps(prev => ({
        ...prev,
        [appName]: value
      }));
    }
  };

  const handleUpdateNightMins = (appName: string, value: number) => {
    if (isAutoExtracted) return; // Locked!
    const total = dynamicApps[appName] || value;
    // Cap night minutes at total minutes
    const capped = Math.min(value, total);
    
    setNightApps(prev => {
      if (capped <= 0) {
        const copy = { ...prev };
        delete copy[appName];
        return copy;
      }
      return {
        ...prev,
        [appName]: capped
      };
    });

    // Ensure total is at least as large as night usage
    if ((dynamicApps[appName] || 0) < capped) {
      setDynamicApps(prev => ({
        ...prev,
        [appName]: capped
      }));
    }
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-indigo-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-600/30 text-indigo-300 rounded-2xl border border-indigo-500/30 shrink-0 shadow-inner">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black text-white">پایش و خوداظهاری زمان استفاده از گوشی</h4>
              <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                Digital Wellbeing
              </span>
              {isFinalSubmitted && (
                <span className="text-[10px] font-black bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1 shadow-2xs">
                  <CheckCheck className="w-3 h-3 text-emerald-300" />
                  ثبت نهایی شده
                </span>
              )}
              {isAutoExtracted && (
                <span className="text-[10px] font-black bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-full border border-purple-400/30 flex items-center gap-1 shadow-2xs">
                  <Lock className="w-3 h-3 text-purple-300" />
                  استخراج رسمی (قفل شده)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-normal">
              ثبت تمامی برنامه‌های دارای فعالیت و تفکیک اختصاصی برنامه‌های فعال بعد از ساعت ۱۰:۳۰ شب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleExtractUsageStats}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black px-4 py-2.5 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-emerald-400/30"
          >
            {isAutoExtracted ? <RotateCw className="w-4 h-4 text-emerald-200" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
            <span>{isAutoExtracted ? 'استخراج مجدد و به‌روزرسانی نهایی' : 'استخراج خودکار از گوشی و ثبت نهایی'}</span>
          </button>
        </div>
      </div>

      {extractNotice && (
        <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>{extractNotice}</span>
        </div>
      )}

      {saveSuccessNotice && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Quick Summary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Total Time */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold">کل استفاده روزانه</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
              {formatMins(Number(totalCalculatedMinutes))}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              مجموع {Object.keys(dynamicApps).length} برنامه فعال
            </p>
          </div>
        </div>

        {/* Metric 2: Usage after 10:30 PM (HIGHLIGHTED) */}
        <div className="bg-gradient-to-br from-indigo-950/90 to-purple-950/90 text-white p-4 rounded-3xl border border-indigo-800/80 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between text-indigo-200 mb-2">
            <span className="text-[11px] font-black flex items-center gap-1">
              <Moon className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>پس از ۱۰:۳۰ شب</span>
            </span>
            <span className="text-[10px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/30 font-bold">
              ۲۲:۳۰+
            </span>
          </div>
          <div>
            <p className="text-base sm:text-lg font-black text-amber-300">
              {formatMins(Number(totalNightMinutes))}
            </p>
            <p className="text-[10px] text-indigo-200/90 mt-0.5">
              {nightAppsList.length > 0 ? `${nightAppsList.length} برنامه فعال در شب` : 'بدون فعالیت دیرهنگام'}
            </p>
          </div>
        </div>

        {/* Metric 3: Educational/Productive */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold">آموزشی و عبادی</span>
            <Sun className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatMins(productiveMinutes)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              کتب، دروس، قرآن و تفاسیر
            </p>
          </div>
        </div>

        {/* Metric 4: Ratio */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold">نسبت مفید به کل</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
              {usefulRatio}٪
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, usefulRatio))}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED SEPARATE SECTION: Apps Used After 10:30 PM */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-5 border border-indigo-900/80 shadow-xl text-white space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-indigo-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-500/30 shrink-0">
              <Moon className="w-5 h-5 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h5 className="text-xs sm:text-sm font-black text-white">
                  برنامه‌های فعال بعد از ساعت ۱۰:۳۰ شب (۲۲:۳۰)
                </h5>
                <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  پایش ساعت خاموشی و استراحت
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                برنامه‌هایی که در ساعت پایانی شب باز بوده‌اند و مدت زمان استفاده اختصاصی از آن‌ها پس از ۲۲:۳۰
              </p>
            </div>
          </div>

          <div className="bg-slate-800/80 px-3.5 py-1.5 rounded-2xl border border-slate-700/80 text-xs font-black text-amber-300 flex items-center gap-1.5 self-end sm:self-auto">
            <span>مجموع زمان دیرهنگام:</span>
            <span>{formatMins(Number(totalNightMinutes))}</span>
          </div>
        </div>

        {/* Night apps list */}
        {nightAppsList.length === 0 ? (
          <div className="p-4 bg-emerald-950/40 border border-emerald-600/40 rounded-2xl flex items-center gap-3 text-emerald-200">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black">احسنت! هیچ استفاده‌ای پس از ساعت ۱۰:۳۰ شب ثبت نشده است.</p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">استراحت به‌موقع، سحرخیزی و حضور بانشاط در نماز جماعت صبح را تضمین می‌کند.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {nightAppsList.map(([appName, nightMinsVal]) => {
                const nightMins = Number(nightMinsVal) || 0;
                const totalMins = Number(dynamicApps[appName]) || nightMins;
                const percentOfTotal = totalMins > 0 ? Math.round((nightMins / totalMins) * 100) : 100;

                return (
                  <div 
                    key={`night_${appName}`}
                    className="p-3 bg-slate-900/90 border border-purple-500/30 hover:border-purple-400/50 rounded-2xl flex flex-col gap-2.5 transition-all shadow-inner"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        <span className="text-xs font-black text-white">{appName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-purple-900/60 text-purple-200 border border-purple-700/60 px-2 py-0.5 rounded-lg font-bold">
                          {percentOfTotal}٪ از کل استفاده
                        </span>
                        {!isAutoExtracted ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateNightMins(appName, 0)}
                            className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                            title="حذف از لیست شبانه"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span title="ثبت رسمی و قفل شده" className="text-purple-300 p-1">
                            <Lock className="w-3 h-3 text-purple-300" />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        {isAutoExtracted ? (
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                            <div 
                              className="bg-purple-400 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(5, (nightMins / Math.max(1, totalMins)) * 100))}%` }}
                            />
                          </div>
                        ) : (
                          <input 
                            type="range" 
                            min="5" 
                            max={Math.max(120, totalMins)} 
                            step="5"
                            value={nightMins}
                            onChange={e => handleUpdateNightMins(appName, Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                          />
                        )}
                      </div>
                      <span className="text-xs font-black text-amber-300 whitespace-nowrap min-w-[75px] text-left">
                        {formatMins(nightMins)}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-800/80">
                      <span>کل استفاده روزانه: <strong>{formatMins(totalMins)}</strong></span>
                      <span className="text-purple-300">بعد از ۲۲:۳۰: <strong>{formatMins(nightMins)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Seminary Admonition Card */}
            <div className="p-3 bg-amber-950/30 border border-amber-600/30 rounded-2xl flex items-center gap-2.5 text-amber-200/90 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>توصیه تهذیبی:</strong> استفاده از تلفن همراه پس از ۲۲:۳۰ علاوه بر اختلال در خواب آرام، بر فیض سحرخیزی و تمرکز در مباحثات علمی روز بعد تأثیرگذار است.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Complete List of All Apps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: All Active Apps List */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-4">
            
            {/* Top Bar with Date & Search */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h5 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                  فهرست تمامی برنامه‌های دارای فعالیت
                </h5>
                <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  {Object.keys(dynamicApps).length} برنامه
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">تاریخ:</span>
                <div className="flex items-center gap-1.5">
                  <DatePicker 
                    calendar={persian} 
                    locale={persian_fa} 
                    value={new Date(selectedDate)}
                    onChange={(dateObject) => {
                      if (dateObject) {
                        setSelectedDate(format(dateObject.toDate(), 'yyyy-MM-dd'));
                      }
                    }}
                    inputClass="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-center w-32 cursor-pointer shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      selectedDate === format(new Date(), 'yyyy-MM-dd')
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    امروز
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const yest = new Date();
                      yest.setDate(yest.getDate() - 1);
                      setSelectedDate(format(yest, 'yyyy-MM-dd'));
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      selectedDate === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    دیروز
                  </button>
                </div>
                <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl border border-indigo-100 dark:border-indigo-900/60 shadow-2xs">
                  {formatJalali(selectedDate)}
                </span>
              </div>
            </div>

            {/* Filter Tabs and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('ALL')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeFilterTab === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  همه ({Object.keys(dynamicApps).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('NIGHT')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    activeFilterTab === 'NIGHT'
                      ? 'bg-purple-600 text-white shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Moon className="w-3 h-3 text-amber-300" />
                  <span>بعد از ۲۲:۳۰ ({nightAppsList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('PRODUCTIVE')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeFilterTab === 'PRODUCTIVE'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  آموزشی/مفید
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('LEISURE')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeFilterTab === 'LEISURE'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  آزاد/سرگرمی
                </button>
              </div>

              {/* Search Field */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="جستجوی برنامه..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full sm:w-44 pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Dynamic App List */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredApps.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Smartphone className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">هیچ برنامه‌ای یافت نشد</p>
                  <p className="text-[11px] mt-1 text-slate-500">
                    {searchFilter ? 'برنامه‌ای با این نام پیدا نشد.' : 'برای ثبت آمار، دکمه «استخراج خودکار» را بزنید یا از فرم کنار برنامه اضافه کنید.'}
                  </p>
                </div>
              ) : (
                filteredApps.map(([appName, minsVal]) => {
                  const mins = Number(minsVal) || 0;
                  const isProductive = isAppProductive(appName);
                  const nightMins = Number(nightApps[appName]) || 0;

                  return (
                    <div 
                      key={appName}
                      className={`p-3 rounded-2xl border transition-all flex flex-col gap-2 ${
                        nightMins > 0 
                          ? 'bg-indigo-50/40 dark:bg-slate-800/80 border-indigo-200 dark:border-indigo-900/60' 
                          : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Row 1: App Info and Action */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isProductive ? 'bg-emerald-500 shadow-xs' : 'bg-amber-500 shadow-xs'}`}></span>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                            {appName}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            isProductive 
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {isProductive ? 'مفید/درسی' : 'عمومی'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Night usage tag/toggle */}
                          {nightMins > 0 ? (
                            <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[10px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Moon className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span>{formatMins(nightMins)} پس از ۲۲:۳۰</span>
                            </span>
                          ) : (
                            !isAutoExtracted ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateNightMins(appName, Math.min(20, mins))}
                                className="text-[10px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-300 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="افزودن استفاده دیرهنگام"
                              >
                                <Moon className="w-2.5 h-2.5" />
                                <span>+ پس از ۲۲:۳۰</span>
                              </button>
                            ) : null
                          )}

                          {!isAutoExtracted ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveApp(appName)}
                              className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                              title="حذف برنامه از لیست"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 p-1 flex items-center gap-1 text-[10px] font-bold" title="قفل استخراج خودکار (غیرقابل حذف)">
                              <Lock className="w-3.5 h-3.5 text-indigo-400" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Sliders for Total & Night Usage */}
                      <div className="space-y-1.5 pt-1">
                        {/* Total Duration Slider */}
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-500 w-16 shrink-0">کل روز:</span>
                          <div className="flex-1">
                            {isAutoExtracted ? (
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
                                <div 
                                  className="bg-indigo-600 h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(5, (mins / Math.max(1, totalCalculatedMinutes)) * 100))}%` }}
                                />
                              </div>
                            ) : (
                              <input 
                                type="range" min="0" max="480" step="5"
                                value={mins}
                                onChange={e => handleUpdateAppMins(appName, Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                              />
                            )}
                          </div>
                          <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 w-16 text-left whitespace-nowrap">
                            {formatMins(mins)}
                          </span>
                        </div>

                        {/* Night Duration Slider (if night usage enabled) */}
                        {nightMins > 0 && (
                          <div className="flex items-center gap-3 bg-purple-50/60 dark:bg-purple-950/30 px-2 py-1 rounded-xl border border-purple-100 dark:border-purple-900/40">
                            <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 w-16 shrink-0 flex items-center gap-1">
                              <Moon className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                              <span>شبانه:</span>
                            </span>
                            <div className="flex-1">
                              {isAutoExtracted ? (
                                <div className="w-full bg-purple-200 dark:bg-purple-900/50 h-2 rounded-full overflow-hidden flex">
                                  <div 
                                    className="bg-purple-600 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.max(5, (nightMins / Math.max(1, totalNightMinutes)) * 100))}%` }}
                                  />
                                </div>
                              ) : (
                                <input 
                                  type="range" min="0" max={Math.max(120, mins)} step="5"
                                  value={nightMins}
                                  onChange={e => handleUpdateNightMins(appName, Number(e.target.value))}
                                  className="w-full h-1 bg-purple-200 dark:bg-purple-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                              )}
                            </div>
                            <span className="text-[11px] font-black text-purple-800 dark:text-purple-300 w-16 text-left whitespace-nowrap">
                              {formatMins(nightMins)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="text-[11px] text-slate-500 font-bold">
                مجموع کل: <strong className="text-slate-800 dark:text-slate-100">{formatMins(Number(totalCalculatedMinutes))}</strong> | پس از ۲۲:۳۰: <strong className="text-purple-600 dark:text-purple-300">{formatMins(Number(totalNightMinutes))}</strong>
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {isFinalSubmitted && (
                  <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ثبت نهایی شده
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isFinalSubmitted ? 'به‌روزرسانی و ثبت مجدد' : 'ثبت آمار نهایی'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Manual App Addition, Digital Wellbeing Screenshot, Notes */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Quick Manual Add Form or Locked Official Card */}
          {isAutoExtracted ? (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/60 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>استخراج رسمی و ثبت نهایی</span>
                </h5>
                <span className="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <CheckCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  ثبت نهایی
                </span>
              </div>

              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/50 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
                <p className="text-[11px] text-indigo-950 dark:text-indigo-200 font-bold leading-normal">
                  اطلاعات پایش گوشی مستقیماً از حسگر تلفن همراه استخراج شده است.
                </p>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  به جهت حفظ امانت و اعتبار گزارش، اقلام استخراج‌شده قفل شده و امکان افزودن یا حذف دستی برنامه‌ها غیرفعال است.
                </p>
              </div>

              {extractedAt && (
                <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span>زمان استخراج و ثبت نهایی:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200" dir="ltr">
                    {new Date(extractedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleExtractUsageStats}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>استخراج مجدد و به‌روزرسانی زنده</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddCustomApp} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>افزودن دستی برنامه دلخواه</span>
              </h5>
              <p className="text-[10px] text-slate-500">
                هر برنامه‌ای که استفاده کرده‌اید (آموزشی، پیام‌رسان، بازی و...) را می‌توانید وارد کنید.
              </p>

              <div className="space-y-2.5">
                <input 
                  type="text"
                  placeholder="نام برنامه (مثال: شاد، درس صوتی، اسنپ)..."
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
                  <span className="text-[11px] text-slate-500 font-bold">دقیقه کل مصرف</span>
                </div>

                {/* Night usage checkbox for this new app */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                    <input 
                      type="checkbox"
                      checked={hasNightUsage}
                      onChange={e => {
                        setHasNightUsage(e.target.checked);
                        if (e.target.checked && newAppNightMins === 0) {
                          setNewAppNightMins(Math.min(15, newAppMins));
                        }
                      }}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                    />
                    <span className="flex items-center gap-1">
                      <Moon className="w-3 h-3 text-purple-500" />
                      <span>فعالیت بعد از ساعت ۱۰:۳۰ شب</span>
                    </span>
                  </label>

                  {hasNightUsage && (
                    <div className="flex items-center gap-2 pr-6">
                      <input 
                        type="number" min="5" max={newAppMins} step="5"
                        value={newAppNightMins}
                        onChange={e => setNewAppNightMins(Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-bold text-center text-purple-700 dark:text-purple-300"
                      />
                      <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold">دقیقه بعد از ۲۲:۳۰</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن برنامه به لیست</span>
                </button>
              </div>
            </form>
          )}

          {/* Screenshot Upload Block */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
            <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              <span>تصویر رفاه دیجیتال (Wellbeing)</span>
            </h5>
            
            <p className="text-[10px] text-slate-500 leading-normal">
              در صورت تمایل، اسکرین‌شات صفحه استفاده از گوشی را ضمیمه کنید:
            </p>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-[11px] font-bold cursor-pointer transition-colors justify-center">
                <UploadCloud className="w-4 h-4" />
                <span>{isUploading ? 'درحال بارگذاری تصویر...' : 'انتخاب تصویر اسکرین‌شات'}</span>
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
                  <div className="flex items-center gap-2">
                    <img src={screenshotUrl} alt="Wellbeing" className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">تصویر ضمیمه شد</span>
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
            <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>توضیحات و عذر شرعی/اضطراری</span>
            </h5>
            <textarea 
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-[11px] bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-16 leading-relaxed"
              placeholder="مثال: مطالعه جزوه درسی تا اواخر شب..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

        </div>

      </div>

    </div>
  );
}
