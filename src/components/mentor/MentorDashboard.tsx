import React from 'react';
import { useAuth } from '../../store';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckSquare, ListTodo } from 'lucide-react';
import { triggerSync } from '../../sync';
import { getTaskPeriodKey } from '../../utils/taskUtils';
import { StudentEscalationAlerts } from '../supervisor/StudentEscalationAlerts';

export function MentorDashboard() {
  const { currentUser } = useAuth();
  
  const myTasks = useLiveQuery(
    () => {
      if (!currentUser) return [];
      return db.tasks
        .filter(task => 
          task.roleTarget === 'MENTOR' || 
          task.roleTarget === 'ALL' || 
          (task.assignedTo === currentUser.id)
        )
        .reverse()
        .sortBy('date');
    },
    [currentUser]
  );

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



  return (
    <div className="space-y-6">
      <StudentEscalationAlerts />

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
      <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
        <CheckSquare className="w-5 h-5 text-emerald-600" />
        کارتابل وظایف و برنامه‌ها
      </h3>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {(!myTasks || myTasks.length === 0) && (
          <div className="text-center text-slate-500 py-10">هیچ وظیفه‌ای برای شما ثبت نشده است.</div>
        )}
        {myTasks?.map(task => {
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
                  <span>تاریخ: {new Date(task.date).toLocaleDateString('fa-IR')}</span>
                </div>
              </div>
            </div>

            {task.checklist && task.checklist.length > 0 && (
              <div className="mt-3 mr-7 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <h5 className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                  <ListTodo className="w-3 h-3" />
                  چک‌لیست پیگیری:
                </h5>
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
