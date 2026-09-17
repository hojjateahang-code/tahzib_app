// System Event Logger for Technical Admin & Diagnostics

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
export type LogCategory = 'SYNC' | 'USER_MGMT' | 'DATABASE' | 'NETWORK' | 'AUTH' | 'SYSTEM';

export interface SystemLogEntry {
  id: string;
  timestamp: string; // ISO string
  formattedTime: string; // Persian formatted time
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any;
  deviceId?: string;
}

const STORAGE_KEY = 'tahzib_system_event_logs';
const MAX_LOGS = 500;

type LogListener = (logs: SystemLogEntry[]) => void;
const listeners: Set<LogListener> = new Set();

function getStoredLogs(): SystemLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLogs(logs: SystemLogEntry[]) {
  try {
    // Keep max MAX_LOGS entries
    const trimmed = logs.slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    listeners.forEach(fn => fn(trimmed));
  } catch (e) {
    console.error('Failed to save log entry:', e);
  }
}

export const logger = {
  getLogs(): SystemLogEntry[] {
    return getStoredLogs();
  },

  clearLogs() {
    saveLogs([]);
  },

  subscribe(listener: LogListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  log(level: LogLevel, category: LogCategory, message: string, details?: any) {
    const now = new Date();
    const entry: SystemLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now.toISOString(),
      formattedTime: now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level,
      category,
      message,
      details,
      deviceId: localStorage.getItem('device_id') || 'dev_unknown',
    };

    // Print to browser console too
    const consolePrefix = `[${entry.category}] [${entry.level}]`;
    if (level === 'ERROR') {
      console.error(consolePrefix, message, details || '');
    } else if (level === 'WARN') {
      console.warn(consolePrefix, message, details || '');
    } else {
      console.log(consolePrefix, message, details || '');
    }

    const currentLogs = getStoredLogs();
    saveLogs([entry, ...currentLogs]);
    return entry;
  },

  info(category: LogCategory, message: string, details?: any) {
    return this.log('INFO', category, message, details);
  },

  success(category: LogCategory, message: string, details?: any) {
    return this.log('SUCCESS', category, message, details);
  },

  warn(category: LogCategory, message: string, details?: any) {
    return this.log('WARN', category, message, details);
  },

  error(category: LogCategory, message: string, details?: any) {
    return this.log('ERROR', category, message, details);
  },
};
