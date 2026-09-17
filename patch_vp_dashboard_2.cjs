const fs = require('fs');
let code = fs.readFileSync('src/components/vice-principal/VicePrincipalTasks.tsx', 'utf8');

code = code.replace(
  /  const toggleChecklistItem = async \(taskId: string, checklistItemId: string\) => \{[\s\S]*?triggerSync\(\);\n  \};/,
  ''
);

fs.writeFileSync('src/components/vice-principal/VicePrincipalTasks.tsx', code);
