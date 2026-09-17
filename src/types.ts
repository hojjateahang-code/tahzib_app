export type Role = 'VICE_PRINCIPAL' | 'DIRECTOR' | 'MENTOR' | 'COUNSELOR' | 'STUDENT' | 'TECH_ADMIN';

export type PrayerStatus = 'ADA_JAMAAT' | 'ADA_FORADA' | 'QAZA' | 'TARK' | 'NONE';

export interface BaseEntity {
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface User extends BaseEntity {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  base?: number;
  grade?: number;
  mentorId?: string;
  username?: string;
  password?: string;
  phone?: string;
  emergencyPhone?: string;
  address?: string;
  eitaaId?: string;
  eitaaUserId?: string;
  nationalId?: string;
  isApproved?: boolean;
  profileImage?: string;
  fatherName?: string;
  birthDate?: string;
  counselorTags?: string[];
  createdAt?: string;
}

export interface Task extends BaseEntity {
  id: string;
  title: string;
  description: string;
  roleTarget: Role | 'ALL';
  date: string;
  isCompleted: boolean; // Legacy
  assignedTo?: string; // ID of specific user
  type?: 'ONETIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'EVENT';
  dueDate?: string;
  checklist?: { id: string, title: string, isCompleted: boolean }[]; // Legacy
  
  // userCompletions[userId][periodKey]
  userCompletions?: Record<string, Record<string, {
    isCompleted: boolean;
    checklistCompleted: string[]; // array of completed checklist item ids
  }>>;
}

export interface PersonalHabit extends BaseEntity {
  id: string;
  studentId: string;
  title: string;
  startDate: string;
  endDate?: string; // if null/undefined, runs forever
  durationDays?: number; // e.g. 40 for 40-day course (چله)
  type?: 'BOOLEAN' | 'MULTICHOICE';
  options?: string[]; // e.g. ["عالی", "خوب", "متوسط", "انجام نشد"]
}

export interface ScreenTimeData {
  totalMinutes: number; // minutes
  apps?: {
    eitaa?: number;
    bale?: number;
    telegramSocial?: number;
    studyReading?: number;
    gamesMedia?: number;
    other?: number;
  };
  dynamicApps?: Record<string, number>; // Map of dynamic app names to usage minutes
  screenshotUrl?: string;
  notes?: string;
}

export interface Assessment extends BaseEntity {
  id: string;
  studentId: string;
  date: string;
  
  // Detailed Prayers
  namazSobh?: PrayerStatus;
  namazZohr?: PrayerStatus;
  namazAsr?: PrayerStatus;
  namazMaghreb?: PrayerStatus;
  namazEsha?: PrayerStatus;
  
  // Standard Tasks
  saharKhizi?: boolean;
  telavatNoor?: boolean;
  classAttendance?: boolean | 'FULL' | 'PARTIAL' | 'NONE';
  mabahese?: boolean | 'FULL' | 'PARTIAL' | 'NONE';
  earlySleep?: boolean;
  
  // Custom Habits completion map (habitId -> boolean or selected option string)
  customTasks?: Record<string, boolean | string>;
  
  // Screen time tracking (Digital Wellbeing)
  screenTime?: ScreenTimeData;

  // Notes for specific fields or general
  notes?: Record<string, string>;
  
  synced: boolean;
}

export interface PrivateNote extends BaseEntity {
  id: string;
  studentId: string;
  date: string; // ISO date or creation timestamp
  title?: string;
  content: string;
  folder?: string;
  attachments?: MessageAttachment[];
}

export interface Report extends BaseEntity {
  id: string;
  authorId: string; // Mentor or Counselor
  studentId: string;
  mentorId?: string;
  title?: string;
  type: 'MENTOR_EVAL' | 'COUNSELING_SESSION' | 'TASK_COMPLETION' | 'GENERAL' | 'REPORT' | 'EVALUATION';
  date: string;
  content: string;
  isConfidential: boolean;
  synced: boolean;
  createdAt?: string;
}

export interface Appointment extends BaseEntity {
  id: string;
  studentId: string;
  counselorId: string;
  date: string;
  status: 'SCHEDULED' | 'ATTENDED' | 'MISSED';
  cancelReason?: string;
  notes?: string;
}

export interface CustomGroup extends BaseEntity {
  id: string;
  ownerId: string;
  name: string;
  memberIds: string[];
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  size?: string;
}

export interface Message extends BaseEntity {
  id: string;
  senderId: string;
  recipientId: string;
  ccUserIds?: string[]; // IDs of users CCed in official correspondence
  type: 'OFFICIAL' | 'CHAT'; // OFFICIAL = مکاتبه رسمی, CHAT = گفتگوی عادی
  subject?: string; // موضوع مکاتبه
  content: string; // متن پیام
  attachments?: MessageAttachment[];
  date: string; // ISO String
  isRead?: boolean;
  synced?: boolean;
}

