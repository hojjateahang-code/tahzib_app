import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAuth } from '../../store';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Smartphone, Clock, Calendar, TrendingUp, Sparkles, AlertCircle, BookOpen, MessageCircle, Gamepad2, Layers } from 'lucide-react';

interface StudentScreenTimeChartProps {
  studentId?: string;
}

// Gorgeous color palette for dynamic apps
const PALETTE = [
  { color: '#6366f1', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' },
  { color: '#10b981', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  { color: '#f59e0b', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  { color: '#f43f5e', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' },
  { color: '#0284c7', bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' },
  { color: '#8b5cf6', bg: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300' },
  { color: '#64748b', bg: 'bg-slate-100 text-slate-800 dark:bg-slate-850 dark:text-slate-350' },
];

function formatMinsToHours(mins: number): string {
  if (!mins || mins <= 0) return '۰ د';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}س و ${m}د`;
  if (h > 0) return `${h}س`;
  return `${m}د`;
}

// For legacy backwards compatibility
const getDynamicAppsFromLegacy = (st: any): Record<string, number> => {
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

export function StudentScreenTimeChart({ studentId }: StudentScreenTimeChartProps) {
  const { currentUser } = useAuth();
  const [chartType, setChartType] = useState<'AREA' | 'STACKED'>('AREA');
  const [daysRange, setDaysRange] = useState<number>(14);

  const targetId = studentId || currentUser?.id;

  const assessments = useLiveQuery(
    () => {
      if (!targetId) return [];
      return db.assessments
        .where('studentId')
        .equals(targetId)
        .reverse()
        .sortBy('date');
    },
    [targetId]
  );

  const screenTimeAssessments = useMemo(() => {
    if (!assessments) return [];
    return assessments.filter(a => a.screenTime && (a.screenTime.totalMinutes > 0 || (a.screenTime.dynamicApps && Object.keys(a.screenTime.dynamicApps).length > 0) || (a.screenTime.apps && Object.values(a.screenTime.apps).some(v => (v || 0) > 0))));
  }, [assessments]);

  // Process dynamic app metrics
  const { chartData, stats, activeAppsList } = useMemo(() => {
    if (!screenTimeAssessments || screenTimeAssessments.length === 0) {
      return {
        chartData: [],
        stats: { avgMins: 0, maxMins: 0, totalDays: 0, topAppName: 'ثبت نشده' },
        activeAppsList: [] as { name: string; color: string; bg: string; totalUsage: number }[]
      };
    }

    const slice = screenTimeAssessments.slice(0, daysRange).reverse();

    // 1. Accumulate total usage per app name to rank them
    const appTotals: Record<string, number> = {};
    let sumMins = 0;
    let maxMins = 0;

    slice.forEach(item => {
      const st = item.screenTime!;
      const dynApps = getDynamicAppsFromLegacy(st);
      const totalMins = st.totalMinutes || Object.values(dynApps).reduce((a, b) => a + b, 0);
      
      if (totalMins > maxMins) maxMins = totalMins;
      sumMins += totalMins;

      Object.entries(dynApps).forEach(([appName, mins]) => {
        if (mins > 0) {
          appTotals[appName] = (appTotals[appName] || 0) + mins;
        }
      });
    });

    // 2. Sort apps by total usage
    const sortedApps = Object.entries(appTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, totalUsage], index) => {
        const paletteItem = PALETTE[index % PALETTE.length];
        return {
          name,
          totalUsage,
          color: paletteItem.color,
          bg: paletteItem.bg
        };
      });

    const topAppName = sortedApps[0] ? sortedApps[0].name : 'نامشخص';

    // 3. Build chart points
    const dataList = slice.map(item => {
      const st = item.screenTime!;
      const dynApps = getDynamicAppsFromLegacy(st);
      const totalMins = st.totalMinutes || Object.values(dynApps).reduce((a, b) => a + b, 0);
      const faDate = new Date(item.date).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });

      const pointData: Record<string, any> = {
        date: item.date,
        name: faDate,
        totalMinutes: totalMins,
        totalHours: Number((totalMins / 60).toFixed(1)),
        notes: st.notes,
        dynApps // Pass along raw dynamic apps for custom tooltip rendering
      };

      // Populate app-specific minutes for stacked chart
      sortedApps.forEach(app => {
        pointData[app.name] = dynApps[app.name] || 0;
      });

      return pointData;
    });

    const avgMins = slice.length > 0 ? Math.round(sumMins / slice.length) : 0;

    return {
      chartData: dataList,
      stats: {
        avgMins,
        maxMins,
        totalDays: slice.length,
        topAppName
      },
      activeAppsList: sortedApps
    };
  }, [screenTimeAssessments, daysRange]);

  const grandTotalMins = useMemo(() => {
    return activeAppsList.reduce((acc, app) => acc + app.totalUsage, 0);
  }, [activeAppsList]);

  // Custom localized tooltip
  const CustomScreenTimeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dynApps = data.dynApps || {};

      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-[11px] space-y-1.5 min-w-[180px]" dir="rtl">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1 font-extrabold text-slate-800 dark:text-slate-100">
            <span>{label}</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-black">{formatMinsToHours(data.totalMinutes)}</span>
          </div>
          <div className="space-y-1 pt-1">
            {Object.entries(dynApps).map(([appName, mins]) => {
              if (!mins || (mins as number) <= 0) return null;
              const appConfig = activeAppsList.find(a => a.name === appName);
              const color = appConfig ? appConfig.color : '#64748b';

              return (
                <div key={appName} className="flex justify-between items-center gap-2">
                  <span className="flex items-center gap-1 font-bold" style={{ color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></span>
                    {appName}:
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{mins} دقیقه</span>
                </div>
              );
            })}
          </div>
          {data.notes && (
            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 italic">
              یادداشت: {data.notes}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (!screenTimeAssessments || screenTimeAssessments.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
        <Smartphone className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
        <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">آماری ثبت نشده است</h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          اطلاعات میزان استفاده از تلفن همراه برای این بازه یافت نشد.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Stat Cards - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">میانگین روزانه</span>
          <span className="text-xs font-black text-indigo-900 dark:text-indigo-100 mt-1">{formatMinsToHours(stats.avgMins)}</span>
        </div>

        <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/60 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">بیشترین مصرف</span>
          <span className="text-xs font-black text-rose-900 dark:text-rose-100 mt-1">{formatMinsToHours(stats.maxMins)}</span>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">روزهای پایش</span>
          <span className="text-xs font-black text-emerald-900 dark:text-emerald-100 mt-1">{stats.totalDays} روز</span>
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">برنامه پرمصرف</span>
          <span className="text-xs font-black text-amber-900 dark:text-amber-100 mt-1 truncate">{stats.topAppName}</span>
        </div>
      </div>

      {/* Chart Canvas Card - Compact */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-indigo-500" />
            <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">روند استفاده</h5>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <select
              value={daysRange}
              onChange={e => setDaysRange(Number(e.target.value))}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 outline-none"
            >
              <option value={7}>۷ روز</option>
              <option value={14}>۱۴ روز</option>
              <option value={30}>۳۰ روز</option>
            </select>

            <div className="flex bg-slate-50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setChartType('AREA')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  chartType === 'AREA' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                کل
              </button>
              <button
                type="button"
                onClick={() => setChartType('STACKED')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  chartType === 'STACKED' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                تفکیک
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Wrapper */}
        <div className="h-[200px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'AREA' ? (
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDynamicTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} />
                <Tooltip content={<CustomScreenTimeTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="totalMinutes" 
                  stroke="#6366f1" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorDynamicTotal)" 
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} />
                <Tooltip content={<CustomScreenTimeTooltip />} />
                {activeAppsList.map((app, idx) => (
                  <Bar 
                    key={app.name} 
                    dataKey={app.name} 
                    name={app.name} 
                    stackId="a" 
                    fill={app.color} 
                    radius={idx === activeAppsList.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} 
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Dynamic Legend Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {activeAppsList.map(app => (
            <div key={app.name} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${app.bg}`}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: app.color }}></span>
              <span>{app.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Progress Share - Compact */}
      {activeAppsList.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <h6 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>سهم کل در بازه</span>
          </h6>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeAppsList.slice(0, 6).map(app => {
              const pct = grandTotalMins > 0 ? Math.round((app.totalUsage / grandTotalMins) * 100) : 0;
              return (
                <div key={app.name} className="bg-slate-50/50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100/60 dark:border-slate-800/80 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: app.color }}></span>
                      {app.name}
                    </span>
                    <span className="font-black text-slate-600 dark:text-slate-400">
                      {formatMinsToHours(app.totalUsage)} ({pct}٪)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{ width: `${pct}%`, backgroundColor: app.color }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
