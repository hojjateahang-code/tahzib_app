const fs = require('fs');
let code = fs.readFileSync('src/components/counselor/CounselorStudents.tsx', 'utf8');

code = code.replace(
  /const students = useLiveQuery\(\(\) => db\.users\.where\(\{ role: 'STUDENT' \}\)\.toArray\(\)\);/,
  `const students = useLiveQuery(() => db.users.where('role').equals('STUDENT').toArray());`
);

fs.writeFileSync('src/components/counselor/CounselorStudents.tsx', code);
