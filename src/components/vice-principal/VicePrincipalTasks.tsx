import React, { useState } from 'react';
import { db } from '../../db';
import { useAuth } from '../../store';
import { useLiveQuery } from 'dexie-react-hooks';
import { PlusCircle, Calendar as CalendarIcon, CheckSquare, ListTodo, Trash2, Edit } from 'lucide-react';
import { triggerSync } from '../../sync';
import { getTaskPeriodKey } from '../../utils/taskUtils';
import type { Role } from '../../types';

export function VicePrincipalTasks() {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTargetRole, setNewTaskTargetRole] = useState<Role | 'ALL'>('ALL');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');
  const [newTaskType, setNewTaskType] = useState<'ONETIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'EVENT'>('ONETIME');
  const [newChecklist, setNewChecklist] = useState<{ id: string, title: string, isCompleted: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const allTasks = useLiveQuery(() => db.tasks.toArray());
  const allUsers = useLiveQuery(() => db.users.where('role').notEqual('STUDENT').toArray());

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await db.tasks.add({
      id: crypto.randomUUID(),
      title: newTaskTitle,
      description: '',
      roleTarget: newTaskTargetRole,
      assignedTo: newTaskAssignedTo || undefined,
      type: newTaskType,
      date: new Date().toISOString(),
      isCompleted: false,
      checklist: newChecklist.length > 0 ? newChecklist : undefined,
    });
    setNewTaskTitle('');
    setNewChecklist([]);
    triggerSync();
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setNewChecklist([...newChecklist, { id: crypto.randomUUID(), title: newChecklistItem, isCompleted: false }]);
    setNewChecklistItem('');
  };

  const removeChecklistItem = (id: string) => {
    setNewChecklist(newChecklist.filter(item => item.id !== id));
  };

    const { currentUser } = useAuth(); // Need to ensure useAuth is imported if not

  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean, periodKey: string) => {
    if (!currentUser) return;
    const task = await db.tasks.get(taskId);
    if (!task) return;
    
    const userCompletions = task.userCompletions || {};
    const myCompletions = userCompletions[currentUser.id] || {};
    const myPeriodCompletion = myCompletions[periodKey] || { isCompleted: false, checklistCompleted: [] };
    
    myPeriodCompletion.isCompleted = !currentStatus;
    
    if (!currentStatus) {
      await db.reports.add({
        id: crypto.randomUUID(),
        authorId: currentUser.id,
        studentId: currentUser.id, // Target is self for task reports, or empty. We'll use authorId.
        type: 'GENERAL',
        date: new Date().toISOString(),
        content: `انجام وظیفه/برنامه: ${task.title} (${periodKey})`,
        isConfidential: false,
        synced: false
      });
    }
    
    myCompletions[periodKey] = myPeriodCompletion;
    userCompletions[currentUser.id] = myCompletions;
    
    await db.tasks.update(taskId, { userCompletions });
    triggerSync();
  };

  const toggleChecklistItem = async (taskId: string, checklistItemId: string, periodKey: string) => {
    if (!currentUser) return;
    const task = await db.tasks.get(taskId);
    if (!task || !task.checklist) return;
    
    const userCompletions = task.userCompletions || {};
    const myCompletions = userCompletions[currentUser.id] || {};
    const myPeriodCompletion = myCompletions[periodKey] || { isCompleted: false, checklistCompleted: [] };
    
    if (myPeriodCompletion.checklistCompleted.includes(checklistItemId)) {
      myPeriodCompletion.checklistCompleted = myPeriodCompletion.checklistCompleted.filter(id => id !== checklistItemId);
    } else {
      myPeriodCompletion.checklistCompleted = [...myPeriodCompletion.checklistCompleted, checklistItemId];
    }
    
    myCompletions[periodKey] = myPeriodCompletion;
    userCompletions[currentUser.id] = myCompletions;
    
    await db.tasks.update(taskId, { userCompletions });
    triggerSync();
  };



  const deleteTask = async (taskId: string) => {
    if (confirm('آیا از حذف این وظیفه اطمینان دارید؟')) {
      await db.tasks.delete(taskId);
      triggerSync();
    }
  };

  const eligibleUsers = allUsers?.filter(u => newTaskTargetRole === 'ALL' || u.role === newTaskTargetRole) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Task Creation Form */}
      <div className="md:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col h-fit">
        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-emerald-600" />
          ثبت عملیات جدید
        </h3>
        <form onSubmit={handleAddTask} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">عنوان وظیفه/رویداد</label>
            <input
              type="text"
              placeholder="مثال: برگزاری هیأت هفتگی"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">نوع</label>
              <select
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={newTaskType}
                onChange={e => setNewTaskType(e.target.value as any)}
              >
                <option value="ONETIME">موردی</option>
                <option value="DAILY">روزانه</option>
                <option value="WEEKLY">هفتگی</option>
                <option value="MONTHLY">ماهانه</option>
                <option value="EVENT">رویداد</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">مخاطب وظیفه</label>
              <select
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={newTaskTargetRole}
                onChange={e => {
                  setNewTaskTargetRole(e.target.value as any);
                  setNewTaskAssignedTo('');
                }}
              >
                <option value="ALL">همه اعضا</option>
                <option value="MENTOR">اساتید راهنما</option>
                <option value="COUNSELOR">مشاوران</option>
                <option value="DIRECTOR">مدیر</option>
                <option value="VICE_PRINCIPAL">معاون تهذیب</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">شخص خاص (اختیاری)</label>
            <select
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={newTaskAssignedTo}
              onChange={e => setNewTaskAssignedTo(e.target.value)}
            >
              <option value="">همه افراد در این نقش</option>
              {eligibleUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
              <ListTodo className="w-4 h-4 text-emerald-600" />
              چک‌لیست (اختیاری)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="مثال: هماهنگی سخنران"
                className="flex-1 border border-slate-200 rounded-xl p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                value={newChecklistItem}
                onChange={e => setNewChecklistItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="bg-emerald-100 text-emerald-700 p-2 rounded-xl hover:bg-emerald-200"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-1">
              {newChecklist.map(item => (
                <li key={item.id} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span>{item.title}</span>
                  <button type="button" onClick={() => removeChecklistItem(item.id)} className="text-rose-500 hover:text-rose-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="submit"
            className="w-full bg-[#8B1832] text-white py-3 rounded-xl font-medium hover:bg-rose-900 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <PlusCircle className="w-5 h-5" />
            ثبت وظیفه
          </button>
        </form>
      </div>

      {/* Task List */}
      <div className="md:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-emerald-600" />
          وظایف و رویدادهای در جریان
        </h3>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {allTasks?.length === 0 && (
            <div className="text-center text-slate-500 py-10">هیچ وظیفه‌ای ثبت نشده است.</div>
          )}
          {allTasks?.map(task => {
                const periodKey = getTaskPeriodKey(task.type);
                const userCompletions = task.userCompletions?.[currentUser?.id || '']?.[periodKey];
                const isCompleted = userCompletions?.isCompleted || false;
                const completedChecklist = userCompletions?.checklistCompleted || [];
                
                return (
            <div key={task.id} className={`p-4 rounded-2xl border transition-all ${isCompleted ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-emerald-100 shadow-sm'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <button 
                      onClick={() => toggleTaskCompletion(task.id, isCompleted, periodKey)}
                      className={`w-5 h-5 rounded flex items-center justify-center border ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500'}`}
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <h4 className={`font-bold text-sm ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>{task.title}</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {task.type === 'ONETIME' ? 'موردی' : task.type === 'DAILY' ? 'روزانه' : task.type === 'WEEKLY' ? 'هفتگی' : task.type === 'MONTHLY' ? 'ماهانه' : 'رویداد'}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-slate-500 mr-7 mt-1">
                    <span>مخاطب: {task.roleTarget} {task.assignedTo ? `(اختصاصی)` : ''}</span>
                    <span>تاریخ: {new Date(task.date).toLocaleDateString('fa-IR')}</span>
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id)} className="text-rose-400 hover:text-rose-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {task.checklist && task.checklist.length > 0 && (
                <div className="mt-3 mr-7 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <h5 className="text-[11px] font-bold text-slate-600 mb-2">چک‌لیست پیگیری:</h5>
                  <ul className="space-y-2">
                    {task.checklist.map(item => (
                      <li key={item.id} className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleChecklistItem(task.id, item.id, periodKey)}
                          className={`w-4 h-4 rounded-full flex items-center justify-center border ${completedChecklist.includes(item.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500'}`}
                        >
                          <CheckSquare className="w-3 h-3" />
                        </button>
                        <span className={`text-xs ${completedChecklist.includes(item.id) ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
