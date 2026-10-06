const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  /type: 'MENTOR_EVAL' \| 'COUNSELING_SESSION';/,
  `type: 'MENTOR_EVAL' | 'COUNSELING_SESSION' | 'TASK_COMPLETION' | 'GENERAL';`
);

fs.writeFileSync('src/types.ts', code);
