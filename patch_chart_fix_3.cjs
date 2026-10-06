const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentProgressChart.tsx', 'utf8');

code = code.replace(
  /\} \{(?=\s*const \{ currentUser \} = useAuth\(\);)/,
  `\n      </div>\n    );\n  }\n  return null;\n};\n\n`
);

fs.writeFileSync('src/components/student/StudentProgressChart.tsx', code);
