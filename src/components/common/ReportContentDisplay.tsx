import React from 'react';
import { Tag, ShieldCheck, Eye, Info } from 'lucide-react';

interface ReportContentDisplayProps {
  content: string | undefined | null;
  className?: string;
  showBadges?: boolean;
}

export const ReportContentDisplay: React.FC<ReportContentDisplayProps> = ({
  content,
  className = '',
  showBadges = true
}) => {
  if (!content) return null;

  const raw = content || '';

  // Extract Metadata
  const isSupervisorNote = raw.includes('[SUPERVISOR_NOTE]');
  const isPublicReport = raw.includes('[PUBLIC_REPORT]');

  const colorMatch = raw.match(/\[COLOR:(slate|blue|emerald|amber|rose|indigo|purple)\]/);
  const color = colorMatch ? colorMatch[1] : 'blue';

  const catMatch = raw.match(/\[CAT:([^\]]+)\]/);
  const category = catMatch ? catMatch[1] : null;

  // Clean Text by removing all bracket tags
  const cleanText = raw
    .replace(/\[SUPERVISOR_NOTE\]/g, '')
    .replace(/\[COLOR:[^\]]+\]/g, '')
    .replace(/\[CAT:[^\]]+\]/g, '')
    .replace(/\[PUBLIC_REPORT\]/g, '')
    .trim();

  const isStatusChange = cleanText.startsWith('تغییر وضعیت');

  const tagColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    slate: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {showBadges && (category || isSupervisorNote || isPublicReport) && (
        <div className="flex items-center gap-1.5 flex-wrap my-0.5">
          {category && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${tagColors[color] || tagColors.blue}`}>
              <Tag className="w-3 h-3" />
              <span>{category}</span>
            </span>
          )}

          {isSupervisorNote && (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>یادداشت ارزیابی</span>
            </span>
          )}

          {isPublicReport && (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>گزارش عمومی</span>
            </span>
          )}
        </div>
      )}

      {isStatusChange ? (
        <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60 leading-relaxed whitespace-pre-wrap flex items-start gap-2">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <span>{cleanText}</span>
        </div>
      ) : (
        <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
          {cleanText}
        </p>
      )}
    </div>
  );
};
