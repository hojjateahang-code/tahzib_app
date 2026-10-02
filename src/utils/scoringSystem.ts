import { Assessment, User, PrivateNote, TahzibProgram, StudentCourseEnrollment } from '../types';

export interface ScoreWeights {
  prayerJamaat: number;
  prayerForada: number;
  prayerQaza: number;
  saharKhizi: number;
  telavatNoor: number;
  classAttendanceFull: number;
  classAttendancePartial: number;
  mabaheseFull: number;
  mabahesePartial: number;
  earlySleep: number;
  tahzibProgramCompleted: number;
  heyatAttendance: number;
  personalHabitCompleted: number;
  screenTimeAutoExtracted: number;
  screenTimeNoNightUsage: number;
  screenTimeLowDaily: number;
  onTimeSubmission: number;
  privateNote: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  prayerJamaat: 20,
  prayerForada: 10,
  prayerQaza: 2,
  saharKhizi: 25,
  telavatNoor: 15,
  classAttendanceFull: 15,
  classAttendancePartial: 7,
  mabaheseFull: 15,
  mabahesePartial: 7,
  earlySleep: 10,
  tahzibProgramCompleted: 15,
  heyatAttendance: 20,
  personalHabitCompleted: 10,
  screenTimeAutoExtracted: 10,
  screenTimeNoNightUsage: 15,
  screenTimeLowDaily: 10,
  onTimeSubmission: 10,
  privateNote: 5
};

export interface LevelDefinition {
  levelNumber: number;
  title: string;
  minScore: number;
  badgeColor: string;
  bgLight: string;
  borderLight: string;
  description: string;
}

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  {
    levelNumber: 1,
    title: 'سالک مقدماتی',
    minScore: 0,
    badgeColor: 'text-slate-600 dark:text-slate-300',
    bgLight: 'bg-slate-100 dark:bg-slate-800',
    borderLight: 'border-slate-300 dark:border-slate-700',
    description: 'شروع مسیر خودسازی و انضباط معنوی'
  },
  {
    levelNumber: 2,
    title: 'سالک کوشا',
    minScore: 350,
    badgeColor: 'text-amber-700 dark:text-amber-300',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    borderLight: 'border-amber-300 dark:border-amber-800',
    description: 'نظم در عبادات و پیوستگی در ثبت خوداظهاری'
  },
  {
    levelNumber: 3,
    title: 'اهل مراقبه',
    minScore: 800,
    badgeColor: 'text-teal-700 dark:text-teal-300',
    bgLight: 'bg-teal-50 dark:bg-teal-950/40',
    borderLight: 'border-teal-300 dark:border-teal-800',
    description: 'حضور مستمر در جماعت و سحرخیزی هدفمند'
  },
  {
    levelNumber: 4,
    title: 'مجاهد نفس',
    minScore: 1600,
    badgeColor: 'text-emerald-700 dark:text-emerald-300',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderLight: 'border-emerald-300 dark:border-emerald-800',
    description: 'استمرار چله‌ها، مباحثات پرثمر و انضباط دیجیتال'
  },
  {
    levelNumber: 5,
    title: 'پیشگام تهذیب',
    minScore: 2800,
    badgeColor: 'text-indigo-700 dark:text-indigo-300',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderLight: 'border-indigo-300 dark:border-indigo-800',
    description: 'الگوی ممتاز در پایبندی به تمامی سنن و برنامه‌ها'
  },
  {
    levelNumber: 6,
    title: 'اسوه اخلاق و انضباط',
    minScore: 4500,
    badgeColor: 'text-amber-500 dark:text-amber-400',
    bgLight: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40',
    borderLight: 'border-amber-400 dark:border-amber-600',
    description: 'بالاترین درجه شایستگی، استمرار و اخلاص در تربیت معنوی'
  }
];

export interface StudentScoreBreakdown {
  prayers: number;
  coreTasks: number;
  tahzibPrograms: number;
  habits: number;
  digitalDiscipline: number;
  consistency: number;
  streakBonus: number;
  notes: number;
  courses: number;
}

