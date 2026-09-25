import Dexie, { type Table } from 'dexie';
import type { User, Task, Assessment, PrivateNote, Report, PersonalHabit, Appointment, Message, CustomGroup, TahzibProgram, TahzibCategory } from './types';

export class SeminaryDB extends Dexie {
  users!: Table<User, string>;
  tasks!: Table<Task, string>;
  assessments!: Table<Assessment, string>;
  privateNotes!: Table<PrivateNote, string>;
  reports!: Table<Report, string>;
  personalHabits!: Table<PersonalHabit, string>;
  appointments!: Table<Appointment, string>;
  messages!: Table<Message, string>;
  customGroups!: Table<CustomGroup, string>;
  tahzibPrograms!: Table<TahzibProgram, string>;
  tahzibCategories!: Table<TahzibCategory, string>;

  constructor() {
    super('SeminaryDB');
    
    // Define schema
    this.version(1).stores({
      users: 'id, role',
      tasks: 'id, roleTarget, date, isCompleted',
      assessments: 'id, studentId, date, synced',
      privateNotes: 'id, studentId, date', // strictly local, never synced
      reports: 'id, authorId, studentId, type, date, synced'
    });

    this.version(2).stores({
      users: 'id, role, username, nationalId, base',
      tasks: 'id, roleTarget, date, isCompleted',
      assessments: 'id, studentId, date, synced',
      privateNotes: 'id, studentId, date',
      reports: 'id, authorId, studentId, type, date, synced'
    });

    this.version(3).stores({
      users: 'id, role, username, nationalId, base',
      tasks: 'id, roleTarget, date, isCompleted',
      assessments: 'id, studentId, date, synced',
      privateNotes: 'id, studentId, date',
      reports: 'id, authorId, studentId, type, date, synced'
    });

    this.version(4).stores({
      users: 'id, role, username, nationalId, base',
      tasks: 'id, roleTarget, date, isCompleted',
      assessments: 'id, studentId, date, synced',
      privateNotes: 'id, studentId, date',
      reports: 'id, authorId, studentId, type, date, synced'
    });

    this.version(5).stores({
      users: 'id, role, username, nationalId, base',
      tasks: 'id, roleTarget, date, isCompleted',
      personalHabits: 'id, studentId',
      assessments: 'id, studentId, date, synced',
      privateNotes: 'id, studentId, date',
      reports: 'id, authorId, studentId, type, date, synced'
    });

    this.version(6).stores({
      users: 'id, role, username, nationalId, base',
      tasks: 'id, roleTarget, date, isCompleted',
      personalHabits: 'id, studentId',
      assessments: 'id, studentId, date, synced',
      privateNotes: 'id, studentId, date',
      reports: 'id, authorId, studentId, type, date, synced',
      appointments: 'id, studentId, counselorId, date, status'
    });
    this.version(7).stores({
      users: 'id, role, username, nationalId, base',
      tasks: 'id, roleTarget, assignedTo, date, isCompleted',
      personalHabits: 'id, studentId',
      assessments: 'id, studentId, date, synced',
      privateNotes: 'id, studentId, date',
      reports: 'id, authorId, studentId, type, date, synced',
      appointments: 'id, studentId, counselorId, date, status'
    });
    this.version(8).stores({
      users: 'id, role, username, nationalId, base',
      tasks: 'id, roleTarget, assignedTo, date, isCompleted',
      personalHabits: 'id, studentId',
      assessments: 'id, studentId, date, synced',
      privateNotes: 'id, studentId, date',
      reports: 'id, authorId, studentId, type, date, synced',
      appointments: 'id, studentId, counselorId, date, status',
      messages: 'id, senderId, recipientId, type, date, isRead'
    });
    this.version(9).stores({
      users: 'id, role, username, nationalId, base',
      tasks: 'id, roleTarget, assignedTo, date, isCompleted',
      personalHabits: 'id, studentId',
      assessments: 'id, studentId, date, synced',
      privateNotes: 'id, studentId, date',
      reports: 'id, authorId, studentId, type, date, synced',
      appointments: 'id, studentId, counselorId, date, status',
      messages: 'id, senderId, recipientId, type, date, isRead',
      customGroups: 'id, ownerId, name'
    });
    this.version(10).stores({
      users: 'id, role, username, nationalId, base',
      tasks: 'id, roleTarget, assignedTo, date, isCompleted',
      personalHabits: 'id, studentId',
      assessments: 'id, studentId, date, synced',
      privateNotes: 'id, studentId, date',
      reports: 'id, authorId, studentId, type, date, synced',
      appointments: 'id, studentId, counselorId, date, status',
      messages: 'id, senderId, recipientId, type, date, isRead',
      customGroups: 'id, ownerId, name',
      tahzibPrograms: 'id, category, isActive'
    });
    this.version(11).stores({
      users: 'id, role, username, nationalId, base',
      tasks: 'id, roleTarget, assignedTo, date, isCompleted',
      personalHabits: 'id, studentId',
      assessments: 'id, studentId, date, synced',
      privateNotes: 'id, studentId, date',
      reports: 'id, authorId, studentId, type, date, synced',
      appointments: 'id, studentId, counselorId, date, status',
      messages: 'id, senderId, recipientId, type, date, isRead',
      customGroups: 'id, ownerId, name',
      tahzibPrograms: 'id, category, isActive',
      tahzibCategories: 'id, name'
    });
  }
}

