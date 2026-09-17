const fs = require('fs');
let code = fs.readFileSync('src/components/StudentMonitoringList.tsx', 'utf8');

code = code.replace(
  /const students = useLiveQuery\(\(\) => db\.users\.where\(\{ role: 'STUDENT', isApproved: true \}\)\.toArray\(\)\);/,
  `const students = useLiveQuery(async () => {
    const users = await db.users.where('role').equals('STUDENT').toArray();
    return users.filter(u => u.isApproved);
  });`
);

fs.writeFileSync('src/components/StudentMonitoringList.tsx', code);