export interface StudentScoreProfile {
  studentId: string;
  studentName: string;
  nationalId?: string;
  base?: number;
  mentorId?: string;
  avatar?: string;
  totalScore: number;
  periodScore: number;
  rankInSchool: number;
  rankInBase: number;
  totalStudentsInSchool: number;
  totalStudentsInBase: number;
  currentStreakDays: number;
  maxStreakDays: number;
  level: {
    levelNumber: number;
    title: string;
    minScore: number;
    nextLevelScore: number;
    progressPercent: number;
    badgeColor: string;
    bgLight: string;
    borderLight: string;
    description: string;
  };
  breakdown: StudentScoreBreakdown;
  activeAssessmentsCount: number;
  lastActiveDate?: string;
}

/**
 * Calculates the score breakdown for a single day's assessment
 */
export function calculateSingleAssessmentScore(
  assessment: Assessment,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
  allPrograms?: TahzibProgram[]
): StudentScoreBreakdown {
  const breakdown: StudentScoreBreakdown = {
    prayers: 0,
    coreTasks: 0,
    tahzibPrograms: 0,
    habits: 0,
    digitalDiscipline: 0,
    consistency: 0,
    streakBonus: 0,
    notes: 0,
    courses: 0
  };

  if (!assessment || assessment.isDeleted) return breakdown;

  // 1. Prayers
  const prayerFields = [
    assessment.namazSobh,
    assessment.namazZohr,
    assessment.namazAsr,
    assessment.namazMaghreb,
    assessment.namazEsha
  ];

  prayerFields.forEach(p => {
    if (p === 'ADA_JAMAAT') breakdown.prayers += weights.prayerJamaat;
    else if (p === 'ADA_FORADA') breakdown.prayers += weights.prayerForada;
    else if (p === 'QAZA') breakdown.prayers += weights.prayerQaza;
  });

  // 2. Core Seminary Tasks
  if (assessment.saharKhizi) breakdown.coreTasks += weights.saharKhizi;
  if (assessment.telavatNoor) breakdown.coreTasks += weights.telavatNoor;
  
  if (assessment.classAttendance === true || assessment.classAttendance === 'FULL') {
    breakdown.coreTasks += weights.classAttendanceFull;
  } else if (assessment.classAttendance === 'PARTIAL') {
    breakdown.coreTasks += weights.classAttendancePartial;
  }

  if (assessment.mabahese === true || assessment.mabahese === 'FULL') {
    breakdown.coreTasks += weights.mabaheseFull;
  } else if (assessment.mabahese === 'PARTIAL') {
    breakdown.coreTasks += weights.mabahesePartial;
  }

  if (assessment.earlySleep) breakdown.coreTasks += weights.earlySleep;

  // 3. Tahzib Programs (including School Heyat & custom programs created by Vice Principal)
  if (assessment.tahzibProgramAnswers) {
    const coreProgIds = new Set(['prog_sahar', 'prog_telavat', 'prog_class', 'prog_mabahese', 'prog_sleep']);
    const progMap = new Map<string, TahzibProgram>();
    (allPrograms || []).forEach(p => progMap.set(p.id, p));

    Object.entries(assessment.tahzibProgramAnswers).forEach(([progId, ans]) => {
      // Don't double count if it's already counted in coreTasks
      if (coreProgIds.has(progId)) return;

      const isCompleted = ans === true || 
        (typeof ans === 'number' && ans > 0) || 
        (typeof ans === 'string' && ans.trim().length > 0 && ans !== 'NONE' && ans !== 'خیر' && ans !== 'انجام نشد' && ans !== 'عدم شرکت');

      if (isCompleted) {
        const progMeta = progMap.get(progId);
        if (progMeta && typeof progMeta.score === 'number' && progMeta.score > 0) {
          breakdown.tahzibPrograms += progMeta.score;
        } else if (progId === 'prog_heyat') {
          breakdown.tahzibPrograms += (weights.heyatAttendance || 20);
        } else {
          breakdown.tahzibPrograms += weights.tahzibProgramCompleted;
        }
      }
    });
  }

  // 4. Custom Habits / Chellehs
  if (assessment.customTasks) {
    Object.values(assessment.customTasks).forEach(val => {
      if (val === true || (typeof val === 'string' && val.trim().length > 0 && val !== 'NONE' && val !== 'خیر')) {
        breakdown.habits += weights.personalHabitCompleted;
      }
    });
  }

  // 5. Digital Wellbeing (Screen Time) - granted upon final submission
  if (assessment.screenTime && assessment.screenTime.isFinalSubmitted !== false) {
    const st = assessment.screenTime;
    if (st.autoExtracted) {
      breakdown.digitalDiscipline += weights.screenTimeAutoExtracted;
    }
    // No night usage (after 22:30)
    const nightMins = Number(st.nightTotalMinutes) || 0;
    if (nightMins === 0 && (st.totalMinutes > 0 || (st.dynamicApps && Object.keys(st.dynamicApps).length > 0))) {
      breakdown.digitalDiscipline += weights.screenTimeNoNightUsage;
    }
    // Controlled overall daily screen time (under 90 mins)
    const totalM = Number(st.totalMinutes) || 0;
    if (totalM > 0 && totalM <= 90) {
      breakdown.digitalDiscipline += weights.screenTimeLowDaily;
    }
  }

  // 6. On-Time Submission
  breakdown.consistency += weights.onTimeSubmission;

  return breakdown;
}

