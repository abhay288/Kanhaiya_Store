import { BadRequestError } from './errors';

export interface DateRangeResult {
  startDate: Date;
  endDate: Date;
  label: string;
}

export type PresetRange =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thismonth'
  | 'lastmonth'
  | 'custom';

// Offset in minutes for IST (UTC+05:30 = 330 minutes)
const IST_OFFSET_MINUTES = 330;

/**
 * Converts a UTC Date into an IST wall-clock representation
 */
function getIstDate(now: Date = new Date()): { year: number; month: number; date: number; day: number } {
  const utcTime = now.getTime();
  const istTime = new Date(utcTime + IST_OFFSET_MINUTES * 60 * 1000);
  return {
    year: istTime.getUTCFullYear(),
    month: istTime.getUTCMonth(),
    date: istTime.getUTCDate(),
    day: istTime.getUTCDay(),
  };
}

/**
 * Creates a UTC Date representing the start (00:00:00.000) of an IST day
 */
function makeIstStartOfDay(year: number, month: number, date: number): Date {
  // Midnight in IST is (00:00 - 5:30) = previous day 18:30 in UTC
  const utcMs = Date.UTC(year, month, date, 0, 0, 0, 0) - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
}

/**
 * Creates a UTC Date representing the end (23:59:59.999) of an IST day
 */
function makeIstEndOfDay(year: number, month: number, date: number): Date {
  const utcMs = Date.UTC(year, month, date, 23, 59, 59, 999) - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
}

/**
 * Calculates start and end Date objects based on preset or custom strings.
 */
export function calculateDateRange(
  range: string = 'last30days',
  customStart?: string,
  customEnd?: string,
  referenceNow: Date = new Date()
): DateRangeResult {
  const normalized = (range || 'last30days').toLowerCase() as PresetRange;
  const ist = getIstDate(referenceNow);

  switch (normalized) {
    case 'today': {
      return {
        startDate: makeIstStartOfDay(ist.year, ist.month, ist.date),
        endDate: makeIstEndOfDay(ist.year, ist.month, ist.date),
        label: 'Today',
      };
    }

    case 'yesterday': {
      const prevDate = new Date(Date.UTC(ist.year, ist.month, ist.date - 1));
      const py = prevDate.getUTCFullYear();
      const pm = prevDate.getUTCMonth();
      const pd = prevDate.getUTCDate();
      return {
        startDate: makeIstStartOfDay(py, pm, pd),
        endDate: makeIstEndOfDay(py, pm, pd),
        label: 'Yesterday',
      };
    }

    case 'last7days': {
      const prevDate = new Date(Date.UTC(ist.year, ist.month, ist.date - 6));
      return {
        startDate: makeIstStartOfDay(prevDate.getUTCFullYear(), prevDate.getUTCMonth(), prevDate.getUTCDate()),
        endDate: makeIstEndOfDay(ist.year, ist.month, ist.date),
        label: 'Last 7 Days',
      };
    }

    case 'thismonth': {
      return {
        startDate: makeIstStartOfDay(ist.year, ist.month, 1),
        endDate: makeIstEndOfDay(ist.year, ist.month, ist.date),
        label: 'Current Month',
      };
    }

    case 'lastmonth': {
      const lastMonthDate = new Date(Date.UTC(ist.year, ist.month - 1, 1));
      const lmy = lastMonthDate.getUTCFullYear();
      const lmm = lastMonthDate.getUTCMonth();
      // Find last day of last month
      const lastDayOfLastMonth = new Date(Date.UTC(ist.year, ist.month, 0)).getUTCDate();
      return {
        startDate: makeIstStartOfDay(lmy, lmm, 1),
        endDate: makeIstEndOfDay(lmy, lmm, lastDayOfLastMonth),
        label: 'Previous Month',
      };
    }

    case 'custom': {
      if (customStart) {
        const s = new Date(customStart);
        if (isNaN(s.getTime())) {
          throw new BadRequestError('Invalid custom startDate format.');
        }
        const e = customEnd ? new Date(customEnd) : new Date(referenceNow);
        if (isNaN(e.getTime())) {
          throw new BadRequestError('Invalid custom endDate format.');
        }
        if (s.getTime() > e.getTime()) {
          throw new BadRequestError('Start date cannot be after end date.');
        }
        const maxRangeMs = 5 * 365.25 * 24 * 60 * 60 * 1000;
        if (e.getTime() - s.getTime() > maxRangeMs) {
          throw new BadRequestError('Custom date range cannot exceed 5 years.');
        }
        return {
          startDate: s,
          endDate: e,
          label: 'Custom Range',
        };
      }
      // Fall through to last30days
    }

    case 'last30days':
    default: {
      const prevDate = new Date(Date.UTC(ist.year, ist.month, ist.date - 29));
      return {
        startDate: makeIstStartOfDay(prevDate.getUTCFullYear(), prevDate.getUTCMonth(), prevDate.getUTCDate()),
        endDate: makeIstEndOfDay(ist.year, ist.month, ist.date),
        label: 'Last 30 Days',
      };
    }
  }
}
