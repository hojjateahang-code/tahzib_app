const fs = require('fs');
let code = fs.readFileSync('src/components/mentor/MentorDashboard.tsx', 'utf8');

const updatedFunctions = `  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean, periodKey: string) => {
    if (!currentUser) return;
    const task = await db.tasks.get(taskId);
    if (!task) return;
    
    const userCompletions = task.userCompletions || {};
    const myCompletions = userCompletions[currentUser.id] || {};
    const myPeriodCompletion = myCompletions[periodKey] || { isCompleted: false, checklistCompleted: [] };
    
    myPeriodCompletion.isCompleted = !currentStatus;
    
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
  };`;

code = code.replace(
  /const toggleTaskCompletion = async \([\s\S]*?triggerSync\(\);\n  \};/,
  updatedFunctions
);

code = code.replace(/myTasks\?\.map\(task => \(/, `myTasks?.map(task => {
          const periodKey = getTaskPeriodKey(task.type);
          const userCompletions = task.userCompletions?.[currentUser?.id || '']?.[periodKey];
          const isCompleted = userCompletions?.isCompleted || false;
          const completedChecklist = userCompletions?.checklistCompleted || [];
          
          return (`);

code = code.replace(/task\.isCompleted/g, `isCompleted`);
code = code.replace(/toggleTaskCompletion\(task\.id, isCompleted\)/, `toggleTaskCompletion(task.id, isCompleted, periodKey)`);
code = code.replace(/item\.isCompleted/g, `completedChecklist.includes(item.id)`);
code = code.replace(/toggleChecklistItem\(task\.id, item\.id\)/, `toggleChecklistItem(task.id, item.id, periodKey)`);
code = code.replace(/          <\/div>\n        \)\)/, `          </div>\n        )})`);

fs.writeFileSync('src/components/mentor/MentorDashboard.tsx', code);
