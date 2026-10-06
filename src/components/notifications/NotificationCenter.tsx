import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { User } from '../../types';
import { Bell, Mail, UserPlus, FileText, CheckSquare, AlertCircle, X, CheckCheck, Trash2, Eye } from 'lucide-react';
import { triggerSync } from '../../sync';
import { getTodayDateStr, isSameDay, isAssessmentSubmitted } from '../../utils/assessmentUtils';

interface Props {
  currentUser: User;
  onNavigateTab?: (tabId: string) => void;
}

export interface NotificationItem {
  id: string;
  type: 'MESSAGE' | 'REFERRAL' | 'APPROVAL' | 'TASK' | 'ASSESSMENT';
  title: string;
  description: string;
  date: string;
  isRead: boolean;
  linkTab?: string;
  targetId?: string;
  senderId?: string;
}

export function NotificationCenter({ currentUser, onNavigateTab }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`dismissed_notifs_${currentUser.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`dismissed_notifs_${currentUser.id}`, JSON.stringify(dismissedIds));
    } catch {
      // ignore
    }
  }, [dismissedIds, currentUser.id]);

  // Fetch unread messages specifically for currentUser
  const unreadMessages = useLiveQuery(
    async () => {
      const msgs = await db.messages.toArray();
      return msgs.filter(m => 
        (m.recipientId === currentUser.id || (m.ccUserIds && m.ccUserIds.includes(currentUser.id))) && 
        !m.isRead
      );
    },
    [currentUser.id]
  );

  // Fetch all users for name lookups
  const rawAllUsers = useLiveQuery(() => db.users.toArray());
  const allUsers = rawAllUsers?.filter(u => !u.isDeleted);

  // Pending approvals ONLY for VICE_PRINCIPAL & DIRECTOR
  const pendingUsers = useLiveQuery(
    async () => {
      if (currentUser.role !== 'VICE_PRINCIPAL' && currentUser.role !== 'DIRECTOR') return [];
      const users = await db.users.toArray();
      return users.filter(u => !u.isApproved && !u.isDeleted);
    },
    [currentUser.role]
  );

  // Consultation students for COUNSELOR or MENTOR (for mentor's base) or VP/Director
  const consultStudents = useLiveQuery(
    async () => {
      if (currentUser.role === 'STUDENT') return []; // Never show consultation referrals to students!
      const rawStudents = await db.users.where('role').equals('STUDENT').toArray();
      const students = rawStudents.filter(s => !s.isDeleted);
      const reports = await db.reports.toArray();

      const filtered = students.filter(s => {
        if (!s.counselorTags?.includes('CONSULT_NEEDED')) return false;
        if (currentUser.role === 'MENTOR' && currentUser.base) {
          return s.base === currentUser.base;
        }
        return true;
      });

      return filtered.map(s => {
        const studentReports = reports
          .filter(r => r.studentId === s.id && r.type === 'COUNSELING_SESSION')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return {
          student: s,
          latestReport: studentReports[0]
        };
      });
    },
    [currentUser.role, currentUser.base]
  );

  // Tasks targeted specifically at user's role
  const pendingTasks = useLiveQuery(
    async () => {
      const tasks = await db.tasks.toArray();
      return tasks.filter(t => 
        (t.roleTarget === currentUser.role || t.roleTarget === 'ALL' || t.assignedTo === currentUser.id) &&
        !t.isCompleted
      );
    },
    [currentUser.role, currentUser.id]
  );

  // Student self-assessment check
  const todayAssessmentSubmitted = useLiveQuery(
    async () => {
      if (currentUser.role !== 'STUDENT') return true;
      const today = getTodayDateStr();
      const records = await db.assessments
        .where('studentId')
        .equals(currentUser.id)
        .toArray();
      const todayRecord = records.find(a => !a.isDeleted && isSameDay(a.date, today));
      return isAssessmentSubmitted(todayRecord);
    },
    [currentUser.id, currentUser.role]
  );

  // Student upcoming/scheduled counseling appointments reminders
  const studentAppointments = useLiveQuery(
    async () => {
      if (currentUser.role !== 'STUDENT') return [];
      const appts = await db.appointments.where({ studentId: currentUser.id }).toArray();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return appts.filter(a => a.status === 'SCHEDULED' && new Date(a.date) >= todayStart);
    },
    [currentUser.id, currentUser.role]
  );

  // Combine into unified, role-strict notification items
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Unread Messages
    if (unreadMessages) {
      unreadMessages.forEach(m => {
        const sender = allUsers?.find(u => u.id === m.senderId);
        list.push({
          id: `msg-${m.id}`,
          type: 'MESSAGE',
          title: m.type === 'OFFICIAL' ? `نامه رسمی: ${m.subject || 'بدون موضوع'}` : `پیام مستقیم از ${sender?.name || 'کاربر'}`,
          description: m.content.length > 60 ? m.content.substring(0, 60) + '...' : m.content,
          date: m.date,
          isRead: false,
          linkTab: 'MESSAGES',
          targetId: m.id,
          senderId: m.senderId
        });
      });
    }

    // 2. Pending Approvals (VP / Director only)
    if (pendingUsers && pendingUsers.length > 0) {
      pendingUsers.forEach(u => {
        list.push({
          id: `appr-${u.id}`,
          type: 'APPROVAL',
          title: 'ثبت‌نام جدید نیازمند تایید',
          description: `درخواست ثبت‌نام توسط ${u.name} (${u.nationalId || 'بدون کد ملی'})`,
          date: new Date().toISOString(),
          isRead: false,
          linkTab: 'USERS',
          targetId: u.id
        });
      });
    }

    // 3. Consultation Referrals (Counselor, Mentor, VP, Director only)
    if (consultStudents && consultStudents.length > 0) {
      consultStudents.forEach(({ student: s, latestReport }) => {
        const reportDate = latestReport?.date || new Date().toISOString();
        const rawReason = latestReport?.content ? latestReport.content.replace(/\[SUPERVISOR_NOTE\]|\[COLOR:[^\]]+\]|\[CAT:[^\]]+\]|\[PUBLIC_REPORT\]/g, '').trim() : '';
        const reasonStr = rawReason || `طلبه ${s.name} (پایه ${s.base || 1}) نیازمند بررسی و مشاوره است.`;
        list.push({
          id: `ref-${s.id}-${latestReport?.id || 'base'}`,
          type: 'REFERRAL',
          title: `🚨 ارجاع جدید به مشاوره: ${s.name}`,
          description: reasonStr,
          date: reportDate,
          isRead: false,
          linkTab: currentUser.role === 'COUNSELOR' ? 'REPORTS' : 'STUDENTS',
          targetId: s.id
        });
      });
    }

    // 4. Pending Tasks
    if (pendingTasks) {
      pendingTasks.forEach(t => {
        list.push({
          id: `task-${t.id}`,
          type: 'TASK',
          title: 'وظیفه و ابلاغیه جدید',
          description: t.title,
          date: t.date || new Date().toISOString(),
          isRead: false,
          linkTab: currentUser.role === 'STUDENT' ? 'ASSESSMENT' : 'TASKS',
          targetId: t.id
        });
      });
    }

    // 5. Daily Self Assessment warning for Students
    if (currentUser.role === 'STUDENT' && !todayAssessmentSubmitted) {
      list.push({
        id: `assessment-today-${new Date().toISOString().split('T')[0]}`,
        type: 'ASSESSMENT',
        title: 'یادآوری خوداظهاری امروز',
        description: 'هنوز ارزیابی روزانه خود را برای امروز ثبت نکرده‌اید.',
        date: new Date().toISOString(),
        isRead: false,
        linkTab: 'ASSESSMENT'
      });
    }

    // 6. Counseling Appointment Reminders for Students (Daily until appointment date)
    if (currentUser.role === 'STUDENT' && studentAppointments && studentAppointments.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      studentAppointments.forEach(appt => {
        const apptDateObj = new Date(appt.date);
        const isToday = apptDateObj >= todayStart && apptDateObj <= todayEnd;
        const faDate = apptDateObj.toLocaleDateString('fa-IR');
        const faTime = apptDateObj.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

        list.push({
          id: `appt-remind-${appt.id}-${todayStr}`,
          type: 'TASK',
          title: isToday ? '⏰ یادآوری مهم: جلسه مشاوره امروز' : '📅 یادآوری: جلسه مشاوره پیش‌رو',
          description: isToday
            ? `جلسه مشاوره شما امروز ساعت ${faTime} برگزار می‌شود. لطفاً در زمان مقرر حضور یافته و پس از جلسه حضور خود را ثبت کنید.`
            : `جلسه مشاوره شما برای تاریخ ${faDate} ساعت ${faTime} برنامه‌ریزی شده است.`,
          date: new Date().toISOString(),
          isRead: false,
          linkTab: 'ASSESSMENT',
          targetId: appt.id
        });
      });
    }

    // Filter out dismissed items
    return list
      .filter(n => !dismissedIds.includes(n.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [unreadMessages, pendingUsers, consultStudents, pendingTasks, todayAssessmentSubmitted, studentAppointments, allUsers, currentUser.role, dismissedIds]);

  const totalCount = notifications.length;

  const dismissNotification = async (notif: NotificationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Mark as dismissed locally
    setDismissedIds(prev => [...prev, notif.id]);

    // If it's a message, mark as read in DB
    if (notif.type === 'MESSAGE' && notif.targetId) {
      await db.messages.update(notif.targetId, { isRead: true });
      triggerSync();
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    await dismissNotification(notif);
    setIsOpen(false);

    if (notif.linkTab) {
      // Dispatch navigation event
      window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: notif.linkTab }));
      if (onNavigateTab) {
        onNavigateTab(notif.linkTab);
      }
    }
  };

  const markAllAsRead = async () => {
    if (unreadMessages && unreadMessages.length > 0) {
      for (const m of unreadMessages) {
        await db.messages.update(m.id, { isRead: true });
      }
      triggerSync();
    }
    // Dismiss all current notifications
    const allIds = notifications.map(n => n.id);
    setDismissedIds(prev => [...Array.from(new Set([...prev, ...allIds]))]);
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
        title="اعلان‌ها و نوتیفیکیشن‌ها"
      >
        <Bell className="w-4 h-4 text-slate-700 dark:text-slate-200" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">
            {totalCount > 99 ? '+99' : totalCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40 backdrop-blur-xs" 
            onClick={() => setIsOpen(false)} 
          />

          <div className="fixed top-14 left-2 right-2 sm:absolute sm:top-11 sm:left-0 sm:right-auto sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[500px] animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">مرکز اعلان‌ها</h3>
                <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {totalCount} جدید
                </span>
              </div>

              {totalCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  پاکسازی و رویت همه
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center">
                  <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2 opacity-50" />
                  هیچ اعلان جدیدی وجود ندارد.
                </div>
              ) : (
                notifications.map(item => {
                  let Icon = Bell;
                  let iconBg = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';

                  if (item.type === 'MESSAGE') {
                    Icon = Mail;
                    iconBg = 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300';
                  } else if (item.type === 'REFERRAL') {
                    Icon = AlertCircle;
                    iconBg = 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300';
                  } else if (item.type === 'APPROVAL') {
                    Icon = UserPlus;
                    iconBg = 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300';
                  } else if (item.type === 'TASK') {
                    Icon = CheckSquare;
                    iconBg = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300';
                  } else if (item.type === 'ASSESSMENT') {
                    Icon = FileText;
                    iconBg = 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300';
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all cursor-pointer flex items-start gap-3 shadow-2xs group relative"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{item.title}</h4>
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 shrink-0">
                            {new Date(item.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-tight">
                          {item.description}
                        </p>
                      </div>

                      {/* Item Actions: Mark Read / Dismiss */}
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => dismissNotification(item, e)}
                          title="رویت شد و حذف"
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
