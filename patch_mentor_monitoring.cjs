const fs = require('fs');
let code = fs.readFileSync('src/components/vice-principal/MentorMonitoringList.tsx', 'utf8');

code = code.replace(
  /<div className="flex flex-col md:flex-row gap-6 h-\[500px\]">/,
  `<div className="flex flex-col md:flex-row gap-6 md:h-[600px] min-h-[500px]">`
);

fs.writeFileSync('src/components/vice-principal/MentorMonitoringList.tsx', code);
