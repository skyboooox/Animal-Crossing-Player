import type { Language } from '../../L4_Atom/types';
import { getLunarDate } from '../../L4_Atom/date/lunar';

export function formatLunarDate(date: Date, language: Language): string {
  const lunar = getLunarDate(date);
  if (language === 'zh-CN') {
    return `${lunar.monthZh}${lunar.dayZh}`;
  }
  return `Lunar ${lunar.monthEn} ${lunar.dayNumber}`;
}
