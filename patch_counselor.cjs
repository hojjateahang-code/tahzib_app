const fs = require('fs');
let code = fs.readFileSync('src/components/counselor/CounselorStudents.tsx', 'utf8');

code = code.replace(
  /const handleToggleTag = async \(tag: string\) => \{[\s\S]*?triggerSync\(\);\n  \};/,
  `const handleToggleTag = async (tag: string) => {
    if (!selectedStudentId || !currentUser) return;
    const student = students?.find(s => s.id === selectedStudentId);
    if (!student) return;
    
    let currentTags = student.counselorTags || [];
    const isAdding = !currentTags.includes(tag);
    
    if (isAdding) {
      currentTags = [...currentTags, tag];
    } else {
      currentTags = currentTags.filter(t => t !== tag);
    }
    
    const tagName = AVAILABLE_TAGS.find(t => t.id === tag)?.label || tag;
    
    await db.users.update(selectedStudentId, { counselorTags: currentTags });
    
    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      studentId: selectedStudentId,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: \`تغییر وضعیت: \${isAdding ? 'اضافه شدن' : 'حذف'} برچسب ⟸ \${tagName}\`,
      isConfidential: false,
      synced: false
    });
    
    triggerSync();
  };`
);

code = code.replace(
  /const \[reportContent, setReportContent\] = useState\(''\);/,
  `const [reportContent, setReportContent] = useState('');
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
  /<div className="space-y-3 max-h-\[300px\] overflow-y-auto pr-2">/,
  `<div className="mb-3 relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="جستجو در سوابق..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-9 pl-3 text-xs outline-none focus:border-emerald-500"
                    value={reportSearch}
                    onChange={e => setReportSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">`
);

code = code.replace(
  /\{studentReports\?\.map\(report => \(/,
  `{filteredReports?.map(report => (`
);

code = code.replace(
  /<p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">\{report.content\}<\/p>/,
  `<p className={\`text-xs mt-1 whitespace-pre-wrap \${report.content.startsWith('تغییر وضعیت') ? 'text-indigo-700 font-bold bg-indigo-50 p-2 rounded-lg' : 'text-slate-600'}\`}>{report.content}</p>`
);

fs.writeFileSync('src/components/counselor/CounselorStudents.tsx', code);
