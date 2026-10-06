const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentProgressChart.tsx', 'utf8');

code = code.replace(
  /entry\['raw_' \+ p\] = assessment\[p\];\n          \}/g,
  `}\n          entry['raw_' + p] = assessment[p];`
);

code = code.replace(
  /entry\['raw_' \+ t\] = assessment\[t\];\n          \}/g,
  `}\n          entry['raw_' + t] = assessment[t];`
);

fs.writeFileSync('src/components/student/StudentProgressChart.tsx', code);
