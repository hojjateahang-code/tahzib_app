const fs = require('fs');
let code = fs.readFileSync('src/components/mentor/MentorStudents.tsx', 'utf8');

code = code.replace(
  /return db\.users\.where\(\{ role: 'STUDENT', base: currentUser\.base \}\)\.toArray\(\);/,
  `return db.users.where('role').equals('STUDENT').filter(u => u.base === currentUser.base).toArray();`
);

code = code.replace(
  /return db\.users\.where\(\{ role: 'STUDENT' \}\)\.toArray\(\);/,
  `return db.users.where('role').equals('STUDENT').toArray();`
);

fs.writeFileSync('src/components/mentor/MentorStudents.tsx', code);
