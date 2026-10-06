const fs = require('fs');

function addLoggingToToggle(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');

  // We find toggleTaskCompletion
  const replacement = `myPeriodCompletion.isCompleted = !currentStatus;
    
    if (!currentStatus) {
      await db.reports.add({
        id: crypto.randomUUID(),
        authorId: currentUser.id,
        studentId: currentUser.id, // Target is self for task reports, or empty. We'll use authorId.
        type: 'GENERAL',
        date: new Date().toISOString(),
        content: \`انجام وظیفه/برنامه: \${task.title} (\${periodKey})\`,
        isConfidential: false,
        synced: false
      });
    }`;

  code = code.replace(/myPeriodCompletion\.isCompleted = !currentStatus;/, replacement);
  fs.writeFileSync(file, code);
}

addLoggingToToggle('src/components/mentor/MentorDashboard.tsx');
addLoggingToToggle('src/components/vice-principal/VicePrincipalTasks.tsx');

// The director and counselor might not have task dashboards, let's check
