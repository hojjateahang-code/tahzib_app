import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAuth } from '../../store';
import { format, subDays, startOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Filter, Download, Printer, Loader2, Sparkles, Check, Image as ImageIcon, BarChart2, Smartphone, Table } from 'lucide-react';
import { PersonalHabitCourseTable } from './PersonalHabitCourseTable';
import { StudentScreenTimeChart } from './StudentScreenTimeChart';
import html2canvas from 'html2canvas';

const METRICS = [
  { id: 'percentage', label: 'کل', color: '#10B981', group: 'aggregate' },
  { id: 'prayersPct', label: 'کل نمازها', color: '#3b82f6', group: 'aggregate' },
  { id: 'tasksPct', label: 'کل سایر برنامه‌ها', color: '#8b5cf6', group: 'aggregate' },
  
  { id: 'namazSobh', label: 'نماز صبح', color: '#ef4444', group: 'prayers' },
  { id: 'namazZohr', label: 'نماز ظهر', color: '#f97316', group: 'prayers' },
  { id: 'namazAsr', label: 'نماز عصر', color: '#eab308', group: 'prayers' },
  { id: 'namazMaghreb', label: 'نماز مغرب', color: '#84cc16', group: 'prayers' },
  { id: 'namazEsha', label: 'نماز عشاء', color: '#06b6d4', group: 'prayers' },
  
  { id: 'saharKhizi', label: 'سحرخیزی', color: '#6366f1', group: 'tasks' },
  { id: 'telavatNoor', label: 'تلاوت نور', color: '#a855f7', group: 'tasks' },
  { id: 'classAttendance', label: 'حضور در کلاس', color: '#ec4899', group: 'tasks' },
  { id: 'mabahese', label: 'مباحثه', color: '#f43f5e', group: 'tasks' },
  { id: 'earlySleep', label: 'خواب اول شب', color: '#14b8a6', group: 'tasks' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-xs" dir="rtl">
        <p className="font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((p: any) => {
             let valueText = p.value === 100 ? 'انجام شد/کامل' : (p.value > 0 ? p.value + '%' : 'انجام نشد/ترک');
             if (data['raw_' + p.dataKey]) {
                const raw = data['raw_' + p.dataKey];
                if (raw === 'ADA_JAMAAT' || raw === 'JAMAAT') valueText = 'اداء به جماعت';
                else if (raw === 'ADA_FORADA' || raw === 'FURADA') valueText = 'اداء فرادی';
                else if (raw === 'QAZA') valueText = 'قضا';
                else if (raw === 'TARK') valueText = 'ترک';
                else if (raw === 'NONE') valueText = 'انجام نشده';
                else if (raw === 'FULL') valueText = 'کامل';
                else if (raw === 'PARTIAL') valueText = 'ناقص';
             }
             return (
               <div key={p.dataKey} className="flex justify-between gap-4">
                 <span style={{ color: p.color }} className="font-bold">{p.name}:</span>
                 <span className="text-slate-600 dark:text-slate-300 font-medium">{valueText}</span>
               </div>
             )
          })}
        </div>
        {data.notes && Object.keys(data.notes).length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">توضیحات طلبه:</span>
            <div className="space-y-1">
               {Object.entries(data.notes).map(([k, v]: any) => {
                 if (!v) return null;
                 const metricName = METRICS.find(m => m.id === k)?.label || k;
                 return (
                   <div key={k} className="text-xs">
                     <span className="text-slate-500 dark:text-slate-400 ml-1">{metricName}:</span>
                     <span className="text-slate-700 dark:text-slate-200 font-medium">{v}</span>
                   </div>
                 );
               })}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function StudentProgressChart({ studentId }: { studentId?: string }) {
  const { currentUser } = useAuth();
  const [timeRange, setTimeRange] = useState<number>(14);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['percentage', 'prayersPct', 'tasksPct']);
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportContainerRef = useRef<HTMLDivElement>(null);

  const handleExportImage = async () => {
    if (!exportContainerRef.current) return;
    setIsExporting(true);

    try {
      // Small timeout to allow rendering
      await new Promise(resolve => setTimeout(resolve, 150));

      const isDarkMode = document.documentElement.classList.contains('dark');
      const canvas = await html2canvas(exportContainerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const faDate = new Intl.DateTimeFormat('fa-IR').format(new Date()).replace(/\//g, '-');
      link.download = `نمودار_پیشرفت_تهذیب_${timeRange}روزه_${faDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export chart failed:', err);
      alert('خطا در دریافت خروجی عکس. لطفاً مجدداً تلاش کنید.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const [activeSubTab, setActiveSubTab] = useState<'CHART' | 'SCREENTIME' | 'TABLE'>('CHART');

  const assessments = useLiveQuery(
    () => {
      const targetId = studentId || currentUser?.id;
      return targetId ? db.assessments.where('studentId').equals(targetId).toArray() : [];
    },
    [currentUser, studentId]
  );

  const data = useMemo(() => {
    if (!assessments) return [];
    
    const result = [];
    const formatter = new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' });
    
    const assessmentByDate = new Map();
    assessments.forEach(a => assessmentByDate.set(a.date, a));

    let interval = 1;
    if (timeRange > 60) interval = 3;
    if (timeRange > 180) interval = 7;
    
    for (let i = timeRange - 1; i >= 0; i -= interval) {
      const d = subDays(startOfDay(new Date()), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const assessment = assessmentByDate.get(dateStr);
      
      let entry: any = {
        name: formatter.format(d),
        dateFull: dateStr,
        percentage: 0,
        prayersPct: 0,
        tasksPct: 0,
        namazSobh: 0, namazZohr: 0, namazAsr: 0, namazMaghreb: 0, namazEsha: 0,
        saharKhizi: 0, telavatNoor: 0, classAttendance: 0, mabahese: 0, earlySleep: 0,
        notes: {}
      };

      if (assessment) {
        let pTotal = 0, pCompleted = 0;
        const prayers = ['namazSobh', 'namazZohr', 'namazAsr', 'namazMaghreb', 'namazEsha'] as const;
        prayers.forEach(p => {
          pTotal++;
          const status = assessment[p];
          if (status === 'ADA_JAMAAT' || status === 'JAMAAT') {
            pCompleted++;
            entry[p] = 100;
          } else if (status === 'ADA_FORADA' || status === 'FURADA') {
            pCompleted++;
            entry[p] = 75;
          } else if (status === 'QAZA') {
            entry[p] = 35;
          } else {
            entry[p] = 0;
          }
          entry['raw_' + p] = status;
        });
        
        let tTotal = 0, tCompleted = 0;
        const tasks = ['saharKhizi', 'telavatNoor', 'classAttendance', 'mabahese', 'earlySleep'] as const;
        tasks.forEach(t => {
          tTotal++;
          const val = assessment[t];
          if (val === 'FULL' || val === true) {
            tCompleted++;
            entry[t] = 100;
          } else if (val === 'PARTIAL') {
            tCompleted += 0.5;
            entry[t] = 50;
          } else {
            entry[t] = 0;
          }
          entry['raw_' + t] = val;
        });
        
        let total = pTotal + tTotal;
        let completed = pCompleted + tCompleted;
        
        entry.percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        entry.prayersPct = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : 0;
        entry.tasksPct = tTotal > 0 ? Math.round((tCompleted / tTotal) * 100) : 0;
        entry.notes = assessment.notes || {};
      }
      
      result.push(entry);
    }
    return result;
  }, [assessments, timeRange]);

  const toggleMetric = (id: string) => {
    setSelectedMetrics(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  // Check filter mode for Y-Axis labels (percentages vs specific prayer/task titles)
  const isOnlyPrayersFilter = selectedMetrics.length > 0 && selectedMetrics.every(m => METRICS.find(x => x.id === m)?.group === 'prayers');
  const isOnlySelectableTasks = selectedMetrics.length > 0 && selectedMetrics.every(m => ['classAttendance', 'mabahese'].includes(m));

  let yTicks = [0, 25, 50, 75, 100];
  let yFormatter = (v: number) => `${v}%`;

  if (isOnlyPrayersFilter) {
    yTicks = [0, 35, 75, 100];
    yFormatter = (v: number) => {
      if (v >= 90) return 'جماعت';
      if (v >= 60) return 'فرادی';
      if (v >= 20) return 'قضا';
      return 'ترک';
    };
  } else if (isOnlySelectableTasks) {
    yTicks = [0, 50, 100];
    yFormatter = (v: number) => {
      if (v >= 90) return 'کامل';
      if (v >= 40) return 'ناقص';
      return 'انجام نشد';
    };
  }

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Sub Tabs Segmented Control */}
      <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl flex gap-1.5 self-start w-full sm:w-auto overflow-x-auto hide-scrollbar border border-slate-200/40 dark:border-slate-700/40">
        <button
          type="button"
          onClick={() => setActiveSubTab('CHART')}
          className={`whitespace-nowrap px-4 py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer ${
            activeSubTab === 'CHART'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40'
          }`}
        >
          <BarChart2 className="w-4 h-4 shrink-0" />
          <span>پیشرفت</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('SCREENTIME')}
          className={`whitespace-nowrap px-4 py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer ${
            activeSubTab === 'SCREENTIME'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>گوشی</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('TABLE')}
          className={`whitespace-nowrap px-4 py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer ${
            activeSubTab === 'TABLE'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40'
          }`}
        >
          <Table className="w-4 h-4 shrink-0" />
          <span>جداول</span>
        </button>
      </div>

      {activeSubTab === 'CHART' && (
        <>
          {/* Top Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">روند و نمودار تحلیلی خوداظهاری</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">مشاهده و تحلیل گزارش با امکان خروجی عکس یا پرینت</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end">
          <select 
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none flex-1 sm:flex-none cursor-pointer"
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
          >
            <option value={7}>هفته اخیر</option>
            <option value={14}>دو هفته اخیر</option>
            <option value={30}>یک ماه اخیر</option>
            <option value={90}>سه ماه اخیر</option>
            <option value={180}>شش ماه اخیر</option>
          </select>

          <button 
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl transition-colors border cursor-pointer flex items-center gap-1 text-xs font-bold ${
              showFilters 
                ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="فیلتر گزاره‌ها"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">فیلترها</span>
          </button>

          <button
            type="button"
            onClick={handleExportImage}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="دریافت خروجی تصویر PNG"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isExporting ? 'در حال آماده‌سازی...' : 'خروجی عکس'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="چاپ یا پرینت نمودار"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">پرینت</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5 shadow-xs">
          <div className="w-full text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>فیلتر گزاره‌ها (گزاره‌های دلخواه را جهت نمایش روی نمودار انتخاب یا از حالت انتخاب خارج کنید):</span>
          </div>
          {METRICS.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleMetric(m.id)}
              className={`text-[11px] px-3 py-1 rounded-full font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                selectedMetrics.includes(m.id) 
                  ? 'bg-slate-100 dark:bg-slate-800 shadow-xs' 
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              style={{ borderColor: selectedMetrics.includes(m.id) ? m.color : undefined, color: selectedMetrics.includes(m.id) ? m.color : undefined }}
            >
              {selectedMetrics.includes(m.id) && <Check className="w-3 h-3 stroke-[3]" />}
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Printable and Capturable Container */}
      <div 
        ref={exportContainerRef}
        className="w-full bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 print:p-0 print:border-none"
      >
        {/* Header summary included inside image and print export */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100">
                گزارش نمودار پیشرفت خوداظهاری
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              بازه زمانی: {timeRange} روز اخیر | تاریخ دریافت خروجی: {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date())}
            </p>
          </div>

          <div className="flex flex-wrap gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400">گزاره‌های فعال:</span>
            {METRICS.filter(m => selectedMetrics.includes(m.id)).map(m => m.label).join('، ') || 'هیچکدام'}
          </div>
        </div>

        <div className="w-full h-[300px] sm:h-[350px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false} 
                tickLine={false} 
                domain={[0, 100]} 
                ticks={yTicks}
                tickFormatter={yFormatter}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {METRICS.filter(m => selectedMetrics.includes(m.id)).map((m) => (
                <Line 
                  key={m.id}
                  type="monotone" 
                  dataKey={m.id} 
                  name={m.label}
                  stroke={m.color} 
                  strokeWidth={m.group === 'aggregate' ? 3 : 2}
                  dot={{ r: m.group === 'aggregate' ? 4 : 3, fill: m.color, strokeWidth: m.group === 'aggregate' ? 2 : 1, stroke: '#fff' }}
                  activeDot={{ r: m.group === 'aggregate' ? 6 : 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </>
      )}

      {activeSubTab === 'SCREENTIME' && (
        <StudentScreenTimeChart studentId={studentId} />
      )}

      {activeSubTab === 'TABLE' && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <PersonalHabitCourseTable studentId={studentId} />
        </div>
      )}
    </div>
  );
}

