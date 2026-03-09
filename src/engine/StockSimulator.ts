import type { TrendSegment, StockDataPoint, OpeningPattern } from '../types';

/**
 * 生成一局游戏的完整趋势段（历史 + 游戏期间）
 * @param historyDays 预生成的历史天数
 * @param gameDays 游戏期间的天数
 * @param pattern 开局模式
 */
export function generateTrendSegments(
  historyDays: number = 0,
  gameDays: number = 200,
  pattern?: OpeningPattern,
): TrendSegment[] {
  const totalDays = historyDays + gameDays;
  const segments: TrendSegment[] = [];
  let currentDay = 1;

  while (currentDay < totalDays) {
    const segmentLength = 15 + Math.floor(Math.random() * 35);
    const endDay = Math.min(currentDay + segmentLength, totalDays);

    const prevBias = segments.length > 0 ? segments[segments.length - 1].dailyBias : 0;
    let dailyBias: number;

    if (prevBias > 0) {
      dailyBias = (Math.random() - 0.65) * 0.02;
    } else if (prevBias < 0) {
      dailyBias = (Math.random() - 0.35) * 0.02;
    } else {
      dailyBias = (Math.random() - 0.5) * 0.02;
    }

    const volatility = 0.02 + Math.random() * 0.04;
    segments.push({ startDay: currentDay, endDay, dailyBias, volatility });
    currentDay = endDay + 1;
  }

  // 将开局模式模板覆盖到历史末段
  if (pattern && historyDays > 0) {
    const template = OPENING_TEMPLATES[pattern];
    const templateStart = historyDays + template[0].startDay;
    const filtered = segments.filter(s => s.endDay < templateStart);

    for (const t of template) {
      filtered.push({
        startDay: historyDays + t.startDay,
        endDay: historyDays + t.endDay,
        dailyBias: t.dailyBias,
        volatility: t.volatility,
      });
    }

    return filtered;
  }

  return segments;
}

/** 获取某天所处的趋势段 */
export function getTrendForDay(day: number, segments: TrendSegment[]): TrendSegment {
  const seg = segments.find(s => day >= s.startDay && day <= s.endDay);
  return seg || { startDay: day, endDay: day, dailyBias: 0, volatility: 0.03 };
}

/** 模拟一天的上午行情，返回 open→amClose */
export function simulateAMSession(
  prevClose: number,
  trend: TrendSegment,
  eventModifier: number = 0,
): { open: number; amClose: number; high: number; low: number } {
  // 开盘价：在前一天收盘价附近小幅跳空
  const gapPercent = (Math.random() - 0.5) * 0.02 + eventModifier * 0.3;
  const open = prevClose * (1 + gapPercent);

  // 上午走势
  const amChange =
    trend.dailyBias * 0.5 + // 趋势影响（占半天）
    (Math.random() - 0.5) * trend.volatility * 0.6 + // 随机波动
    eventModifier * 0.4; // 事件影响

  let amClose = open * (1 + amChange);

  // 涨跌停限制（基于前收盘价）
  const upperLimit = prevClose * 1.1;
  const lowerLimit = prevClose * 0.9;
  amClose = Math.max(lowerLimit, Math.min(upperLimit, amClose));

  const high = Math.max(open, amClose) * (1 + Math.random() * 0.01);
  const low = Math.min(open, amClose) * (1 - Math.random() * 0.01);

  return {
    open: round2(open),
    amClose: round2(amClose),
    high: round2(Math.min(high, upperLimit)),
    low: round2(Math.max(low, lowerLimit)),
  };
}

/** 模拟下午行情，基于上午结果生成最终收盘 */
export function simulatePMSession(
  prevClose: number,
  amResult: { open: number; amClose: number; high: number; low: number },
  trend: TrendSegment,
  eventModifier: number = 0,
): StockDataPoint & { day: number } {
  const pmChange =
    trend.dailyBias * 0.5 +
    (Math.random() - 0.5) * trend.volatility * 0.7 +
    eventModifier * 0.3;

  let close = amResult.amClose * (1 + pmChange);

  const upperLimit = prevClose * 1.1;
  const lowerLimit = prevClose * 0.9;
  close = Math.max(lowerLimit, Math.min(upperLimit, close));

  const dayHigh = Math.max(amResult.high, close, amResult.amClose) * (1 + Math.random() * 0.005);
  const dayLow = Math.min(amResult.low, close, amResult.amClose) * (1 - Math.random() * 0.005);

  return {
    day: 0, // caller sets this
    open: amResult.open,
    close: round2(close),
    high: round2(Math.min(dayHigh, upperLimit)),
    low: round2(Math.max(dayLow, lowerLimit)),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 随机股票名 */
const STOCK_NAMES = [
  '星辰科技', '龙腾集团', '未来能源', '梦想传媒', '银河生物',
  '天顶互联', '大圣智能', '鲲鹏新材', '麒麟医药', '凤凰文化',
  '云端科技', '雷霆游戏', '太阳花食品', '北极星芯片', '量子通信',
];

export function getRandomStockName(): string {
  return STOCK_NAMES[Math.floor(Math.random() * STOCK_NAMES.length)];
}

/** 初始股价 */
export function getInitialPrice(): number {
  return round2(8 + Math.random() * 25); // 8-33元
}

/** 开局模式的最后阶段趋势模板 */
const OPENING_TEMPLATES: Record<OpeningPattern, TrendSegment[]> = {
  slow_bull_pullback: [
    { startDay: -60, endDay: -20, dailyBias: 0.006, volatility: 0.025 },
    { startDay: -19, endDay: 0, dailyBias: -0.004, volatility: 0.035 },
  ],
  dark_decline_bottom: [
    { startDay: -50, endDay: -10, dailyBias: -0.005, volatility: 0.03 },
    { startDay: -9, endDay: 0, dailyBias: 0.001, volatility: 0.02 },
  ],
  sideways_consolidation: [
    { startDay: -40, endDay: 0, dailyBias: 0.0005, volatility: 0.018 },
  ],
  surge_high: [
    { startDay: -30, endDay: 0, dailyBias: 0.008, volatility: 0.04 },
  ],
  v_shape_rebound: [
    { startDay: -40, endDay: -20, dailyBias: -0.008, volatility: 0.04 },
    { startDay: -19, endDay: 0, dailyBias: 0.007, volatility: 0.035 },
  ],
};

const ALL_PATTERNS: OpeningPattern[] = [
  'slow_bull_pullback',
  'dark_decline_bottom',
  'sideways_consolidation',
  'surge_high',
  'v_shape_rebound',
];

/** 随机选择开局模式 */
export function getRandomOpeningPattern(): OpeningPattern {
  return ALL_PATTERNS[Math.floor(Math.random() * ALL_PATTERNS.length)];
}

/**
 * 批量生成历史日K数据
 * @param days 天数
 * @param initialPrice 起始价格
 * @param segments 趋势段
 * @returns 历史日K数组
 */
export function generateHistoryData(
  days: number,
  initialPrice: number,
  segments: TrendSegment[],
): StockDataPoint[] {
  const history: StockDataPoint[] = [];
  let prevClose = initialPrice;

  for (let day = 1; day <= days; day++) {
    const trend = getTrendForDay(day, segments);
    const am = simulateAMSession(prevClose, trend, 0);
    const pm = simulatePMSession(prevClose, am, trend, 0);
    const dataPoint: StockDataPoint = {
      day,
      open: pm.open,
      close: pm.close,
      high: pm.high,
      low: pm.low,
    };
    history.push(dataPoint);
    prevClose = pm.close;
  }

  return history;
}
