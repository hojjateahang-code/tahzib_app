const fs = require('fs');
let code = fs.readFileSync('src/components/counselor/CounselorReports.tsx', 'utf8');

code = code.replace(
  /<p className="text-xs text-slate-800 whitespace-pre-wrap">\{report.content\}<\/p>/g,
  `<p className={\`text-xs whitespace-pre-wrap \${report.content.startsWith('تغییر وضعیت') ? 'text-indigo-700 font-bold bg-indigo-50 p-2 rounded-lg' : 'text-slate-800'}\`}>{report.content}</p>`
);

code = code.replace(
  /<p className="text-sm text-slate-600 whitespace-pre-wrap">\{report.content\}<\/p>/g,
  `<p className={\`text-sm whitespace-pre-wrap \${report.content.startsWith('تغییر وضعیت') ? 'text-indigo-700 font-bold bg-indigo-50 p-3 rounded-xl' : 'text-slate-600'}\`}>{report.content}</p>`
);

fs.writeFileSync('src/components/counselor/CounselorReports.tsx', code);
