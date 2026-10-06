const fs = require('fs');
let code = fs.readFileSync('src/components/StudentMonitoringList.tsx', 'utf8');

code = code.replace(
  /<p className="text-sm text-slate-600 whitespace-pre-wrap">\{report.content\}<\/p>/g,
  `<p className={\`text-sm whitespace-pre-wrap \${report.content.startsWith('تغییر وضعیت') ? 'text-indigo-700 font-bold bg-indigo-50 p-3 rounded-xl' : 'text-slate-600'}\`}>{report.content}</p>`
);

fs.writeFileSync('src/components/StudentMonitoringList.tsx', code);