export const db = new SeminaryDB();

// Default Initial Tahzib Categories Seed
export const DEFAULT_TAHZIB_CATEGORIES: TahzibCategory[] = [
  { id: 'cat_ebadi', name: 'عبادی', order: 1, createdAt: new Date().toISOString() },
  { id: 'cat_akhlaqi', name: 'اخلاقی', order: 2, createdAt: new Date().toISOString() },
  { id: 'cat_amoozashi', name: 'آموزشی', order: 3, createdAt: new Date().toISOString() },
  { id: 'cat_omoomi', name: 'عمومی', order: 4, createdAt: new Date().toISOString() },
];

// Default Initial Tahzib Programs Seed
const DEFAULT_TAHZIB_PROGRAMS: TahzibProgram[] = [
  {
    id: 'prog_sahar',
    title: 'سحرخیزی و تهجد (پیش از اذان صبح)',
    description: 'بیداری و عبادات سحرگاهی پیش از اذان صبح',
    category: 'عبادی',
    inputType: 'BOOLEAN',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prog_telavat',
    title: 'تلاوت نور (قرائت روزانه قرآن)',
    description: 'تلاوت و استماع روزانه کلام‌الله مجید',
    category: 'عبادی',
    inputType: 'NUMERIC',
    unit: 'صفحه',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prog_class',
    title: 'حضور کامل در کلاس‌ها',
    description: 'شرکت منظم و بدون تاخیر در تمام سطوح کلاس‌های آموزشی',
    category: 'آموزشی',
    inputType: 'MULTICHOICE',
    options: ['کامل', 'ناقص (با تاخیر یا غیبت)', 'عدم شرکت'],
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prog_mabahese',
    title: 'حضور در مباحثه علمی',
    description: 'انجام منظم مباحثات درسی علمی با هم‌مباحثه‌ای‌ها',
    category: 'آموزشی',
    inputType: 'MULTICHOICE',
    options: ['کامل', 'ناقص', 'انجام نشد'],
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prog_sleep',
    title: 'خواب اول شب (رعایت زمان خاموشی)',
    description: 'استراحت به موقع شبانه جهت آمادگی سحر و کلاس‌ها',
    category: 'عمومی',
    inputType: 'BOOLEAN',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Mock Initial Data Seeding
export async function seedDatabase() {
  try {
    const users = await db.users.toArray();
    const needsReseed = users.length === 0 || (users.length > 0 && !users[0].username);
    
    if (needsReseed) {
      if (users.length > 0) {
        await db.users.clear();
        await db.tasks.clear();
      }
      
      await db.users.add({
        id: 'u0',
        name: 'مسئول فنی',
        role: 'TECH_ADMIN',
        username: 'admin',
        password: 'admin123',
        isApproved: true
      });
    } else {
      // Ensure admin tech admin user exists and has password admin123
      const adminUser = users.find(u => u.username === 'admin');
      if (adminUser) {
        if (adminUser.password !== 'admin123' || !adminUser.isApproved || adminUser.role !== 'TECH_ADMIN') {
          await db.users.update(adminUser.id, { password: 'admin123', isApproved: true, role: 'TECH_ADMIN' });
        }
      }

      const fanniUser = users.find(u => u.username === 'fanni');
      if (fanniUser) {
        if (fanniUser.password !== 'admin123' || !fanniUser.isApproved || fanniUser.role !== 'TECH_ADMIN') {
          await db.users.update(fanniUser.id, { password: 'admin123', isApproved: true, role: 'TECH_ADMIN' });
        }
      }

      if (!adminUser && !fanniUser) {
        const techAdminUser = users.find(u => u.role === 'TECH_ADMIN');
        if (techAdminUser) {
          await db.users.update(techAdminUser.id, {
            username: 'admin',
            password: 'admin123',
            name: 'مسئول فنی',
            role: 'TECH_ADMIN',
            isApproved: true
          });
        } else {
          await db.users.add({
            id: 'u0_' + Date.now(),
            name: 'مسئول فنی',
            role: 'TECH_ADMIN',
            username: 'admin',
            password: 'admin123',
            isApproved: true
          });
        }
      }
    }

    // Ensure default Tahzib categories exist in database
    const existingCatCount = await db.tahzibCategories.count();
    if (existingCatCount === 0) {
      await db.tahzibCategories.bulkAdd(DEFAULT_TAHZIB_CATEGORIES);
    }

    // Ensure default Tahzib programs exist in database
    const existingProgramsCount = await db.tahzibPrograms.count();
    if (existingProgramsCount === 0) {
      await db.tahzibPrograms.bulkAdd(DEFAULT_TAHZIB_PROGRAMS);
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}
