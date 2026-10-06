const fs = require('fs');
let code = fs.readFileSync('src/components/mentor/MentorStudents.tsx', 'utf8');

code = code.replace(
  /const \[reportContent, setReportContent\] = useState\(''\);/,
  `const [reportContent, setReportContent] = useState('');
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralReason, setReferralReason] = useState('');`
);

code = code.replace(
  /const handleRequestConsult = async \(\) => \{[\s\S]*?\}\n  \};/,
  `const handleRequestConsult = async () => {
    if (!selectedStudentId || !currentUser) return;
    const student = students?.find(s => s.id === selectedStudentId);
    if (!student) return;
    
    let currentTags = student.counselorTags || [];
    if (!currentTags.includes('CONSULT_NEEDED')) {
      setShowReferralModal(true);
    } else {
      alert('این طلبه پیش از این به مشاوره ارجاع داده شده است.');
    }
  };

  const submitReferral = async () => {
    if (!selectedStudentId || !currentUser || !referralReason.trim()) return;
    
    const student = students?.find(s => s.id === selectedStudentId);
    if (!student) return;
    
    let currentTags = student.counselorTags || [];
    currentTags = [...currentTags, 'CONSULT_NEEDED'];
    await db.users.update(selectedStudentId, { counselorTags: currentTags });
    
    // Add report for counselor
    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      studentId: selectedStudentId,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: \`ارجاع به مشاور توسط استاد راهنما (\${currentUser.name}). علت ارجاع: \${referralReason}\`,
      isConfidential: true,
      synced: false
    });
    
    alert('درخواست ارجاع به مشاوره ثبت شد و پیام به مشاور ارسال گردید.');
    setShowReferralModal(false);
    setReferralReason('');
    triggerSync();
  };`
);

code = code.replace(
  /        <\/div>\n      \)\}\n    <\/div>\n  \);\n\}/,
  `        </div>
      )}
      
      {showReferralModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">ارجاع به مشاوره</h3>
            <p className="text-sm text-slate-600 mb-4">لطفاً علت ارجاع این طلبه به مشاوره را مرقوم بفرمایید. این پیام تنها برای مشاور قابل مشاهده خواهد بود.</p>
            <textarea
              className="w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-32 mb-4 bg-slate-50"
              placeholder="علت ارجاع..."
              value={referralReason}
              onChange={(e) => setReferralReason(e.target.value)}
            ></textarea>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowReferralModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                انصراف
              </button>
              <button 
                onClick={submitReferral}
                disabled={!referralReason.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                ارسال به مشاور
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`
);

fs.writeFileSync('src/components/mentor/MentorStudents.tsx', code);
