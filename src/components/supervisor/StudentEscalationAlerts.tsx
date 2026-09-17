import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAuth } from '../../store';
import { User, Assessment } from '../../types';
import { 
  AlertTriangle, ShieldAlert, Clock, ChevronDown, ChevronUp, 
  UserX, AlertCircle, Eye, ArrowLeft, BellRing
} from 'lucide-react';

interface AlertItem {
  student: User;
  mentorName?: string;
  daysInactive: number;
  consecutiveTarkDays: number;
  level: 'MENTOR' | 'VICE_PRINCIPAL' | 'DIRECTOR';
  reasons: string[];
}

interface StudentEscalationAlertsProps {
  onSelectStudent?: (studentId: string) => void;
  roleOverride?: 'MENTOR' | 'VICE_PRINCIPAL' | 'DIRECTOR' | 'COUNSELOR' | 'ADMIN';
}

export function StudentEscalationAlerts({ onSelectStudent, roleOverride }: StudentEscalationAlertsProps) {
  const { currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const userRole = roleOverride || currentUser?.role || 'MENTOR';

  const alertsData = useLiveQuery(async () => {
    const students = await db.users.where('role').equals('STUDENT').toArray();
    const allAssessments = await db.assessments.toArray();
    const mentors = await db.users.where('role').equals('MENTOR').toArray();

    const mentorMap = new Map<string, string>();
    mentors.forEach(m => mentorMap.set(m.id, m.name));

    // Group assessments by studentId
    const studentAssessmentsMap = new Map<string, Assessment[]>();
    allAssessments.forEach(a => {
      if (!studentAssessmentsMap.has(a.studentId)) {
        studentAssessmentsMap.set(a.studentId, []);
      }
      studentAssessmentsMap.get(a.studentId)!.push(a);
    });

    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    const flaggedAlerts: AlertItem[] = [];

    for (const student of students) {
      // If current user is a MENTOR, only check students assigned to this mentor
      if (userRole === 'MENTOR' && currentUser?.id && student.mentorId !== currentUser.id) {
        continue;
      }

      const assessments = studentAssessmentsMap.get(student.id) || [];
      // Sort assessments by date descending
      assessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let daysInactive = 0;
      if (assessments.length === 0) {
        // Created at calculation
        const createdObj = new Date(student.createdAt || new Date());
        createdObj.setHours(0, 0, 0, 0);
        daysInactive = Math.floor((todayObj.getTime() - createdObj.getTime()) / (1000 * 3600 * 24));
      } else {
        const latestDateObj = new Date(assessments[0].date);
        latestDateObj.setHours(0, 0, 0, 0);
        daysInactive = Math.floor((todayObj.getTime() - latestDateObj.getTime()) / (1000 * 3600 * 24));
      }

      // Check consecutive TARK (abandonment / missed prayers/tasks)
      let consecutiveTarkDays = 0;
      for (const ass of assessments) {
        const hasTark = Object.values(ass).some(val => val === 'TARK' || val === false || val === 'NONE');
        if (hasTark) {
          consecutiveTarkDays++;
        } else {
          break;
        }
      }

      const reasons: string[] = [];
      let level: 'MENTOR' | 'VICE_PRINCIPAL' | 'DIRECTOR' | null = null;

      // Rule 1: Escalation for Inactivity (>2 days mentor, >3 days vice principal, >5 days director)
      if (daysInactive > 5) {
        level = 'DIRECTOR';
        reasons.push(`عدم خوداظهاری بیش از ۵ روز (${daysInactive} روز عدم ثبت) - سطح مدیریت`);
      } else if (daysInactive > 3) {
        level = 'VICE_PRINCIPAL';
        reasons.push(`عدم خوداظهاری بیش از ۳ روز (${daysInactive} روز عدم ثبت) - سطح معاونت تهذیب`);
      } else if (daysInactive > 2) {
        level = 'MENTOR';
        reasons.push(`عدم خوداظهاری بیش از ۲ روز (${daysInactive} روز عدم ثبت) - سطح استاد راهنما`);
      }

      // Rule 2: Escalation for continuous TARK / abandonment
      if (consecutiveTarkDays >= 5) {
        if (!level || level === 'MENTOR' || level === 'VICE_PRINCIPAL') level = 'DIRECTOR';
        reasons.push(`${consecutiveTarkDays} روز متوالی عدم انجام / ترک برنامه‌ها - سطح مدیریت`);
      } else if (consecutiveTarkDays >= 3) {
        if (!level || level === 'MENTOR') level = 'VICE_PRINCIPAL';
        reasons.push(`${consecutiveTarkDays} روز متوالی عدم انجام / ترک برنامه‌ها - سطح معاونت تهذیب`);
      } else if (consecutiveTarkDays >= 2) {
        if (!level) level = 'MENTOR';
        reasons.push(`${consecutiveTarkDays} روز متوالی عدم انجام / ترک برنامه‌ها - سطح استاد راهنما`);
      }

      if (level && reasons.length > 0) {
        // Filter based on userRole permission
        let includeForUser = false;
        if (userRole === 'DIRECTOR' || userRole === 'ADMIN' || userRole === 'COUNSELOR') {
          includeForUser = true; // Director/Admin/Counselor can see all escalated warnings
        } else if (userRole === 'VICE_PRINCIPAL') {
          includeForUser = level === 'VICE_PRINCIPAL' || level === 'MENTOR' || level === 'DIRECTOR';
        } else if (userRole === 'MENTOR') {
          includeForUser = true; // Mentor sees alerts for their own assigned students
        }

        if (includeForUser) {
          flaggedAlerts.push({
            student,
            mentorName: student.mentorId ? mentorMap.get(student.mentorId) || 'نامشخص' : 'بدون استاد',
            daysInactive,
            consecutiveTarkDays,
            level,
            reasons
          });
        }
      }
    }

    // Sort alerts by highest escalation level first (DIRECTOR > VICE_PRINCIPAL > MENTOR)
    const levelWeight = { DIRECTOR: 3, VICE_PRINCIPAL: 2, MENTOR: 1 };
    return flaggedAlerts.sort((a, b) => levelWeight[b.level] - levelWeight[a.level] || b.daysInactive - a.daysInactive);
  }, [currentUser, userRole]);

  if (!alertsData || alertsData.length === 0) {
    return null;
  }

  const directorAlertsCount = alertsData.filter(a => a.level === 'DIRECTOR').length;
  const vpAlertsCount = alertsData.filter(a => a.level === 'VICE_PRINCIPAL').length;
  const mentorAlertsCount = alertsData.filter(a => a.level === 'MENTOR').length;

  return (
    <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-orange-500/10 dark:from-rose-950/40 dark:via-amber-950/40 dark:to-orange-950/40 rounded-3xl border border-rose-200 dark:border-rose-900/60 p-4 sm:p-5 mb-6 shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-md animate-pulse shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-rose-900 dark:text-rose-200 text-base">
                سامانه هوشمند هشدار عدم خوداظهاری و ترک برنامه‌ها
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs">
                {alertsData.length} طالب نیازمند پیگیری
              </span>
            </div>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 font-medium">
              طبق آئین‌نامه: ۲ روز (استاد راهنما) | ۳ روز (معاونت تهذیب) | ۵ روز (مدیریت)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold">
            {directorAlertsCount > 0 && (
              <span className="px-2 py-1 rounded-lg bg-rose-700 text-white border border-rose-800" title="سطح مدیریت">
                {directorAlertsCount} مدیر
              </span>
            )}
            {vpAlertsCount > 0 && (
              <span className="px-2 py-1 rounded-lg bg-amber-600 text-white border border-amber-700" title="سطح معاونت">
                {vpAlertsCount} معاونت
              </span>
            )}
            {mentorAlertsCount > 0 && (
              <span className="px-2 py-1 rounded-lg bg-blue-600 text-white border border-blue-700" title="سطح استاد راهنما">
                {mentorAlertsCount} استاد
              </span>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded List */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-rose-200/80 dark:border-rose-900/60 grid grid-cols-1 md:grid-cols-2 gap-3">
          {alertsData.map(({ student, mentorName, daysInactive, level, reasons }) => {
            let badgeBg = 'bg-blue-600 text-white';
            let badgeLabel = 'سطح ۱: استاد راهنما';
            let cardBorder = 'border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-slate-900/80';

            if (level === 'DIRECTOR') {
              badgeBg = 'bg-rose-700 text-white animate-pulse';
              badgeLabel = 'سطح ۳: مدیریت (فوری)';
              cardBorder = 'border-rose-300 dark:border-rose-900/80 bg-rose-50/50 dark:bg-slate-900/90';
            } else if (level === 'VICE_PRINCIPAL') {
              badgeBg = 'bg-amber-600 text-white';
              badgeLabel = 'سطح ۲: معاونت تهذیب';
              cardBorder = 'border-amber-300 dark:border-amber-900/80 bg-amber-50/50 dark:bg-slate-900/90';
            }

            return (
              <div
                key={student.id}
                className={`p-3.5 rounded-2xl border ${cardBorder} flex flex-col justify-between gap-3 shadow-2xs`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                          {student.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          استاد راهنما: {mentorName} | پایه {student.grade || '۱'}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${badgeBg}`}>
                      {badgeLabel}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {reasons.map((r, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs text-rose-900 dark:text-rose-200 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span className="leading-tight">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-slate-800/60">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    تاخیر ثبت: <strong className="text-rose-600 dark:text-rose-400 font-black">{daysInactive} روز</strong>
                  </span>

                  {onSelectStudent && (
                    <button
                      onClick={() => onSelectStudent(student.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>بررسی وضعیت طلبه</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
