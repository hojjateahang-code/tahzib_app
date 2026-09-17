const fs = require('fs');
let code = fs.readFileSync('src/components/mentor/MentorStudents.tsx', 'utf8');

code = code.replace(
  /<div className="p-6 space-y-6 flex-1 flex flex-col">/,
  `<div className="p-6 space-y-6 flex-1 flex flex-col overflow-y-auto">`
);

fs.writeFileSync('src/components/mentor/MentorStudents.tsx', code);