/**
 * Calculates current consecutive streak days and maximum streak
 */
export function calculateStreaks(dates: string[]): { currentStreak: number; maxStreak: number } {
  if (!dates || dates.length === 0) return { currentStreak: 0, maxStreak: 0 };

  // Sort unique dates descending (YYYY-MM-DD)
  const uniqueDates = Array.from(new Set(dates)).sort().reverse();
  if (uniqueDates.length === 0) return { currentStreak: 0, maxStreak: 0 };

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  // Check if current streak is active (submitted today or yesterday)
  const isCurrentlyActive = uniqueDates[0] === today || uniqueDates[0] === yesterday;

  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
      continue;
    }

    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      if (tempStreak > maxStreak) maxStreak = tempStreak;
      tempStreak = 1;
    }
  }

  if (tempStreak > maxStreak) maxStreak = tempStreak;

  if (isCurrentlyActive) {
    currentStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  return { currentStreak, maxStreak };
}

/**
 * Determines level details based on total accumulated score
 */
export function getLevelDetails(totalScore: number) {
  let matchedLevel = LEVEL_DEFINITIONS[0];
  let nextLevel = LEVEL_DEFINITIONS[1];

  for (let i = LEVEL_DEFINITIONS.length - 1; i >= 0; i--) {
    if (totalScore >= LEVEL_DEFINITIONS[i].minScore) {
      matchedLevel = LEVEL_DEFINITIONS[i];
      nextLevel = LEVEL_DEFINITIONS[i + 1] || LEVEL_DEFINITIONS[i];
      break;
    }
  }

  const isMaxLevel = matchedLevel.levelNumber === LEVEL_DEFINITIONS.length;
  const currentLevelMin = matchedLevel.minScore;
  const nextLevelMin = isMaxLevel ? currentLevelMin : nextLevel.minScore;
  const denominator = nextLevelMin - currentLevelMin;

  const progressPercent = isMaxLevel 
    ? 100 
    : Math.min(100, Math.max(0, Math.round(((totalScore - currentLevelMin) / Math.max(1, denominator)) * 100)));

  return {
    levelNumber: matchedLevel.levelNumber,
    title: matchedLevel.title,
    minScore: matchedLevel.minScore,
    nextLevelScore: nextLevelMin,
    progressPercent,
    badgeColor: matchedLevel.badgeColor,
    bgLight: matchedLevel.bgLight,
    borderLight: matchedLight(matchedLevel),
    description: matchedLevel.description
  };
}

