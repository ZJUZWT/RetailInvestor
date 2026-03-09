import type { TrendSegment, StockDataPoint } from '../types';

/** 生成一局游戏的牛熊趋势段 */
export function generateTrendSegments(totalDays: number = 200): TrendSegment[] {
  const segments: TrendSegment[] = [];
  let currentDay = 1;

  while (currentDay < totalDays) {
    const segmentLength = 15 + Math.floor(Math.random() * 35); // 15-50天一段
    const endDay = Math.min(currentDay + segmentLength, totalDays);

    // 随机牛熊：偏向交替
    const prevBias = segments.length > 0 ? segments[segments.length - 1].dailyBias : 0;
    let dailyBias: number;

    if (prevBias > 0) {
      // 上一段是牛，这段大概率转熊或震荡
      dailyBias = (Math.random() - 0.65) * 0.02; // 偏空
    } else if (prevBias < 0) {
      // 上一段是熊，这段大概率转牛或震荡
      dailyBias = (Math.random() - 0.35) * 0.02; // 偏多
    } else {
      dailyBias = (Math.random() - 0.5) * 0.02;
    }

    const volatility = 0.02 + Math.random() * 0.04; // 2%-6%基础波动

    segments.push({ startDay: currentDay, endDay, dailyBias, volatility });
    currentDay = endDay + 1;
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
