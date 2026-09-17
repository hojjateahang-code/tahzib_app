import { format, getISOWeek } from 'date-fns';

export function getTaskPeriodKey(type?: 'ONETIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'EVENT'): string {
  const now = new Date();
  if (type === 'DAILY') {
    return format(now, 'yyyy-MM-dd');
  } else if (type === 'WEEKLY') {
    return `${format(now, 'yyyy')}-W${getISOWeek(now)}`;
  } else if (type === 'MONTHLY') {
    return format(now, 'yyyy-MM');
  } else {
    return 'ONETIME';
  }
}
