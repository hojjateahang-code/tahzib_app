import React, { useState, useEffect } from 'react';
import { logger, type SystemLogEntry, type LogLevel, type LogCategory } from '../lib/logger';
import { Terminal, Trash2, Download, Search, RefreshCw, AlertTriangle, CheckCircle2, Info, XCircle, Filter } from 'lucide-react';

export function TechAdminEventLogs() {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLogDetails, setSelectedLogDetails] = useState<SystemLogEntry | null>(null);

  useEffect(() => {
    setLogs(logger.getLogs());
    const unsubscribe = logger.subscribe(updatedLogs => {
      setLogs([...updatedLogs]);
    });
    return () => unsubscribe();
  }, []);

  const handleClearLogs = () => {
    if (confirm('آیا از پاکسازی تمام لاگ‌های ثبت‌شده سیستم مطمئن هستید؟')) {
      logger.clearLogs();
    }
  };

  const handleExportLogs = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tahzib_system_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    if (selectedLevel !== 'ALL' && log.level !== selectedLevel) return false;
    if (selectedCategory !== 'ALL' && log.category !== selectedCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchCat = log.category.toLowerCase().includes(q);
      const matchDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(q) : false;
      return matchMsg || matchCat || matchDetails;
    }
    return true;
  });

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> SUCCESS
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-950/80 text-rose-400 border border-rose-800 animate-pulse">
            <XCircle className="w-3 h-3" /> ERROR
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-950/80 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3 h-3" /> WARN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-950/80 text-blue-400 border border-blue-800">
            <Info className="w-3 h-3" /> INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header & Quick Action Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-950 text-indigo-400 rounded-2xl border border-indigo-800">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <span>سامانه ثبت و رصد لاگ‌های فنی و رویدادهای سیستم</span>
                <span className="px-2 py-0.5 bg-indigo-900/60 text-indigo-300 rounded-lg text-xs font-mono border border-indigo-800">
                  {logs.length} رویداد
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ثبت دقیق جزئیات تغییرات کاربران، رویدادهای همگام‌سازی و خطاهای دیتابیس جهت ریشه‌یابی مشکلات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportLogs}
              disabled={logs.length === 0}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>دانلود لاگ‌ها (JSON)</span>
            </button>

            <button
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="px-3.5 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 disabled:opacity-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>پاکسازی لاگ‌ها</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجو در پیام‌ها یا شناسه کاربر..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 pr-9 pl-3 py-2 rounded-xl text-xs focus:border-indigo-500 focus:outline-none placeholder-slate-500"
            />
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Filter className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs text-slate-400 shrink-0">سطح:</span>
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="bg-transparent text-slate-200 text-xs w-full font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">همه سطح‌ها</option>
              <option value="INFO" className="bg-slate-900">اطلاعاتی (INFO)</option>
              <option value="SUCCESS" className="bg-slate-900">موفقیت (SUCCESS)</option>
              <option value="WARN" className="bg-slate-900">هشدارها و حذف (WARN)</option>
              <option value="ERROR" className="bg-slate-900">خطاها (ERROR)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-400 shrink-0">دسته‌بندی:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent text-slate-200 text-xs w-full font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">همه دسته‌ها</option>
              <option value="USER_MGMT" className="bg-slate-900">مدیریت کاربران (USER_MGMT)</option>
              <option value="SYNC" className="bg-slate-900">همگام‌سازی (SYNC)</option>
              <option value="DATABASE" className="bg-slate-900">دیتابیس (DATABASE)</option>
              <option value="AUTH" className="bg-slate-900">ورود و خروج (AUTH)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table / Stream */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl text-slate-200 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-2">
            <Terminal className="w-8 h-8 mx-auto text-slate-700" />
            <p className="font-sans font-bold text-sm text-slate-400">هیچ لاگی یافت نشد</p>
            <p className="font-sans text-xs">عملیاتی در سیستم انجام دهید تا لاگ‌های مربوطه به صورت زنده ثبت گردند.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 max-h-[500px] overflow-y-auto">
            {filteredLogs.map(log => (
              <div
                key={log.id}
                onClick={() => setSelectedLogDetails(log)}
                className="p-3.5 hover:bg-slate-900/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer group"
              >
                <div className="flex items-start sm:items-center gap-2.5 overflow-hidden">
                  <span className="text-[11px] text-slate-500 dir-ltr shrink-0 font-mono">
                    {log.formattedTime}
                  </span>
                  {getLevelBadge(log.level)}
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800 shrink-0">
                    {log.category}
                  </span>
                  <span className="font-sans text-xs text-slate-200 font-medium truncate">
                    {log.message}
                  </span>
                </div>

                {log.details && (
                  <button className="text-[10px] text-indigo-400 group-hover:text-indigo-300 font-sans font-bold flex items-center gap-1 shrink-0 self-end sm:self-auto bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    مشاهده جزئیات داده
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLogDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs" dir="rtl">
          <div className="bg-slate-950 border border-slate-800 text-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {getLevelBadge(selectedLogDetails.level)}
                <span className="font-bold text-sm">{selectedLogDetails.message}</span>
              </div>
              <button
                onClick={() => setSelectedLogDetails(null)}
                className="text-slate-400 hover:text-white font-bold text-lg w-8 h-8 rounded-full flex items-center justify-center bg-slate-900 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-900 text-slate-400">
                <span>زمان ثبت:</span>
                <span className="text-slate-200 dir-ltr">{selectedLogDetails.timestamp}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900 text-slate-400">
                <span>دسته‌بندی:</span>
                <span className="text-indigo-400 font-bold">{selectedLogDetails.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900 text-slate-400">
                <span>شناسه دستگاه:</span>
                <span className="text-emerald-400">{selectedLogDetails.deviceId}</span>
              </div>

              {selectedLogDetails.details && (
                <div className="pt-2">
                  <span className="text-slate-400 font-bold block mb-1 font-sans">پارامترها و جزئیات شیء (JSON):</span>
                  <pre className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-emerald-300 text-[11px] overflow-x-auto text-left dir-ltr">
                    {JSON.stringify(selectedLogDetails.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedLogDetails(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl text-slate-200 transition cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
