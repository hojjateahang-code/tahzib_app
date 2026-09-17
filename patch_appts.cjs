const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentSelfAssessment.tsx', 'utf8');

code = code.replace(
  /<div className="flex gap-2 w-full sm:w-auto">[\s\S]*?<\/div>\n                    <\/div>\n                  <\/div>/g,
  `<div className="flex gap-2 w-full sm:w-auto">
                        {appt.status === 'SCHEDULED' || appt.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleUpdateApptStatus(appt.id, 'ATTENDED')}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-colors border bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            >
                              حضور داشتم
                            </button>
                            <button
                              onClick={() => handleUpdateApptStatus(appt.id, 'MISSED')}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-colors border bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              عدم حضور
                            </button>
                          </>
                        ) : (
                          <div className={\`px-4 py-2 rounded-xl text-xs font-bold border \${appt.status === 'ATTENDED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}\`}>
                            {appt.status === 'ATTENDED' ? 'حضور ثبت شد (بایگانی)' : 'عدم حضور ثبت شد (بایگانی)'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>`
);

fs.writeFileSync('src/components/student/StudentSelfAssessment.tsx', code);
