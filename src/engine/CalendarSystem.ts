/**
 * 日历系统 - 管理游戏内时间、交易日判定
 */

export type MarketPhase =
  | 'pre_market'    // 盘前 (00:00-09:30)
  | 'am_trading'    // 上午交易 (09:30-11:30)
  | 'lunch_break'   // 午休 (11:30-13:00)
  | 'pm_trading'    // 下午交易 (13:00-15:00)
  | 'after_hours'   // 盘后 (15:00-24:00)
  | 'closed';       // 休市日全天

export interface GameCalendar {
  /** 游戏内日期 "YYYY-MM-DD" */
  date: string;
  /** 0=周日 ... 6=周六 */
  dayOfWeek: number;
  /** 当天分钟数 0-1439 */
  minuteOfDay: number;
  /** 是否交易日（周一到周五） */
  isTradingDay: boolean;
  /** 当前市场阶段 */
  marketPhase: MarketPhase;
}

/** 游戏起始日期：2026-01-05 周一 */
const GAME_START = new Date('2026-01-05T00:00:00');

/** 从游戏总分钟数计算日历状态 */
export function getCalendar(totalGameMinutes: number): GameCalendar {
  const totalDays = Math.floor(totalGameMinutes / 1440);
  const minuteOfDay = totalGameMinutes % 1440;

  const date = new Date(GAME_START);
  date.setDate(date.getDate() + totalDays);

  const dayOfWeek = date.getDay();
  const isTradingDay = dayOfWeek >= 1 && dayOfWeek <= 5;

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const marketPhase = getMarketPhase(minuteOfDay, isTradingDay);

  return { date: dateStr, dayOfWeek, minuteOfDay, isTradingDay, marketPhase };
}

/** 判断当前市场阶段 */
function getMarketPhase(minuteOfDay: number, isTradingDay: boolean): MarketPhase {
  if (!isTradingDay) return 'closed';
  if (minuteOfDay >= 570 && minuteOfDay < 690) return 'am_trading';    // 09:30-11:30
  if (minuteOfDay >= 690 && minuteOfDay < 780) return 'lunch_break';   // 11:30-13:00
  if (minuteOfDay >= 780 && minuteOfDay < 900) return 'pm_trading';    // 13:00-15:00
  if (minuteOfDay >= 900) return 'after_hours';                         // 15:00+
  return 'pre_market';                                                  // 00:00-09:30
}

/** 星期几中文 */
const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
export function getDayOfWeekLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek];
}

/** 分钟数转时间字符串 HH:MM */
export function minuteToTimeStr(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** 获取本周日历数据（用于日历组件） */
export function getWeekCalendar(currentDate: string): {
  date: string;
  dayOfWeek: number;
  label: string;
  isTradingDay: boolean;
  isToday: boolean;
  dayNum: number;
}[] {
  const current = new Date(currentDate + 'T00:00:00');
  const dow = current.getDay();
  // 找到本周一
  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - (dow === 0 ? 6 : dow - 1));

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayOfWeek = d.getDay();
    week.push({
      date: dateStr,
      dayOfWeek,
      label: DAY_LABELS[dayOfWeek],
      isTradingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
      isToday: dateStr === currentDate,
      dayNum: d.getDate(),
    });
  }
  return week;
}

/** 将分时图tick序号（0-240）转换为游戏总分钟偏移 */
export function tickToGameMinuteOffset(tick: number): number {
  // tick 0-120 对应 09:30-11:30 = 分钟 570-690
  // tick 121-240 对应 13:00-15:00 = 分钟 780-899
  if (tick <= 120) {
    return 570 + tick;
  } else {
    return 780 + (tick - 121);
  }
}

/** 从游戏分钟数获取对应的分时图tick（如果当前在交易时段） */
export function gameMinuteToTick(minuteOfDay: number): number | null {
  if (minuteOfDay >= 570 && minuteOfDay < 690) {
    return minuteOfDay - 570; // 0-119
  }
  if (minuteOfDay >= 780 && minuteOfDay < 900) {
    return 121 + (minuteOfDay - 780); // 121-240
  }
  return null;
}
