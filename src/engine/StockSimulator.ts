import type { TrendSegment, StockDataPoint, OpeningPattern } from '../types';

// ============================================================
// 工具函数
// ============================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 正态分布随机数 (Box-Muller) */
function randNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** 肥尾分布：90% 正常 + 10% 重尾（3倍标准差） */
function fatTailRandom(): number {
  if (Math.random() < 0.10) {
    return randNormal() * 3.0; // 重尾：偶尔出现极端值
  }
  return randNormal();
}

// ============================================================
// 趋势段生成
// ============================================================

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
    const segmentLength = 10 + Math.floor(Math.random() * 30); // 10-39天，更短更多变
    const endDay = Math.min(currentDay + segmentLength, totalDays);

    const prevBias = segments.length > 0 ? segments[segments.length - 1].dailyBias : 0;
    let dailyBias: number;

    // 增大 dailyBias 幅度，让趋势更明显
    if (prevBias > 0) {
      dailyBias = (Math.random() - 0.6) * 0.05; // -0.030 ~ +0.020
    } else if (prevBias < 0) {
      dailyBias = (Math.random() - 0.4) * 0.05; // -0.020 ~ +0.030
    } else {
      dailyBias = (Math.random() - 0.5) * 0.05; // -0.025 ~ +0.025
    }

    const volatility = 0.03 + Math.random() * 0.05; // 0.03-0.08，提高基础波动
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
  return seg || { startDay: day, endDay: day, dailyBias: 0, volatility: 0.04 };
}

// ============================================================
// 极端行情 & 特殊机制
// ============================================================

/** 判断是否为极端行情日（~12% 概率） */
function rollExtremeDay(): { isExtreme: boolean; multiplier: number; direction: number } {
  const roll = Math.random();
  if (roll < 0.03) {
    // 3%: 超级大阳/大阴线 (涨跌停级别)
    return { isExtreme: true, multiplier: 3.0, direction: Math.random() < 0.5 ? 1 : -1 };
  } else if (roll < 0.12) {
    // 9%: 大阳/大阴线
    return { isExtreme: true, multiplier: 1.8 + Math.random() * 0.7, direction: Math.random() < 0.5 ? 1 : -1 };
  }
  return { isExtreme: false, multiplier: 1.0, direction: 0 };
}

/**
 * 趋势转换冲击：当新段方向与前段相反时，前几天有冲击加成
 * @param day 当前天
 * @param segment 当前趋势段
 * @param segments 所有趋势段
 */
function getTrendTransitionShock(day: number, segment: TrendSegment, segments: TrendSegment[]): number {
  const idx = segments.indexOf(segment);
  if (idx <= 0) return 1.0;

  const prevSeg = segments[idx - 1];
  const daysIntoSegment = day - segment.startDay;

  // 方向相反且在段开头5天内
  if (prevSeg.dailyBias * segment.dailyBias < 0 && daysIntoSegment < 5) {
    // 越靠近转换点冲击越大
    const shockDecay = 1.0 - daysIntoSegment / 5;
    return 1.0 + 1.5 * shockDecay; // 最大 2.5x
  }
  return 1.0;
}

/**
 * 物极必反机制：连续同向日后产生反向偏移
 * @param consecutiveDays 连续同向天数（正=连涨，负=连跌）
 */
function getMeanReversionBias(consecutiveDays: number): number {
  const absDays = Math.abs(consecutiveDays);
  if (absDays < 4) return 0;

  // 连续4天开始触发，5天以上越来越强
  const strength = (absDays - 3) * 0.008; // 4天=0.008, 5天=0.016, 6天=0.024...
  const capped = Math.min(strength, 0.05); // 最大 5%

  // 反向
  return consecutiveDays > 0 ? -capped : capped;
}

// ============================================================
// AM / PM 行情模拟
// ============================================================

