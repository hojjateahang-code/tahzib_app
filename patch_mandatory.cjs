const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentSelfAssessment.tsx', 'utf8');

code = code.replace(
  /className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none focus:border-blue-500"/g,
  `className={\`flex-1 bg-white border \${task.type === 'select' && ((assessment as any)[task.id] === 'PARTIAL' || (assessment as any)[task.id] === 'NONE') && !(assessment.notes?.[task.id]?.trim()) ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-400' : 'border-slate-200 focus:border-blue-500'} rounded-xl p-2 text-xs outline-none\`}`
);

fs.writeFileSync('src/components/student/StudentSelfAssessment.tsx', code);
