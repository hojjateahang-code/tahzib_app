import type { Report, User } from '../types';

export interface ReportAuthorInfo {
  name: string;
  roleLabel: string;
  role: string;
}

export function getReportAuthorInfo(report: Report, allUsers?: User[]): ReportAuthorInfo {
  if (!report) {
    return { name: 'نامشخص', roleLabel: 'استاد راهنما', role: 'MENTOR' };
  }

  // 1. Find matching user from allUsers list
  const author = allUsers?.find(u => 
    (report.authorId && u.id === report.authorId) || 
    (report.mentorId && u.id === report.mentorId)
  );

  if (author) {
    let roleLabel = 'استاد راهنما';
    switch (author.role) {
      case 'MENTOR':
        roleLabel = 'استاد راهنما';
        break;
      case 'COUNSELOR':
        roleLabel = 'مشاور';
        break;
      case 'VICE_PRINCIPAL':
        roleLabel = 'معاونت تهذیب';
        break;
      case 'DIRECTOR':
        roleLabel = 'مدیریت مدرسه';
        break;
      case 'STUDENT':
        roleLabel = 'طلبه';
        break;
      case 'TECH_ADMIN':
        roleLabel = 'مسئول فنی';
        break;
      default:
        roleLabel = author.role || 'استاد';
    }

    return {
      name: author.name || 'کاربر سیستم',
      roleLabel,
      role: author.role || 'MENTOR'
    };
  }

  // 2. Fallback when author object is not found in user database
  const isSupervisorNote = report.content?.includes('[SUPERVISOR_NOTE]') || report.type === 'EVALUATION' || report.type === 'MENTOR_EVAL';
  const isCounselingSession = report.type === 'COUNSELING_SESSION';

  if (isSupervisorNote) {
    return {
      name: 'استاد راهنما / ارزیاب',
      roleLabel: 'استاد راهنما',
      role: 'MENTOR'
    };
  }

  if (isCounselingSession) {
    return {
      name: 'استاد مشاور',
      roleLabel: 'مشاور',
      role: 'COUNSELOR'
    };
  }

  return {
    name: 'استاد راهنما',
    roleLabel: 'استاد راهنما',
    role: 'MENTOR'
  };
}
