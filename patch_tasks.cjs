const fs = require('fs');

const fileNames = [
  'src/components/mentor/MentorDashboard.tsx',
  'src/components/vice-principal/VicePrincipalTasks.tsx',
  'src/components/director/DirectorDashboard.tsx',
  'src/components/counselor/CounselorTasks.tsx' // If exists
];

for (let file of fileNames) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    
    // Check if we need to add the import for getTaskPeriodKey
    if (!code.includes('getTaskPeriodKey')) {
      code = code.replace(
        /import \{ triggerSync \} from '\.\.\/\.\.\/sync';/,
        `import { triggerSync } from '../../sync';\nimport { getTaskPeriodKey } from '../../utils/taskUtils';`
      );
    }
    
    fs.writeFileSync(file, code);
  }
}
