import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, ChevronLeft, X, Sparkles, Award } from 'lucide-react';
import { useAuth } from '../../store';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { getActiveCompetitionRound, CompetitionRound } from '../../utils/competitionRoundManager';
import { calculateStudentScoreSinceDate } from '../../utils/scoringSystem';
import { formatJalali } from '../../utils/date';

interface Props {
  onNavigateToLeaderboard?: () => void;
}

export function StudentCompetitionNoticeBanner({ onNavigateToLeaderboard }: Props) {
  const { currentUser } = useAuth();
  const [activeRound, setActiveRound] = useState<CompetitionRound | null>(() => getActiveCompetitionRound());
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleRoundChanged = (e: any) => {
      setActiveRound(e.detail as CompetitionRound | null);
      setIsDismissed(false);
    };
    window.addEventListener('COMPETITION_ROUND_CHANGED', handleRoundChanged);
    return () => window.removeEventListener('COMPETITION_ROUND_CHANGED', handleRoundChanged);
  }, []);

  const assessments = useLiveQuery(
    () => currentUser?.id ? db.assessments.where('studentId').equals(currentUser.id).toArray() : [],
    [currentUser?.id]
  );
  const notes = useLiveQuery(
    () => currentUser?.id ? db.privateNotes.where('studentId').equals(currentUser.id).toArray() : [],
    [currentUser?.id]
  );

  const scoreData = useMemo(() => {
    if (!currentUser || !activeRound || !activeRound.isActive || !assessments) return null;
    return calculateStudentScoreSinceDate(
      currentUser.id,
      activeRound.startDate,
      assessments,
      notes || [],
      undefined,
      undefined,
      undefined,
      activeRound.endDate
    );
  }, [currentUser, activeRound, assessments, notes]);

  // Check if dismissed for today
  useEffect(() => {
    if (!activeRound) return;
    const dismissedKey = `dismissed_comp_banner_${activeRound.id}_${currentUser?.id}`;
    const val = localStorage.getItem(dismissedKey);
    const today = new Date().toISOString().split('T')[0];
    if (val === today) {
      setIsDismissed(true);
    }
  }, [activeRound, currentUser?.id]);

  const handleDismiss = () => {
    if (!activeRound) return;
    setIsDismissed(true);
    const dismissedKey = `dismissed_comp_banner_${activeRound.id}_${currentUser?.id}`;
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(dismissedKey, today);
  };

  if (!activeRound || !activeRound.isActive || !activeRound.showInAnnouncements || isDismissed || !scoreData) {
    return null;
  }

  const startFa = formatJalali(activeRound.startDate);

  return (
    <div className="mb-4 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-white rounded-3xl p-4 sm:p-5 shadow-lg relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Background decorations */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-black/10 rounded-full blur-xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-white/20 backdrop-blur-xs rounded-2xl border border-white/30 text-white shrink-0 shadow-inner">
            <Trophy className="w-6 h-6 text-yellow-100" />
          </div>

          <div className="space-y-1 text-right">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black bg-black/20 text-yellow-100 px-2.5 py-0.5 rounded-full border border-white/20">
                🏆 دور مسابقه فعال مدرسه
              </span>
              <h4 className="text-base sm:text-lg font-black text-white">
                «{activeRound.title}»
              </h4>
            </div>

            <p className="text-xs text-amber-50 leading-relaxed max-w-xl">
              {activeRound.customAnnouncementText ? (
                activeRound.customAnnouncementText
              ) : (
                <span>
                  امتیازات شما از تاریخ <strong>{startFa}</strong> تا کنون محاسبه شده و در حال ثبت است.
                </span>
              )}
            </p>

            <div className="flex items-center gap-3 pt-1 text-xs">
              <span className="font-bold text-white flex items-center gap-1">
                <span>امتیاز شما در این دور:</span>
                <span className="font-mono font-black text-sm bg-white text-amber-800 px-2 py-0.5 rounded-lg shadow-2xs">
                  {scoreData.periodScore.toLocaleString('fa-IR')}
                </span>
                <span>امتیاز</span>
              </span>
              <span className="text-amber-100 text-[11px]">
                ({scoreData.daysCount} روز ارزیابی فعال)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onNavigateToLeaderboard) {
                onNavigateToLeaderboard();
              } else {
                window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: 'LEADERBOARD' }));
              }
            }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
          >
            <span>گردونه امتیازات و مسابقه</span>
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            title="بستن این اعلان"
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
