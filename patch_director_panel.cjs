const fs = require('fs');
let code = fs.readFileSync('src/components/DirectorPanel.tsx', 'utf8');

code = code.replace(
  /import \{ StudentMonitoringList \} from '\.\/StudentMonitoringList';/,
  `import { StudentMonitoringList } from './StudentMonitoringList';
import { MentorMonitoringList } from './vice-principal/MentorMonitoringList';
import { ReportsMonitoringList } from './vice-principal/ReportsMonitoringList';
import { UserCheck, Users, FileText } from 'lucide-react';`
);

code = code.replace(
  /export function DirectorPanel\(\) \{[\s\S]*?const tabs = \[/,
  `export function DirectorPanel() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STUDENTS' | 'PROFILE'>('DASHBOARD');
  const [activeSubTab, setActiveSubTab] = useState<'STUDENTS' | 'MENTORS' | 'REPORTS'>('STUDENTS');

  const tabs = [`
);

code = code.replace(
  /<div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 h-full">\n            <h3 className="font-bold text-slate-700 mb-6">رصد تربیتی و مشاوره‌ای طلاب<\/h3>\n            <StudentMonitoringList \/>\n          <\/div>/,
  `<div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 h-full">
            <div className="flex flex-col sm:flex-row gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveSubTab('STUDENTS')}
                className={\`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 \${activeSubTab === 'STUDENTS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}\`}
              >
                <UserCheck className="w-4 h-4" />
                رصد طلاب
              </button>
              <button 
                onClick={() => setActiveSubTab('MENTORS')}
                className={\`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 \${activeSubTab === 'MENTORS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}\`}
              >
                <Users className="w-4 h-4" />
                اساتید راهنما
              </button>
              <button 
                onClick={() => setActiveSubTab('REPORTS')}
                className={\`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 \${activeSubTab === 'REPORTS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}\`}
              >
                <FileText className="w-4 h-4" />
                گزارشات تجمیعی
              </button>
            </div>
            
            <div className="mt-4">
              {activeSubTab === 'STUDENTS' && <StudentMonitoringList />}
              {activeSubTab === 'MENTORS' && <MentorMonitoringList />}
              {activeSubTab === 'REPORTS' && <ReportsMonitoringList />}
            </div>
          </div>`
);

fs.writeFileSync('src/components/DirectorPanel.tsx', code);