/** 模拟一天的上午行情，返回 open→amClose */
export function simulateAMSession(
  prevClose: number,
  trend: TrendSegment,
  eventModifier: number = 0,
  extremeDay?: { isExtreme: boolean; multiplier: number; direction: number },
  meanReversionBias: number = 0,
  transitionShock: number = 1.0,
): { open: number; amClose: number; high: number; low: number } {
  const extreme = extremeDay || { isExtreme: false, multiplier: 1.0, direction: 0 };
  const volMult = extreme.multiplier * transitionShock;

  // 开盘价：跳空幅度增大
  let gapPercent = fatTailRandom() * 0.02 + eventModifier * 0.3;
  if (extreme.isExtreme) {
    gapPercent += extreme.direction * (0.02 + Math.random() * 0.03); // 极端日大幅跳空
  }
  gapPercent += meanReversionBias * 0.3; // 物极必反影响跳空
  const open = prevClose * (1 + gapPercent);

  // 上午走势：增大波动
  const amChange =
    trend.dailyBias * 0.6 * transitionShock + // 趋势影响（转换冲击加成）
    fatTailRandom() * trend.volatility * 0.8 * volMult + // 随机波动（肥尾）
    eventModifier * 0.4 + // 事件影响
    (extreme.isExtreme ? extreme.direction * 0.02 : 0) + // 极端日方向推力
    meanReversionBias * 0.4; // 物极必反影响

  let amClose = open * (1 + amChange);

  // 涨跌停限制
  const upperLimit = prevClose * 1.1;
  const lowerLimit = prevClose * 0.9;
  amClose = Math.max(lowerLimit, Math.min(upperLimit, amClose));

  // 日内高低点：范围更大
  const high = Math.max(open, amClose) * (1 + Math.random() * 0.015 * volMult);
  const low = Math.min(open, amClose) * (1 - Math.random() * 0.015 * volMult);

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
  extremeDay?: { isExtreme: boolean; multiplier: number; direction: number },
  meanReversionBias: number = 0,
  transitionShock: number = 1.0,
): StockDataPoint & { day: number } {
  const extreme = extremeDay || { isExtreme: false, multiplier: 1.0, direction: 0 };
  const volMult = extreme.multiplier * transitionShock;

  const pmChange =
    trend.dailyBias * 0.6 * transitionShock +
    fatTailRandom() * trend.volatility * 0.9 * volMult +
    eventModifier * 0.3 +
    (extreme.isExtreme ? extreme.direction * 0.02 : 0) +
    meanReversionBias * 0.3;

  let close = amResult.amClose * (1 + pmChange);

  const upperLimit = prevClose * 1.1;
  const lowerLimit = prevClose * 0.9;
  close = Math.max(lowerLimit, Math.min(upperLimit, close));

  const dayHigh = Math.max(amResult.high, close, amResult.amClose) * (1 + Math.random() * 0.008 * volMult);
  const dayLow = Math.min(amResult.low, close, amResult.amClose) * (1 - Math.random() * 0.008 * volMult);

  return {
    day: 0, // caller sets this
    open: amResult.open,
    close: round2(close),
    high: round2(Math.min(dayHigh, upperLimit)),
    low: round2(Math.max(dayLow, lowerLimit)),
  };
}

// ============================================================
// 股票名 & 初始价格
// ============================================================

const STOCK_NAMES = [
  '星辰科技', '龙腾集团', '未来能源', '梦想传媒', '银河生物',
  '天顶互联', '大圣智能', '鲲鹏新材', '麒麟医药', '凤凰文化',
  '云端科技', '雷霆游戏', '太阳花食品', '北极星芯片', '量子通信',
];

export function getRandomStockName(): string {
  return STOCK_NAMES[Math.floor(Math.random() * STOCK_NAMES.length)];
}

export function getInitialPrice(): number {
  return round2(8 + Math.random() * 25); // 8-33元
}

// ============================================================
// 开局模式模板（增强版）
// ============================================================

const OPENING_TEMPLATES: Record<OpeningPattern, TrendSegment[]> = {
  slow_bull_pullback: [
    { startDay: -60, endDay: -20, dailyBias: 0.010, volatility: 0.04 },
    { startDay: -19, endDay: 0, dailyBias: -0.007, volatility: 0.05 },
  ],
  dark_decline_bottom: [
    { startDay: -50, endDay: -10, dailyBias: -0.009, volatility: 0.05 },
    { startDay: -9, endDay: 0, dailyBias: 0.003, volatility: 0.035 },
  ],
  sideways_consolidation: [
    { startDay: -40, endDay: 0, dailyBias: 0.001, volatility: 0.03 },
  ],
  surge_high: [
    { startDay: -30, endDay: 0, dailyBias: 0.014, volatility: 0.06 },
  ],
  v_shape_rebound: [
    { startDay: -40, endDay: -20, dailyBias: -0.013, volatility: 0.06 },
    { startDay: -19, endDay: 0, dailyBias: 0.012, volatility: 0.055 },
  ],
};

const ALL_PATTERNS: OpeningPattern[] = [
  'slow_bull_pullback',
  'dark_decline_bottom',
  'sideways_consolidation',
  'surge_high',
  'v_shape_rebound',
];

export function getRandomOpeningPattern(): OpeningPattern {
  return ALL_PATTERNS[Math.floor(Math.random() * ALL_PATTERNS.length)];
}

// ============================================================
// 历史数据生成（带物极必反 & 极端行情）
// ============================================================

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
  let consecutiveDays = 0; // 正=连涨天数，负=连跌天数

  for (let day = 1; day <= days; day++) {
    const trend = getTrendForDay(day, segments);
    const extreme = rollExtremeDay();
    const meanBias = getMeanReversionBias(consecutiveDays);
    const shock = getTrendTransitionShock(day, trend, segments);

    const am = simulateAMSession(prevClose, trend, 0, extreme, meanBias, shock);
    const pm = simulatePMSession(prevClose, am, trend, 0, extreme, meanBias, shock);
    const dataPoint: StockDataPoint = {
      day,
      open: pm.open,
      close: pm.close,
      high: pm.high,
      low: pm.low,
    };
    history.push(dataPoint);

    // 更新连涨/连跌计数
    if (pm.close > prevClose) {
      consecutiveDays = consecutiveDays > 0 ? consecutiveDays + 1 : 1;
    } else if (pm.close < prevClose) {
      consecutiveDays = consecutiveDays < 0 ? consecutiveDays - 1 : -1;
    } else {
      consecutiveDays = 0;
    }

    prevClose = pm.close;
  }

  return history;
}
