const fs = require('fs');
let code = fs.readFileSync('src/components/mentor/MentorStudents.tsx', 'utf8');

code = code.replace(
  /const \[referralReason, setReferralReason\] = useState\(''\);/,
  `const [referralReason, setReferralReason] = useState('');
  const [reportSearch, setReportSearch] = useState('');`
);

code = code.replace(
  /const studentReports = useLiveQuery\([\s\S]*?\[selectedStudentId\]\n  \);/,
  `const studentReports = useLiveQuery(
    () => selectedStudentId ? db.reports.where({ studentId: selectedStudentId }).reverse().sortBy('date') : Promise.resolve([]),
    [selectedStudentId]
  );
  
  const filteredReports = React.useMemo(() => {
    if (!studentReports) return [];
    if (!reportSearch) return studentReports;
    return studentReports.filter(r => r.content.includes(reportSearch));
  }, [studentReports, reportSearch]);`
);

code = code.replace(
  /<div className="space-y-3 max-h-\[200px\] overflow-y-auto pr-2">/,
  `<div className="mb-3 relative">
                  <Activity className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="جستجو در گزارش‌ها..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-9 pl-3 text-xs outline-none focus:border-emerald-500"
                    value={reportSearch}
                    onChange={e => setReportSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">`
);

code = code.replace(
  /\{studentReports\?\.map\(report => \(/,
  `{filteredReports?.map(report => (`
);

code = code.replace(
  /<p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">\{report.content\}<\/p>/,
  `<p className={\`text-xs mt-1 whitespace-pre-wrap \${report.content.startsWith('تغییر وضعیت') ? 'text-indigo-700 font-bold bg-indigo-50 p-2 rounded-lg' : 'text-slate-600'}\`}>{report.content}</p>`
);

fs.writeFileSync('src/components/mentor/MentorStudents.tsx', code);
