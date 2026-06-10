import { Lunar } from 'lunar-javascript';

export interface LunarDateParts {
  monthZh: string;
  dayZh: string;
  monthEn: string;
  dayNumber: number;
}

const MONTH_NAMES = [
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
  'Eleventh',
  'Twelfth',
];

export function getLunarDate(date: Date): LunarDateParts {
  const lunar = Lunar.fromDate(date);
  const month = lunar.getMonth();
  const day = lunar.getDay();

  return {
    monthZh: lunar.getMonthInChinese(),
    dayZh: lunar.getDayInChinese(),
    monthEn: MONTH_NAMES[Math.max(0, Math.min(11, Math.abs(month) - 1))],
    dayNumber: day,
  };
}
