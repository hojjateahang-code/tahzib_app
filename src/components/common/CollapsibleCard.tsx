import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  title: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerExtra?: React.ReactNode;
  badge?: React.ReactNode;
}

export function CollapsibleCard({
  title,
  icon: Icon,
  iconColor = "text-emerald-600 dark:text-emerald-400",
  children,
  defaultOpen = true,
  className = "",
  headerExtra,
  badge
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all overflow-hidden ${className}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {Icon && <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />}
          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
            {title}
          </div>
          {badge}
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {headerExtra}
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isOpen ? "بستن" : "باز کردن"}
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {children}
        </div>
      )}
    </div>
  );
}
