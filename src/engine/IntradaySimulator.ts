import type { TrendSegment } from '../types';

/**
 * 盘中分时模拟器
 *
 * 模拟A股分时走势，不同时段有不同的波动特征：
 * - 开盘博弈期(09:30-09:45): 波动大，方向不定
 * - 上午主力试盘(09:45-10:30): 方向逐渐明朗
 * - 获利盘回吐(10:30-11:00): 可能回调
 * - 午盘前定调(11:00-11:30): 趋于平稳
 * - 午后惯性(13:00-13:15): 延续上午尾盘
 * - 下午主战场(13:15-14:00): 大资金发力
 * - 尾盘预期(14:00-14:30): 散户跟风
 * - 尾盘抢筹/出逃(14:30-15:00): 最后的疯狂
 */

/** 盘中一个tick的数据 */
export interface IntradayTick {
  /** 从开盘起的分钟数 (0 = 09:30, 120 = 11:30, 121 = 13:00, 240 = 15:00) */
  minute: number;
  price: number;
  /** 累计成交量(模拟) */
  volume: number;
  /** 显示用时间字符串 */
  timeLabel: string;
}

/** 时段定义 */
interface SessionSegment {
  startMinute: number;
  endMinute: number;
  name: string;
  volatilityMult: number;  // 波动率乘数
  trendMult: number;        // 趋势跟随强度
  momentumDecay: number;    // 动量衰减
  volumeMult: number;       // 成交量乘数
}

/** 上午盘时段 (分钟0-120 = 09:30-11:30) */
const AM_SEGMENTS: SessionSegment[] = [
  { startMinute: 0, endMinute: 15, name: '开盘博弈', volatilityMult: 2.5, trendMult: 0.3, momentumDecay: 0.8, volumeMult: 2.0 },
  { startMinute: 15, endMinute: 60, name: '主力试盘', volatilityMult: 1.2, trendMult: 0.6, momentumDecay: 0.9, volumeMult: 1.2 },
  { startMinute: 60, endMinute: 90, name: '获利回吐', volatilityMult: 1.0, trendMult: -0.3, momentumDecay: 0.7, volumeMult: 0.8 },
  { startMinute: 90, endMinute: 120, name: '午盘定调', volatilityMult: 0.7, trendMult: 0.2, momentumDecay: 0.95, volumeMult: 0.6 },
];

/** 下午盘时段 (分钟121-240 = 13:00-15:00) */
const PM_SEGMENTS: SessionSegment[] = [
  { startMinute: 121, endMinute: 136, name: '午后惯性', volatilityMult: 0.8, trendMult: 0.5, momentumDecay: 0.9, volumeMult: 0.9 },
  { startMinute: 136, endMinute: 181, name: '主力发力', volatilityMult: 1.5, trendMult: 0.7, momentumDecay: 0.85, volumeMult: 1.5 },
  { startMinute: 181, endMinute: 211, name: '散户跟风', volatilityMult: 1.3, trendMult: 0.4, momentumDecay: 0.75, volumeMult: 1.3 },
  { startMinute: 211, endMinute: 240, name: '尾盘疯狂', volatilityMult: 2.0, trendMult: 0.8, momentumDecay: 0.6, volumeMult: 2.5 },
];

const ALL_SEGMENTS = [...AM_SEGMENTS, ...PM_SEGMENTS];

function getSegment(minute: number): SessionSegment {
  return ALL_SEGMENTS.find(s => minute >= s.startMinute && minute < s.endMinute)
    || ALL_SEGMENTS[ALL_SEGMENTS.length - 1];
}

/** 分钟数转时间字符串 */
export function minuteToTimeLabel(minute: number): string {
  if (minute <= 120) {
    // 上午盘: 0→09:30, 120→11:30
    const totalMins = 9 * 60 + 30 + minute;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  } else {
    // 下午盘: 121→13:00, 240→15:00 (午休120→121跳跃)
    const pmMinute = minute - 121;
    const totalMins = 13 * 60 + pmMinute;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}

/** 总tick数: 上午120分钟 + 下午120分钟 = 240 ticks */
export const TOTAL_TICKS = 241; // 0~240 inclusive
export const AM_END_TICK = 120;
export const PM_START_TICK = 121;

/**
 * 预生成一整天的分时数据
 *
 * @param prevClose 昨收价
 * @param dayTrend 当天趋势段
 * @param eventModifier 事件影响系数
 * @returns 241个tick的分时数据
 */
export function generateIntradayTicks(
  prevClose: number,
  dayTrend: TrendSegment,
  eventModifier: number = 0,
): IntradayTick[] {
  const ticks: IntradayTick[] = [];
  const upperLimit = prevClose * 1.1;
  const lowerLimit = prevClose * 0.9;

  // 当日方向由趋势+事件决定
  const dayDirection = dayTrend.dailyBias + eventModifier;

  // 开盘价: 小幅跳空
  const gapPercent = (Math.random() - 0.5) * 0.015 + eventModifier * 0.2;
  let price = prevClose * (1 + gapPercent);
  price = clamp(price, lowerLimit, upperLimit);

  let momentum = 0;
  let cumVolume = 0;

  // 预计算目标收盘偏移，用于引导价格走向
  const targetCloseChange = dayDirection + (Math.random() - 0.5) * dayTrend.volatility * 0.5;
  const targetClose = clamp(prevClose * (1 + targetCloseChange), lowerLimit, upperLimit);

  for (let minute = 0; minute <= 240; minute++) {
    // 跳过午休 (tick 120→121 是不连续的)
    const seg = getSegment(minute);

    // 趋向目标收盘的引力（越接近收盘越强）
    const progress = minute / 240;
    const gravityStrength = progress * progress * 0.002; // 越到尾盘引力越强
    const gravity = (targetClose - price) * gravityStrength;

    // 随机波动
    const baseVol = dayTrend.volatility * 0.003; // 每分钟基础波动
    const noise = (Math.random() - 0.5) * 2 * baseVol * seg.volatilityMult;

    // 趋势跟随
    const trendPush = dayDirection * 0.0002 * seg.trendMult;

    // 动量
    momentum = momentum * seg.momentumDecay + noise * 0.3;

    // 综合
    const change = gravity + noise + trendPush + momentum;
    price = price * (1 + change);
    price = clamp(price, lowerLimit, upperLimit);

    // 模拟成交量
    const baseVolume = 50000 + Math.random() * 30000;
    cumVolume += baseVolume * seg.volumeMult * (1 + Math.abs(change) * 100);

    ticks.push({
      minute,
      price: round2(price),
      volume: Math.round(cumVolume),
      timeLabel: minuteToTimeLabel(minute),
    });
  }

  return ticks;
}

/** 从分时数据中提取日K数据 */
export function intradayToOHLC(ticks: IntradayTick[]): {
  open: number;
  close: number;
  high: number;
  low: number;
} {
  if (ticks.length === 0) {
    return { open: 0, close: 0, high: 0, low: 0 };
  }
  const prices = ticks.map(t => t.price);
  return {
    open: ticks[0].price,
    close: ticks[ticks.length - 1].price,
    high: Math.max(...prices),
    low: Math.min(...prices),
  };
}

/** 从分时数据截取到某分钟的OHLC */
export function partialOHLC(ticks: IntradayTick[], upToMinute: number): {
  open: number;
  close: number;
  high: number;
  low: number;
} {
  const partial = ticks.filter(t => t.minute <= upToMinute);
  return intradayToOHLC(partial);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
