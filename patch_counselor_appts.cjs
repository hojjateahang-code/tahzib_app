const fs = require('fs');
let code = fs.readFileSync('src/components/counselor/CounselorStudents.tsx', 'utf8');

code = code.replace(
  /const students = useLiveQuery\(\(\) => db.users.where\('role'\).equals\('STUDENT'\).toArray\(\)\);/,
  `const students = useLiveQuery(() => db.users.where('role').equals('STUDENT').toArray());
  const appointments = useLiveQuery(() => db.appointments.toArray());`
);

const appointmentDisplayCode = `              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2 items-center justify-end">
                  {AVAILABLE_TAGS.map(tag => {
                    const isActive = student.counselorTags?.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(student.id, tag.id)}
                        className={\`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 \${
                          isActive 
                            ? tag.color 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                        }\`}
                      >
                        {isActive && <Check className="w-3 h-3" />}
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex flex-col justify-end gap-2 mt-2">
                  {appointments?.filter(a => a.studentId === student.id && a.status === 'SCHEDULED').length > 0 && (
                    <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-xs text-amber-800 self-end w-full md:w-auto">
                      <strong className="block mb-1">وقت‌های در انتظار برگزاری:</strong>
                      <div className="flex flex-wrap gap-2">
                        {appointments.filter(a => a.studentId === student.id && a.status === 'SCHEDULED').map(a => (
                          <span key={a.id} className="bg-white px-2 py-1 rounded-lg border border-amber-100 shadow-sm font-medium">
                            {new Date(a.date).toLocaleDateString('fa-IR')} - ساعت {new Date(a.date).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="self-end">`;

code = code.replace(/              <div className="flex flex-col gap-3">\n                <div className="flex flex-wrap gap-2 items-center justify-end">\n                  \{AVAILABLE_TAGS.map\(tag => \{[\s\S]*?<\/div>\n                \n                <div className="flex justify-end">/, appointmentDisplayCode);

code = code.replace(/                    <\/button>\n                  \)\}\n                <\/div>/, `                    </button>\n                  )}\n                  </div>\n                </div>`);

fs.writeFileSync('src/components/counselor/CounselorStudents.tsx', code);
