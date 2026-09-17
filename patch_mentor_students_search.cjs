const fs = require('fs');
let code = fs.readFileSync('src/components/mentor/MentorStudents.tsx', 'utf8');

code = code.replace(
  /const \[selectedStudentId, setSelectedStudentId\] = useState<string \| null>\(null\);/,
  `const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');`
);

code = code.replace(
  /const allUsers = useLiveQuery\(\(\) => db\.users\.toArray\(\)\);/,
  `const allUsers = useLiveQuery(() => db.users.toArray());
  
  const filteredStudents = React.useMemo(() => {
    if (!students) return [];
    if (!studentSearchQuery) return students;
    const q = studentSearchQuery.toLowerCase();
    return students.filter(s => 
      (s.name && s.name.toLowerCase().includes(q)) || 
      (s.nationalId && s.nationalId.includes(q))
    );
  }, [students, studentSearchQuery]);`
);

code = code.replace(
  /<div className="p-4 space-y-2 flex-1 overflow-y-auto">/,
  `<div className="px-4 pt-4 pb-2 border-b border-slate-100">
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی طلبه..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-emerald-500"
              value={studentSearchQuery}
              onChange={e => setStudentSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">`
);

code = code.replace(
  /\{students\?\.map\(student => \(/,
  `{filteredStudents?.map(student => (`
);

fs.writeFileSync('src/components/mentor/MentorStudents.tsx', code);
