const fs = require('fs');
let code = fs.readFileSync('src/components/StudentMonitoringList.tsx', 'utf8');

code = code.replace(
  /const handleRequestConsult = async \(studentId: string\) => \{[\s\S]*?\}\n  \};/,
  `const handleRequestConsult = async (studentId: string) => {
    const student = students?.find(s => s.id === studentId);
    if (!student) return;
    
    let currentTags = student.counselorTags || [];
    if (!currentTags.includes('CONSULT_NEEDED')) {
      setReferringStudentId(studentId);
      setShowReferralModal(true);
    } else {
      alert('این طلبه پیش از این به مشاوره ارجاع داده شده است.');
    }
  };

  const submitReferral = async () => {
    if (!referringStudentId || !referralReason.trim()) return;
    const student = students?.find(s => s.id === referringStudentId);
    if (!student) return;
    
    let currentTags = student.counselorTags || [];
    currentTags = [...currentTags, 'CONSULT_NEEDED'];
    await db.users.update(referringStudentId, { counselorTags: currentTags });
    
    // Add report for counselor
    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: JSON.parse(localStorage.getItem('currentUser') || '{}').id || 'system',
      studentId: referringStudentId,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: \`ارجاع به مشاور. علت ارجاع: \${referralReason}\`,
      isConfidential: true,
      synced: false
    });
    
    setShowReferralModal(false);
    setReferralReason('');
    setReferringStudentId(null);
    alert('درخواست ارجاع به مشاوره با موفقیت ثبت شد.');
    triggerSync();
  };`
);

fs.writeFileSync('src/components/StudentMonitoringList.tsx', code);
