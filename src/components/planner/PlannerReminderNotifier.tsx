import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, Check, Volume2 } from 'lucide-react';
import type { PlannerItem } from '../../types';
import { getShamsiInfo } from '../../utils/shamsiCalendar';

interface PlannerReminderNotifierProps {
  items: PlannerItem[];
  onDismissReminder: (item: PlannerItem) => void;
  onCompleteItem: (item: PlannerItem) => Promise<void>;
}

export function PlannerReminderNotifier({
  items,
  onDismissReminder,
  onCompleteItem
}: PlannerReminderNotifierProps) {
  const [activeAlerts, setActiveAlerts] = useState<{ item: PlannerItem; minutesLeft: number }[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  };

  // Play gentle bell sound using Web Audio API (no external file dependencies)
  const playGentleChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      // Harmonic chord frequencies (A4 -> C#5 -> E5)
      osc.frequency.setValueAtTime(554.37, audioCtx.currentTime); // C#5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch {
      // Audio not supported or blocked
    }
  };

  // Periodic reminder checking
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const currentTotalMin = currentH * 60 + currentM;
      const todayIso = now.toISOString().split('T')[0];
      const todayShamsi = getShamsiInfo(now);
      const currentDayOfWeek = todayShamsi.dayOfWeek;

      const triggeredAlerts: { item: PlannerItem; minutesLeft: number }[] = [];

      items.forEach(item => {
        if (item.isDeleted || item.isCompleted || item.reminderDismissed) return;
        if (item.reminderMinutes === undefined || item.reminderMinutes === -1) return;
        if (!item.startTime) return;

        // Check if item belongs to today
        const isToday = item.date === todayIso;
        const isRecurringToday = item.isRecurringWeekly && item.recurringDays && item.recurringDays.includes(currentDayOfWeek);

        if (!isToday && !isRecurringToday) return;

        // Parse start time
        const [h, m] = item.startTime.split(':').map(Number);
        const itemStartMin = (h || 0) * 60 + (m || 0);

        // Reminder threshold: from (itemStartMin - reminderMinutes) up to (itemStartMin + 15)
        const diff = itemStartMin - currentTotalMin;
        const reminderThreshold = item.reminderMinutes;

        if (diff <= reminderThreshold && diff >= -15) {
          triggeredAlerts.push({
            item,
            minutesLeft: Math.max(0, diff)
          });

          // Browser Notification if permitted and not yet notified
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const notifKey = `planner_notif_${item.id}_${todayIso}_${item.startTime}`;
            if (!sessionStorage.getItem(notifKey)) {
              sessionStorage.setItem(notifKey, 'true');
              try {
                new Notification(`🔔 یادآوری برنامه طلبه: ${item.title}`, {
                  body: diff > 0 
                    ? `${diff} دقیقه تا شروع برنامه (ساعت ${item.startTime})`
                    : `هم‌اکنون وقت ${item.title} است!`,
                  icon: '/favicon.ico'
                });
                playGentleChime();
              } catch {
                // ignore
              }
            }
          }
        }
      });

      setActiveAlerts(triggeredAlerts);
    };

    checkReminders();
    const interval = setInterval(checkReminders, 25000);
    return () => clearInterval(interval);
  }, [items]);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 space-y-2 pointer-events-auto" dir="rtl">
      {activeAlerts.map(({ item, minutesLeft }) => (
        <div
          key={item.id}
          className="bg-indigo-900/95 text-white p-4 rounded-3xl shadow-2xl border border-indigo-700/60 backdrop-blur-md flex flex-col gap-2 transition-all animate-in slide-in-from-bottom duration-300"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/30 text-indigo-200 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-300 block">
                  🔔 یادآوری موعد برنامه
                </span>
                <h4 className="text-xs sm:text-sm font-black text-white">
                  {item.title}
                </h4>
              </div>
            </div>

            <button
              onClick={() => onDismissReminder(item)}
              className="text-indigo-300 hover:text-white p-1 rounded-lg"
              title="بستن اعلان"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-indigo-200 pt-1 border-t border-indigo-800/80">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" />
              ساعت {item.startTime}
              {minutesLeft > 0 ? ` (${minutesLeft} دقیقه دیگر)` : ' (هم‌اکنون)'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onCompleteItem(item)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>انجام شد</span>
              </button>
              <button
                onClick={() => onDismissReminder(item)}
                className="px-2.5 py-1 rounded-lg bg-indigo-800/60 hover:bg-indigo-800 text-indigo-200 text-[11px]"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      ))}

      {notificationPermission === 'default' && (
        <div className="bg-slate-900/90 text-slate-200 text-[11px] p-2.5 rounded-2xl flex items-center justify-between gap-2 border border-slate-700">
          <span>برای دریافت آلارم هنگام بسته بودن تب، اعلان مرورگر را فعال کنید.</span>
          <button
            onClick={requestNotificationPermission}
            className="px-2 py-1 rounded-lg bg-indigo-600 text-white font-bold shrink-0 text-[10px]"
          >
            فعال‌سازی
          </button>
        </div>
      )}
    </div>
  );
}
