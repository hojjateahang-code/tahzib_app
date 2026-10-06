const fs = require('fs');
let code = fs.readFileSync('src/components/vice-principal/VicePrincipalDashboard.tsx', 'utf8');

code = code.replace(
  /import \{ StudentMonitoringList \} from '\.\.\/StudentMonitoringList';/,
  `import { StudentMonitoringList } from '../StudentMonitoringList';
import { MentorMonitoringList } from './MentorMonitoringList';
import { ReportsMonitoringList } from './ReportsMonitoringList';
import { UserCheck, Users, FileText } from 'lucide-react';`
);

code = code.replace(
  /export function VicePrincipalDashboard\(\) \{/,
  `export function VicePrincipalDashboard() {
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'MENTORS' | 'REPORTS'>('STUDENTS');`
);

// Needs React.useState now
code = code.replace(
  /import React from 'react';/,
  `import React, { useState } from 'react';`
);

code = code.replace(
  /<div className="md:col-span-12 bg-white rounded-3xl shadow-sm border border-slate-200 p-6">\n        <h3 className="font-bold text-slate-700 mb-6">رصد تربیتی و مشاوره‌ای طلاب<\/h3>\n        <StudentMonitoringList \/>\n      <\/div>/,
  `<div className="md:col-span-12 bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('STUDENTS')}
            className={\`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 \${activeTab === 'STUDENTS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}\`}
          >
            <UserCheck className="w-4 h-4" />
            رصد طلاب
          </button>
          <button 
            onClick={() => setActiveTab('MENTORS')}
            className={\`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 \${activeTab === 'MENTORS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}\`}
          >
            <Users className="w-4 h-4" />
            اساتید راهنما
          </button>
          <button 
            onClick={() => setActiveTab('REPORTS')}
            className={\`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 \${activeTab === 'REPORTS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}\`}
          >
            <FileText className="w-4 h-4" />
            گزارشات تجمیعی
          </button>
        </div>
        
        <div className="mt-4">
          {activeTab === 'STUDENTS' && <StudentMonitoringList />}
          {activeTab === 'MENTORS' && <MentorMonitoringList />}
          {activeTab === 'REPORTS' && <ReportsMonitoringList />}
        </div>
      </div>`
);

fs.writeFileSync('src/components/vice-principal/VicePrincipalDashboard.tsx', code);
