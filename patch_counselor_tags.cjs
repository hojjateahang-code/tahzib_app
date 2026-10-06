const fs = require('fs');
let code = fs.readFileSync('src/components/counselor/CounselorStudents.tsx', 'utf8');

code = code.replace(
  /  const toggleTag = async \(studentId: string, tagId: string\) => \{[\s\S]*?triggerSync\(\);\n  \};/,
  `  const toggleTag = async (studentId: string, tagId: string) => {
    const student = students?.find(s => s.id === studentId);
    if (!student) return;

    let currentTags = student.counselorTags || [];
    const tagInfo = AVAILABLE_TAGS.find(t => t.id === tagId);
    let action = '';

    if (currentTags.includes(tagId)) {
      currentTags = currentTags.filter(t => t !== tagId);
      action = 'حذف شد';
    } else {
      currentTags = [...currentTags, tagId];
      action = 'اضافه شد';
    }

    await db.users.update(studentId, { counselorTags: currentTags });

    if (tagInfo) {
      await db.reports.add({
        id: crypto.randomUUID(),
        authorId: currentUser?.id || 'system',
        studentId: studentId,
        type: 'COUNSELING_SESSION',
        date: new Date().toISOString(),
        content: \`تغییر وضعیت: برچسب "\${tagInfo.label}" \${action} ➔\`,
        isConfidential: true,
        synced: false
      });
    }

    triggerSync();
  };`
);

fs.writeFileSync('src/components/counselor/CounselorStudents.tsx', code);
