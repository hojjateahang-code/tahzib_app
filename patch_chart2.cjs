const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentProgressChart.tsx', 'utf8');

code = code.replace(
  /prayers\.forEach\(p => \{[\s\S]*?\}\);/,
  `prayers.forEach(p => {
          pTotal++;
          if (assessment[p] && assessment[p] !== 'TARK' && assessment[p] !== 'NONE') { 
            pCompleted++;
            entry[p] = 100;
          }
          entry['raw_' + p] = assessment[p];
        });`
);

code = code.replace(
  /tasks\.forEach\(t => \{[\s\S]*?\}\);/,
  `tasks.forEach(t => {
          tTotal++;
          if (assessment[t]) {
            tCompleted++;
            entry[t] = 100;
          }
          entry['raw_' + t] = assessment[t];
        });`
);

fs.writeFileSync('src/components/student/StudentProgressChart.tsx', code);
