const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentProgressChart.tsx', 'utf8');

code = code.replace(
  /        \)\n      <\/div>/,
  `        )}\n      </div>`
);

fs.writeFileSync('src/components/student/StudentProgressChart.tsx', code);
