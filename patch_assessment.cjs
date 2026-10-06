const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentSelfAssessment.tsx', 'utf8');

code = code.replace(
  /const updateField = async \(field: keyof Assessment, value: any\) => \{[\s\S]*?triggerSync\(\);\n  \};/m,
  `const updateField = async (field: keyof Assessment, value: any) => {
    if (isReadOnly) return alert('امکان تغییر اطلاعات روزهای گذشته وجود ندارد. (فقط امروز و دیروز قابل ویرایش هستند)');
    if (!assessment) return;
    await db.assessments.update(assessment.id, { [field]: value, synced: false } as any);
    triggerSync();
  };`
);

code = code.replace(
  /const updatePrayer = async \(prayer: string, status: PrayerStatus\) => \{[\s\S]*?triggerSync\(\);\n  \};/m,
  `const updatePrayer = async (prayer: string, status: PrayerStatus) => {
    if (isReadOnly) return alert('امکان تغییر اطلاعات روزهای گذشته وجود ندارد. (فقط امروز و دیروز قابل ویرایش هستند)');
    if (!assessment) return;
    await db.assessments.update(assessment.id, { [prayer]: status, synced: false } as any);
    triggerSync();
  };`
);

code = code.replace(
  /const updateCustomTask = async \(habitId: string, isCompleted: boolean\) => \{[\s\S]*?triggerSync\(\);\n  \};/m,
  `const updateCustomTask = async (habitId: string, isCompleted: boolean) => {
    if (isReadOnly) return alert('امکان تغییر اطلاعات روزهای گذشته وجود ندارد.');
    if (!assessment) return;
    const currentCustom = assessment.customTasks || {};
    await db.assessments.update(assessment.id, {
      customTasks: { ...currentCustom, [habitId]: isCompleted },
      synced: false
    });
    triggerSync();
  };`
);

code = code.replace(
  /const updateNote = async \(key: string, note: string\) => \{[\s\S]*?triggerSync\(\);\n  \};/m,
  `const updateNote = async (key: string, note: string) => {
    if (isReadOnly) return;
    if (!assessment) return;
    const currentNotes = assessment.notes || {};
    await db.assessments.update(assessment.id, {
      notes: { ...currentNotes, [key]: note },
      synced: false
    });
    triggerSync();
  };`
);

// We need to implement 3-state for Class Attendance and Mabahese.
code = code.replace(
  /const tasks = \['saharKhizi', 'telavatNoor', 'classAttendance', 'mabahese', 'earlySleep'\] as const;/g,
  `const tasks = ['saharKhizi', 'telavatNoor', 'earlySleep'] as const;`
);

fs.writeFileSync('src/components/student/StudentSelfAssessment.tsx', code);
