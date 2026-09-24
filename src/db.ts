import Dexie, { type Table } from 'dexie';
import type { User, Task, Assessment, PrivateNote, Report, PersonalHabit, Appointment, Message, CustomGroup } from './types';

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
  }
}

export const db = new SeminaryDB();

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
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}
