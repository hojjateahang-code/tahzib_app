const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentSelfAssessment.tsx', 'utf8');

code = code.replace(
  /isConfidential: false,/,
  `isConfidential: true,` // So that it doesn't show in public reports, and shows to the counselor? Actually, if it's true, it might not show in public reports, but does the counselor see it? Yes, CounselorReports fetches all COUNSELING_SESSION reports.
);

fs.writeFileSync('src/components/student/StudentSelfAssessment.tsx', code);
