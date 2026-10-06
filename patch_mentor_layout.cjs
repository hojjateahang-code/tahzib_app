const fs = require('fs');
let code = fs.readFileSync('src/components/mentor/MentorStudents.tsx', 'utf8');

code = code.replace(
  /<div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-\[700px\]">/,
  `<div className="flex flex-col md:grid md:grid-cols-12 gap-6 md:h-[800px]">`
);

code = code.replace(
  /<div className="md:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">/,
  `<div className="md:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[400px] md:h-full">`
);

code = code.replace(
  /<div className="md:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">/,
  `<div className="md:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-auto min-h-[500px] md:h-full">`
);

// We should also replace the 5 days status with the StudentProgressChart
// Currently it is rendering recent 5 assessments.
code = code.replace(
  /import \{ Activity, FileText, Send, UserCheck \} from 'lucide-react';/,
  `import { Activity, FileText, Send, UserCheck, BarChart2 } from 'lucide-react';\nimport { StudentProgressChart } from '../student/StudentProgressChart';`
);

// Check if imports need fallback if they are different
if (!code.includes('import { StudentProgressChart }')) {
    code = code.replace(
        /import \{ triggerSync \} from '\.\.\/\.\.\/sync';/,
        `import { triggerSync } from '../../sync';\nimport { StudentProgressChart } from '../student/StudentProgressChart';`
    );
}

fs.writeFileSync('src/components/mentor/MentorStudents.tsx', code);
