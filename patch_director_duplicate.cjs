const fs = require('fs');
let code = fs.readFileSync('src/components/director/DirectorDashboard.tsx', 'utf8');

code = code.replace(
  /mentorReferrals,\n      confidentialNotes,\n      mentorReferrals,\n      confidentialNotes,/,
  `mentorReferrals,
      confidentialNotes,`
);

fs.writeFileSync('src/components/director/DirectorDashboard.tsx', code);