function matchedLight(l: LevelDefinition): string {
  return l.borderLight;
}

/**
 * Calculates streak bonus points
 */
export function calculateStreakBonus(streakDays: number): number {
  let bonus = 0;
  if (streakDays >= 40) bonus += 400;
  else if (streakDays >= 21) bonus += 200;
  else if (streakDays >= 14) bonus += 120;
  else if (streakDays >= 7) bonus += 50;
  else if (streakDays >= 3) bonus += 15;
  return bonus;
}

/**
 * Check if a date string falls inside the chosen period
 */
export function isDateInPeriod(dateStr: string, period: 'ALL' | 'MONTH' | 'WEEK'): boolean {
  if (period === 'ALL') return true;
  const targetTime = new Date(dateStr).getTime();
  const now = Date.now();
  const diffDays = (now - targetTime) / (1000 * 60 * 60 * 24);

  if (period === 'WEEK') {
    return diffDays >= -1 && diffDays <= 7;
  }
  if (period === 'MONTH') {
    return diffDays >= -1 && diffDays <= 30;
  }
  return true;
}

/**
 * Generates the full leaderboard and ranking for all students
 */
export function calculateLeaderboard(
  students: User[],
  assessments: Assessment[],
  notes: PrivateNote[] = [],
  period: 'ALL' | 'MONTH' | 'WEEK' = 'ALL',
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
  enrollments: StudentCourseEnrollment[] = [],
  programs: TahzibProgram[] = []
): StudentScoreProfile[] {
  const activeStudents = (students || []).filter(u => u.role === 'STUDENT' && !u.isDeleted && u.isApproved !== false);

  // Group assessments by student
  const studentAssessmentsMap = new Map<string, Assessment[]>();
  (assessments || []).forEach(a => {
    if (a.isDeleted) return;
    const list = studentAssessmentsMap.get(a.studentId) || [];
    list.push(a);
    studentAssessmentsMap.set(a.studentId, list);
  });

  // Group notes by student
  const studentNotesMap = new Map<string, PrivateNote[]>();
  (notes || []).forEach(n => {
    const list = studentNotesMap.get(n.studentId) || [];
    list.push(n);
    studentNotesMap.set(n.studentId, list);
  });

  // Group enrollments by student
  const studentEnrollmentsMap = new Map<string, StudentCourseEnrollment[]>();
  (enrollments || []).forEach(e => {
    if (e.isDeleted || e.status !== 'COMPLETED') return;
    const list = studentEnrollmentsMap.get(e.studentId) || [];
    list.push(e);
    studentEnrollmentsMap.set(e.studentId, list);
  });

  // Calculate profile for each student
  const profiles: StudentScoreProfile[] = activeStudents.map(student => {
    const userAssessments = studentAssessmentsMap.get(student.id) || [];
    const userNotes = studentNotesMap.get(student.id) || [];
    const userEnrollments = studentEnrollmentsMap.get(student.id) || [];

    const submissionDates = userAssessments.map(a => a.date);
    const { currentStreak, maxStreak } = calculateStreaks(submissionDates);

    const breakdown: StudentScoreBreakdown = {
      prayers: 0,
      coreTasks: 0,
      tahzibPrograms: 0,
      habits: 0,
      digitalDiscipline: 0,
      consistency: 0,
      streakBonus: calculateStreakBonus(currentStreak),
      notes: 0,
      courses: 0
    };

    let activeAssessmentsCount = 0;
    let lastActiveDate: string | undefined = undefined;

    userAssessments.forEach(ass => {
      const inPeriod = isDateInPeriod(ass.date, period);
      if (inPeriod) {
        activeAssessmentsCount++;
        const dayScore = calculateSingleAssessmentScore(ass, weights, programs);
        breakdown.prayers += dayScore.prayers;
        breakdown.coreTasks += dayScore.coreTasks;
        breakdown.tahzibPrograms += dayScore.tahzibPrograms;
        breakdown.habits += dayScore.habits;
        breakdown.digitalDiscipline += dayScore.digitalDiscipline;
        breakdown.consistency += dayScore.consistency;
      }
      if (!lastActiveDate || ass.date > lastActiveDate) {
        lastActiveDate = ass.date;
      }
    });

    // Notes bonus in period (1 note = 5 points, max 1 per day)
    const uniqueNoteDates = new Set(
      userNotes.filter(n => isDateInPeriod(n.date?.split('T')[0] || '', period)).map(n => n.date?.split('T')[0])
    );
    breakdown.notes = uniqueNoteDates.size * weights.privateNote;

    // Completed Courses & Workshops bonus
    userEnrollments.forEach(enr => {
      const completionDate = enr.completedAt ? enr.completedAt.split('T')[0] : '';
      if (isDateInPeriod(completionDate, period)) {
        const pts = enr.scoreAwarded || 0;
        breakdown.courses += pts;
        breakdown.tahzibPrograms += pts;
      }
    });

    const periodScore = 
      breakdown.prayers +
      breakdown.coreTasks +
      breakdown.tahzibPrograms +
      breakdown.habits +
      breakdown.digitalDiscipline +
      breakdown.consistency +
      breakdown.streakBonus +
      breakdown.notes;

    // For total career score (always all-time regardless of period filter):
    let allTimeScore = periodScore;
    if (period !== 'ALL') {
      let career = calculateStreakBonus(maxStreak);
      userAssessments.forEach(ass => {
        const day = calculateSingleAssessmentScore(ass, weights, programs);
        career += (day.prayers + day.coreTasks + day.tahzibPrograms + day.habits + day.digitalDiscipline + day.consistency);
      });
      const allUniqueNoteDates = new Set(userNotes.map(n => n.date?.split('T')[0]));
      career += allUniqueNoteDates.size * weights.privateNote;
      userEnrollments.forEach(enr => {
        career += (enr.scoreAwarded || 0);
      });
      allTimeScore = career;
    }

    const levelDetails = getLevelDetails(allTimeScore);

    return {
      studentId: student.id,
      studentName: student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'طلبه بدون نام',
      nationalId: student.nationalId,
      base: student.base,
      mentorId: student.mentorId,
      avatar: student.profileImage,
      totalScore: allTimeScore,
      periodScore,
      rankInSchool: 0, // Assigned below
      rankInBase: 0,   // Assigned below
      totalStudentsInSchool: activeStudents.length,
      totalStudentsInBase: 0, // Assigned below
      currentStreakDays: currentStreak,
      maxStreakDays: maxStreak,
      level: levelDetails,
      breakdown,
      activeAssessmentsCount,
      lastActiveDate
    };
  });

  // Sort descending by periodScore (secondary tie-breaker: totalScore, then streak)
  profiles.sort((a, b) => {
    if (b.periodScore !== a.periodScore) return b.periodScore - a.periodScore;
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.currentStreakDays - a.currentStreakDays;
  });

  // Assign rank in school
  profiles.forEach((p, idx) => {
    p.rankInSchool = idx + 1;
  });

  // Group by base to assign rank in base
  const baseGroups = new Map<number, StudentScoreProfile[]>();
  profiles.forEach(p => {
    const baseKey = p.base || 1;
    const group = baseGroups.get(baseKey) || [];
    group.push(p);
    baseGroups.set(baseKey, group);
  });

  baseGroups.forEach(group => {
    group.sort((a, b) => {
      if (b.periodScore !== a.periodScore) return b.periodScore - a.periodScore;
      return b.totalScore - a.totalScore;
    });
    const totalInBase = group.length;
    group.forEach((p, idx) => {
      p.rankInBase = idx + 1;
      p.totalStudentsInBase = totalInBase;
    });
  });

  return profiles;
}
