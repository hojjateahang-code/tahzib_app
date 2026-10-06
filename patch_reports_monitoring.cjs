const fs = require('fs');
let code = fs.readFileSync('src/components/vice-principal/ReportsMonitoringList.tsx', 'utf8');

code = code.replace(
  /<div className="flex flex-col h-\[600px\] bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden p-6">/,
  `<div className="flex flex-col md:h-[600px] min-h-[500px] bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden p-6">`
);

fs.writeFileSync('src/components/vice-principal/ReportsMonitoringList.tsx', code);
