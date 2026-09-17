const fs = require('fs');
let code = fs.readFileSync('src/components/counselor/CounselorReports.tsx', 'utf8');

code = code.replace(
  /const reports = useLiveQuery\([\s\S]*?\[currentUser\]\n  \);/,
  `const allReports = useLiveQuery(
    () => db.reports.where('type').equals('COUNSELING_SESSION').reverse().sortBy('date'),
    []
  );
  const reports = allReports?.filter(r => r.authorId === currentUser?.id) || [];
  const referralReports = allReports?.filter(r => r.authorId !== currentUser?.id) || [];
  
  const allUsers = useLiveQuery(() => db.users.toArray());`
);

code = code.replace(
  /<div className="mt-8 opacity-40">[\s\S]*?<\/div>/,
  `<div className="mt-6 flex-1 flex flex-col overflow-hidden">
          <h4 className="font-bold text-slate-700 mb-3 text-sm">دلایل ارجاع و پیام‌ها</h4>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {referralReports.length === 0 ? (
               <p className="text-center text-slate-400 text-xs py-4">پیام جدیدی وجود ندارد.</p>
            ) : (
               referralReports.map(report => {
                 const student = students?.find(s => s.id === report.studentId);
                 const author = allUsers?.find(u => u.id === report.authorId);
                 const roleName = author?.role === 'STUDENT' ? 'طلبه' : (author?.role === 'MENTOR' ? 'استاد راهنما' : 'کادر');
                 return (
                   <div key={report.id} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                     <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-slate-700">{student?.name}</span>
                       <span className="text-[10px] text-slate-500">{new Date(report.date).toLocaleDateString('fa-IR')}</span>
                     </div>
                     <p className="text-[10px] text-slate-500 mb-1">از طرف: {author?.name || 'سیستم'} ({roleName})</p>
                     <p className="text-xs text-slate-800 whitespace-pre-wrap">{report.content}</p>
                   </div>
                 );
               })
            )}
          </div>
        </div>`
);

fs.writeFileSync('src/components/counselor/CounselorReports.tsx', code);
