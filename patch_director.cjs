const fs = require('fs');
let code = fs.readFileSync('src/components/director/DirectorDashboard.tsx', 'utf8');

code = code.replace(
  /const crisisSessions = reports.filter\(r => r.type === 'COUNSELING_SESSION'\).length;[\s\S]*?const totalPart = students.length > 0 \? \(new Set\(assessments.map\(a => a.studentId\)\).size \/ students.length\) \* 100 : 0;/,
  `const crisisSessions = reports.filter(r => r.type === 'COUNSELING_SESSION').length;
    const mentorReferrals = reports.filter(r => r.type === 'MENTOR_EVAL' || (r.type === 'COUNSELING_SESSION' && r.content.includes('ارجاع'))).length;
    const confidentialNotes = reports.filter(r => r.isConfidential).length;
    const totalPart = students.length > 0 ? (new Set(assessments.map(a => a.studentId)).size / students.length) * 100 : 0;`
);

code = code.replace(
  /return \{\n      participation: Math.round\(totalPart\),\n      crisisSessions,/,
  `return {
      participation: Math.round(totalPart),
      crisisSessions,
      mentorReferrals,
      confidentialNotes,`
);

code = code.replace(
  /\{ label: 'ارجاع به اساتید راهنما', value: '۱۸', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-100' \},\n          \{ label: 'یادداشت‌های محرمانه \(کل\)', value: '۱۴۲', icon: PieChart, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-100' \}/,
  `{ label: 'ارجاعات و بررسی راهنما', value: stats.mentorReferrals, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-100' },
          { label: 'یادداشت‌های محرمانه (کل)', value: stats.confidentialNotes, icon: PieChart, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-100' }`
);

fs.writeFileSync('src/components/director/DirectorDashboard.tsx', code);
