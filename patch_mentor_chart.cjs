const fs = require('fs');
let code = fs.readFileSync('src/components/mentor/MentorStudents.tsx', 'utf8');

code = code.replace(
  /\{studentAssessments && studentAssessments\.length > 0 \? \([\s\S]*?هیچ گزارش خوداظهاری برای این طلبه یافت نشد\.\n\s*<\/div>\n\s*\)\}/,
  `{studentAssessments && studentAssessments.length > 0 ? (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-600" />
                  نمودار پیشرفت طلبه
                </h4>
                <div className="bg-white rounded-xl border border-slate-200 p-2 overflow-hidden min-h-[350px]">
                  <StudentProgressChart studentId={selectedStudentId} />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
                هیچ گزارش خوداظهاری برای این طلبه یافت نشد.
              </div>
            )}`
);

fs.writeFileSync('src/components/mentor/MentorStudents.tsx', code);
