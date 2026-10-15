import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { triggerSync } from '../../sync';
import { safeUUID } from '../../lib/crypto';
import type { 
  PlannerItem, 
  PlannerGoal, 
  PlannerCategory, 
  PlannerItemStatus, 
  PlannerCustomCategory,
  PlannerCustomPreset,
  PlannerAcademicTerm
} from '../../types';
import { 
  Calendar, Clock, CalendarDays, CalendarRange, 
  Target, Repeat, Plus, Sparkles, CheckCircle2, Trash2 
} from 'lucide-react';

import { DailyTimelineView } from './DailyTimelineView';
import { WeeklyScheduleView } from './WeeklyScheduleView';
import { MonthlyCalendarView } from './MonthlyCalendarView';
import { YearlyPlanView, DEFAULT_SEMINARY_TERMS } from './YearlyPlanView';
import { FixedWeeklyRoutineView } from './FixedWeeklyRoutineView';
import { AddPlannerItemModal, SCHOOL_RECOMMENDED_PRESETS } from './AddPlannerItemModal';
import { PlannerReminderNotifier } from './PlannerReminderNotifier';
import { ClearPlannerModal, type ClearScope } from './ClearPlannerModal';
import { registerBackHandler } from '../../utils/navigationStack';

export function StudentPlannerView() {
  const { currentUser } = useAuth();
  
  // Navigation tabs for the planner
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ROUTINE'>('DAILY');
  
  // Active selected date (YYYY-MM-DD)
  const [currentDateStr, setCurrentDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGlobalClearModalOpen, setIsGlobalClearModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string>(currentDateStr);
  const [modalHour, setModalHour] = useState<number | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);

  // Wire back button to close planner modals
  useEffect(() => {
    if (isAddModalOpen) {
      return registerBackHandler(() => {
        setIsAddModalOpen(false);
        setEditingItem(null);
        return true;
      });
    }
  }, [isAddModalOpen]);

  useEffect(() => {
    if (isGlobalClearModalOpen) {
      return registerBackHandler(() => {
        setIsGlobalClearModalOpen(false);
        return true;
      });
    }
  }, [isGlobalClearModalOpen]);

  // Live Query for Planner Items of current student
  const plannerItems = useLiveQuery(
    async () => {
      if (!currentUser?.id) return [];
      const all = await db.plannerItems.toArray();
      return all.filter(item => item.studentId === currentUser.id && !item.isDeleted);
    },
    [currentUser?.id]
  ) || [];

  // Live Query for Yearly Goals of current student
  const plannerGoals = useLiveQuery(
    async () => {
      if (!currentUser?.id) return [];
      const all = await db.plannerGoals.toArray();
      return all.filter(goal => goal.studentId === currentUser.id && !goal.isDeleted);
    },
    [currentUser?.id]
  ) || [];

  // Live Query for Custom Categories
  const customCategories = useLiveQuery(
    async () => {
      if (!currentUser?.id) return [];
      const all = await db.plannerCustomCategories.toArray();
      return all.filter(cat => cat.studentId === currentUser.id && !cat.isDeleted);
    },
    [currentUser?.id]
  ) || [];

  // Live Query for Custom Presets (الگوهای آماده ذخیره‌شده توسط طلبه)
  const customPresets = useLiveQuery(
    async () => {
      if (!currentUser?.id) return [];
      const all = await db.plannerCustomPresets.toArray();
      return all.filter(p => p.studentId === currentUser.id && !p.isDeleted);
    },
    [currentUser?.id]
  ) || [];

  // Live Query for Academic Terms / Seasonal Calendar (نیمسال‌ها و تقویم فصلی)
  const academicTerms = useLiveQuery(
    async () => {
      if (!currentUser?.id) return [];
      const all = await db.plannerAcademicTerms.toArray();
      return all.filter(t => t.studentId === currentUser.id && !t.isDeleted);
    },
    [currentUser?.id]
  ) || [];

  // Save (Create or Update) Planner Item
  const handleSaveItem = async (data: Partial<PlannerItem>) => {
    if (!currentUser?.id) return;

    if (editingItem) {
      const updated: PlannerItem = {
        ...editingItem,
        ...data,
        updatedAt: Date.now(),
        synced: false
      };
      await db.plannerItems.put(updated);
    } else {
      const newItem: PlannerItem = {
        id: safeUUID(),
        studentId: currentUser.id,
        title: data.title || '',
        category: data.category || 'CLASS',
        customCategoryName: data.customCategoryName,
        priority: data.priority || 'NORMAL',
        date: data.date || currentDateStr,
        startTime: data.startTime,
        endTime: data.endTime,
        isAllDay: data.isAllDay,
        isRecurringWeekly: data.isRecurringWeekly,
        recurringDays: data.recurringDays,
        recurringWeeksCount: data.recurringWeeksCount,
        recurringStartDate: data.recurringStartDate,
        recurringEndDate: data.recurringEndDate,
        subjectName: data.subjectName,
        instructorName: data.instructorName,
        location: data.location,
        partnerName: data.partnerName,
        reminderMinutes: data.reminderMinutes,
        notes: data.notes,
        status: data.status || 'PENDING',
        statusReason: data.statusReason,
        isCompleted: data.status === 'DONE',
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        synced: false
      };
      await db.plannerItems.add(newItem);
    }

    triggerSync();
  };

  // Toggle item completed status
  const handleToggleComplete = async (item: PlannerItem) => {
    const isCompleted = !item.isCompleted;
    const newStatus: PlannerItemStatus = isCompleted ? 'DONE' : 'PENDING';
    await db.plannerItems.update(item.id, {
      isCompleted,
      status: newStatus,
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      updatedAt: Date.now(),
      synced: false
    });
    triggerSync();
  };

  // Update item status specifically (with optional per-date override for recurring items)
  const handleUpdateItemStatus = async (
    item: PlannerItem, 
    status: PlannerItemStatus, 
    reason?: string,
    targetDateStr?: string
  ) => {
    if (item.isRecurringWeekly && targetDateStr) {
      // Set dateStatusOverrides map
      const existingOverrides = item.dateStatusOverrides || {};
      const newOverrides = {
        ...existingOverrides,
        [targetDateStr]: {
          status,
          statusReason: reason,
          updatedAt: new Date().toISOString()
        }
      };

      await db.plannerItems.update(item.id, {
        dateStatusOverrides: newOverrides,
        updatedAt: Date.now(),
        synced: false
      });
    } else {
      await db.plannerItems.update(item.id, {
        status,
        statusReason: reason,
        isCompleted: status === 'DONE',
        completedAt: status === 'DONE' ? new Date().toISOString() : undefined,
        updatedAt: Date.now(),
        synced: false
      });
    }

    triggerSync();
  };

  // Add Custom Category
  const handleAddCustomCategory = async (name: string) => {
    if (!currentUser?.id || !name.trim()) return;
    const newCat: PlannerCustomCategory = {
      id: safeUUID(),
      studentId: currentUser.id,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      synced: false
    };
    await db.plannerCustomCategories.add(newCat);
    triggerSync();
  };

  // Add Custom Preset
  const handleAddCustomPreset = async (preset: Omit<PlannerCustomPreset, 'id' | 'studentId'>) => {
    if (!currentUser?.id) return;
    const newPreset: PlannerCustomPreset = {
      ...preset,
      id: safeUUID(),
      studentId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      synced: false
    };
    await db.plannerCustomPresets.add(newPreset);
    triggerSync();
  };

  // Delete Custom Preset
  const handleDeleteCustomPreset = async (id: string) => {
    await db.plannerCustomPresets.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      synced: false
    });
    triggerSync();
  };

  // Delete item (soft delete)
  const handleDeleteItem = async (id: string) => {
    await db.plannerItems.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      synced: false
    });
    triggerSync();
  };

  // Edit item opener
  const handleEditItem = (item: PlannerItem) => {
    setEditingItem(item);
    setModalDate(item.date);
    setIsAddModalOpen(true);
  };

  // Add Item opener
  const handleAddNewItem = (dateStr: string, hour?: number) => {
    setEditingItem(null);
    setModalDate(dateStr);
    setModalHour(hour);
    setIsAddModalOpen(true);
  };

  // Dismiss reminder
  const handleDismissReminder = (item: PlannerItem) => {
    db.plannerItems.update(item.id, {
      reminderDismissed: true
    });
  };

  // Add Goal
  const handleAddGoal = async (data: Partial<PlannerGoal>) => {
    if (!currentUser?.id) return;
    const newGoal: PlannerGoal = {
      id: safeUUID(),
      studentId: currentUser.id,
      title: data.title || '',
      category: data.category || 'STUDY',
      description: data.description,
      year: data.year || 1404,
      progressPercent: data.progressPercent || 0,
      isCompleted: Boolean(data.isCompleted),
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      synced: false
    };
    await db.plannerGoals.add(newGoal);
    triggerSync();
  };

  // Update Goal
  const handleUpdateGoal = async (goal: PlannerGoal) => {
    await db.plannerGoals.put({
      ...goal,
      updatedAt: Date.now(),
      synced: false
    });
    triggerSync();
  };

  // Delete Goal
  const handleDeleteGoal = async (id: string) => {
    await db.plannerGoals.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      synced: false
    });
    triggerSync();
  };

  // --- Handlers for Academic Terms & Seasonal Calendar ---
  const handleAddAcademicTerm = async (term: Partial<PlannerAcademicTerm>) => {
    if (!currentUser?.id) return;
    const newTerm: PlannerAcademicTerm = {
      id: safeUUID(),
      studentId: currentUser.id,
      year: term.year || 1404,
      name: term.name || 'دوره تحصیلی جدید',
      tag: term.tag,
      desc: term.desc,
      months: term.months || [],
      startDate: term.startDate,
      endDate: term.endDate,
      color: term.color || 'amber',
      keyEvents: term.keyEvents || [],
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      synced: false
    };
    await db.plannerAcademicTerms.add(newTerm);
    triggerSync();
  };

  const handleUpdateAcademicTerm = async (term: PlannerAcademicTerm) => {
    await db.plannerAcademicTerms.put({
      ...term,
      updatedAt: Date.now(),
      synced: false
    });
    triggerSync();
  };

  const handleDeleteAcademicTerm = async (id: string) => {
    await db.plannerAcademicTerms.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      synced: false
    });
    triggerSync();
  };

  const handleResetAcademicTerms = async (year: number) => {
    if (!currentUser?.id) return;
    // Mark any existing terms for this student as deleted
    const existing = await db.plannerAcademicTerms
      .filter(t => t.studentId === currentUser.id && (!t.year || t.year === year))
      .toArray();
    for (const item of existing) {
      await db.plannerAcademicTerms.delete(item.id);
    }
    // Seed the 4 standard seminary seasons
    for (const def of DEFAULT_SEMINARY_TERMS) {
      await db.plannerAcademicTerms.add({
        id: safeUUID(),
        studentId: currentUser.id,
        year,
        name: def.name,
        tag: def.tag,
        desc: def.desc,
        months: def.months,
        color: def.color,
        keyEvents: def.keyEvents,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        synced: false
      });
    }
    triggerSync();
  };

  // Load standard seminary curriculum routine (قالب پیشنهادی خود مدرسه)
  const handleLoadDefaultSeminaryRoutine = async () => {
    if (!currentUser?.id) return;

    // Add school recommended routine items for Saturday through Wednesday (10 weeks duration)
    const startDate = currentDateStr;
    const endD = new Date(startDate);
    endD.setDate(endD.getDate() + 70); // 10 weeks
    const endDate = endD.toISOString().split('T')[0];

    for (const preset of SCHOOL_RECOMMENDED_PRESETS) {
      await db.plannerItems.add({
        id: safeUUID(),
        studentId: currentUser.id,
        title: preset.title,
        category: preset.category,
        date: currentDateStr,
        startTime: preset.startTime,
        endTime: preset.endTime,
        isRecurringWeekly: true,
        recurringDays: [0, 1, 2, 3, 4], // شنبه تا چهارشنبه
        recurringWeeksCount: 10,
        recurringStartDate: startDate,
        recurringEndDate: endDate,
        subjectName: preset.subject,
        location: 'مدرسه علمیه',
        status: 'PENDING',
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        synced: false
      });
    }

    triggerSync();
  };

  // Clear planner items (پاکسازی برنامه‌ها)
  const handleClearAllItems = async (scope: ClearScope) => {
    if (!currentUser?.id) return;
    const all = await db.plannerItems.where('studentId').equals(currentUser.id).toArray();
    const active = all.filter(i => !i.isDeleted);
    
    let targetItems = active;
    if (scope === 'RECURRING_ONLY') {
      targetItems = active.filter(i => Boolean(i.isRecurringWeekly));
    } else if (scope === 'NON_RECURRING') {
      targetItems = active.filter(i => !i.isRecurringWeekly);
    }

    const now = Date.now();
    for (const item of targetItems) {
      await db.plannerItems.update(item.id, {
        isDeleted: true,
        updatedAt: now,
        synced: false
      });
    }
    triggerSync();
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Reminder Notification Banner Listener */}
      <PlannerReminderNotifier
        items={plannerItems}
        onDismissReminder={handleDismissReminder}
        onCompleteItem={handleToggleComplete}
      />

      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
                برنامه‌ریزی جامع و تقویم طلبه
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تقویم شمسی با رویدادهای مذهبی و ملی، نوار زمان ۲۴ ساعته روز، جدول کلاس‌های ثابت هفتگی (تا ۱۰ هفته)، ثبت وضعیت انجام و الگوهای آماده مدرسه
            </p>
          </div>

          {/* Quick Actions Button Group */}
          <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
            {plannerItems.length > 0 && (
              <button
                onClick={() => setIsGlobalClearModalOpen(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                title="پاکسازی برنامه‌های ثبت‌شده"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>پاکسازی برنامه‌ها</span>
              </button>
            )}

            <button
              onClick={() => handleAddNewItem(currentDateStr)}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت برنامه جدید</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (روزانه، هفتگی، ماهانه، سالانه، برنامه ثابت هفتگی) */}
        <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('DAILY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'DAILY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>نمایش روزانه (نوار ۲۴ ساعته)</span>
          </button>

          <button
            onClick={() => setActiveTab('WEEKLY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'WEEKLY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>نمایش هفتگی (شنبه تا جمعه)</span>
          </button>

          <button
            onClick={() => setActiveTab('MONTHLY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'MONTHLY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            <span>تقویم ماهانه (رویدادهای ملی و مذهبی)</span>
          </button>

          <button
            onClick={() => setActiveTab('ROUTINE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'ROUTINE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>برنامه ثابت هفتگی و کلاس‌ها</span>
          </button>

          <button
            onClick={() => setActiveTab('YEARLY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'YEARLY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>نقشه راه سالانه و اهداف طلبه</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'DAILY' && (
        <DailyTimelineView
          currentDateStr={currentDateStr}
          onDateChange={setCurrentDateStr}
          items={plannerItems}
          onToggleComplete={handleToggleComplete}
          onDeleteItem={handleDeleteItem}
          onEditItem={handleEditItem}
          onAddNewItem={handleAddNewItem}
          onUpdateItemStatus={handleUpdateItemStatus}
          customCategories={customCategories}
        />
      )}

      {activeTab === 'WEEKLY' && (
        <WeeklyScheduleView
          currentDateStr={currentDateStr}
          onDateChange={setCurrentDateStr}
          items={plannerItems}
          onToggleComplete={handleToggleComplete}
          onEditItem={handleEditItem}
          onAddNewItem={handleAddNewItem}
          onUpdateItemStatus={handleUpdateItemStatus}
        />
      )}

      {activeTab === 'MONTHLY' && (
        <MonthlyCalendarView
          currentDateStr={currentDateStr}
          onSelectDate={setCurrentDateStr}
          onNavigateToDay={(dStr) => {
            setCurrentDateStr(dStr);
            setActiveTab('DAILY');
          }}
          items={plannerItems}
          onAddNewItem={handleAddNewItem}
        />
      )}

      {activeTab === 'ROUTINE' && (
        <FixedWeeklyRoutineView
          items={plannerItems}
          onAddNewRecurring={() => {
            setEditingItem(null);
            setModalDate(currentDateStr);
            setIsAddModalOpen(true);
          }}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          onLoadDefaultSeminaryRoutine={handleLoadDefaultSeminaryRoutine}
          onClearAllItems={handleClearAllItems}
          onUpdateItemStatus={handleUpdateItemStatus}
        />
      )}

      {activeTab === 'YEARLY' && (
        <YearlyPlanView
          goals={plannerGoals}
          onAddGoal={handleAddGoal}
          onUpdateGoal={handleUpdateGoal}
          onDeleteGoal={handleDeleteGoal}
          academicTerms={academicTerms}
          onAddAcademicTerm={handleAddAcademicTerm}
          onUpdateAcademicTerm={handleUpdateAcademicTerm}
          onDeleteAcademicTerm={handleDeleteAcademicTerm}
          onResetAcademicTerms={handleResetAcademicTerms}
        />
      )}

      {/* Add / Edit Planner Item Modal */}
      <AddPlannerItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        initialDate={modalDate}
        initialHour={modalHour}
        editItem={editingItem}
        customCategories={customCategories}
        onAddCustomCategory={handleAddCustomCategory}
        customPresets={customPresets}
        onAddCustomPreset={handleAddCustomPreset}
        onDeleteCustomPreset={handleDeleteCustomPreset}
      />

      {/* Global Clear Planner Modal */}
      <ClearPlannerModal
        isOpen={isGlobalClearModalOpen}
        onClose={() => setIsGlobalClearModalOpen(false)}
        items={plannerItems}
        onConfirmClear={handleClearAllItems}
      />
    </div>
  );
}
