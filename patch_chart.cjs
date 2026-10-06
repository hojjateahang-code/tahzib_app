const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentProgressChart.tsx', 'utf8');

code = code.replace(
  /export function StudentProgressChart\(\) \{/,
  `export function StudentProgressChart({ studentId }: { studentId?: string }) {`
);

code = code.replace(
  /const assessments = useLiveQuery\([\s\S]*?\[currentUser\]\n  \);/,
  `const assessments = useLiveQuery(
    () => {
      const targetId = studentId || currentUser?.id;
      return targetId ? db.assessments.where('studentId').equals(targetId).toArray() : [];
    },
    [currentUser, studentId]
  );`
);

fs.writeFileSync('src/components/student/StudentProgressChart.tsx', code);
