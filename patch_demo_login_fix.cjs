const fs = require('fs');
let code = fs.readFileSync('src/components/Login.tsx', 'utf8');

code = code.replace(
  /<button type="button" onClick=\{\(\) => loginAsDemo\('student3'\)\} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl font-bold transition-colors border border-emerald-200">طلبه ۳ \(پایه ۳\)<\/button>/,
  ``
);

fs.writeFileSync('src/components/Login.tsx', code);
