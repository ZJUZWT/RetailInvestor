import type { TrendSegment } from '../types';

/**
 * 盘中分时模拟器（增强版）
 *
 * 模拟A股分时走势，不同时段有不同的波动特征：
 * - 开盘博弈期(09:30-09:45): 波动大，有明显方向性脉冲
 * - 上午主力试盘(09:45-10:30): 方向逐渐明朗
 * - 获利盘回吐(10:30-11:00): 可能回调
 * - 午盘前定调(11:00-11:30): 趋于平稳
 * - 午后惯性(13:00-13:15): 延续上午尾盘
 * - 下午主战场(13:15-14:00): 大资金发力
 * - 散户跟风(14:00-14:30): 散户跟风
 * - 尾盘抢筹/出逃(14:30-15:00): 恐慌/FOMO加速
 */

// ============================================================
// 工具函数
// ============================================================

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

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

/** 肥尾分布：90% 正常 + 10% 重尾 */
function fatTailRandom(): number {
  if (Math.random() < 0.10) {
    return randNormal() * 2.5;
  }
  return randNormal();
}

// ============================================================
// 类型定义
// ============================================================

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
  volatilityMult: number;
  trendMult: number;
  momentumDecay: number;
  volumeMult: number;
}

// ============================================================
// 时段配置（增强版参数）
// ============================================================

/** 上午盘时段 (分钟0-120 = 09:30-11:30) */
const AM_SEGMENTS: SessionSegment[] = [
  { startMinute: 0, endMinute: 15, name: '开盘博弈', volatilityMult: 3.5, trendMult: 0.5, momentumDecay: 0.75, volumeMult: 2.5 },
  { startMinute: 15, endMinute: 60, name: '主力试盘', volatilityMult: 1.5, trendMult: 0.7, momentumDecay: 0.88, volumeMult: 1.4 },
  { startMinute: 60, endMinute: 90, name: '获利回吐', volatilityMult: 1.2, trendMult: -0.4, momentumDecay: 0.65, volumeMult: 0.9 },
  { startMinute: 90, endMinute: 120, name: '午盘定调', volatilityMult: 0.8, trendMult: 0.2, momentumDecay: 0.93, volumeMult: 0.6 },
];

/** 下午盘时段 (分钟121-240 = 13:00-15:00) */
const PM_SEGMENTS: SessionSegment[] = [
  { startMinute: 121, endMinute: 136, name: '午后惯性', volatilityMult: 1.0, trendMult: 0.5, momentumDecay: 0.88, volumeMult: 1.0 },
  { startMinute: 136, endMinute: 181, name: '主力发力', volatilityMult: 1.8, trendMult: 0.8, momentumDecay: 0.82, volumeMult: 1.8 },
  { startMinute: 181, endMinute: 211, name: '散户跟风', volatilityMult: 1.5, trendMult: 0.5, momentumDecay: 0.70, volumeMult: 1.5 },
  { startMinute: 211, endMinute: 240, name: '尾盘疯狂', volatilityMult: 3.0, trendMult: 1.0, momentumDecay: 0.50, volumeMult: 3.0 },
];

const ALL_SEGMENTS = [...AM_SEGMENTS, ...PM_SEGMENTS];

function getSegment(minute: number): SessionSegment {
  return ALL_SEGMENTS.find(s => minute >= s.startMinute && minute < s.endMinute)
    || ALL_SEGMENTS[ALL_SEGMENTS.length - 1];
}

// ============================================================
// 时间标签
// ============================================================

/** 分钟数转时间字符串 */
export function minuteToTimeLabel(minute: number): string {
  if (minute <= 120) {
    const totalMins = 9 * 60 + 30 + minute;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  } else {
    const pmMinute = minute - 121;
    const totalMins = 13 * 60 + pmMinute;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}

// ============================================================
// 常量
// ============================================================

/** 总tick数: 上午120分钟 + 下午120分钟 = 240 ticks */
export const TOTAL_TICKS = 241; // 0~240 inclusive
export const AM_END_TICK = 120;
export const PM_START_TICK = 121;

// ============================================================
// 盘中突发事件
// ============================================================

interface IntradayShock {
  minute: number;      // 冲击发生时刻
  magnitude: number;   // 冲击幅度（正=拉升，负=跳水）
  duration: number;    // 持续tick数
}

/** 随机生成盘中突发冲击（~15%概率） */
function rollIntradayShocks(): IntradayShock[] {
  const shocks: IntradayShock[] = [];
  if (Math.random() < 0.15) {
    const minute = 10 + Math.floor(Math.random() * 220); // 避开开头和最尾
    const direction = Math.random() < 0.5 ? 1 : -1;
    const magnitude = direction * (0.008 + Math.random() * 0.015); // 0.8%-2.3%的冲击
    shocks.push({ minute, magnitude, duration: 3 + Math.floor(Math.random() * 8) });
  }
  // 小概率第二个冲击
  if (Math.random() < 0.05) {
    const minute = 10 + Math.floor(Math.random() * 220);
    const direction = Math.random() < 0.5 ? 1 : -1;
    const magnitude = direction * (0.005 + Math.random() * 0.01);
    shocks.push({ minute, magnitude, duration: 3 + Math.floor(Math.random() * 5) });
  }
  return shocks;
}

/** 获取当前tick的冲击影响 */
function getShockEffect(minute: number, shocks: IntradayShock[]): number {
  let effect = 0;
  for (const shock of shocks) {
    if (minute >= shock.minute && minute < shock.minute + shock.duration) {
      // 冲击强度在持续期间递减
      const progress = (minute - shock.minute) / shock.duration;
      effect += shock.magnitude * (1 - progress * 0.5); // 衰减到50%
    }
  }
  return effect;
}

// ============================================================
// 分时数据生成（增强版）
// ============================================================

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

  // 开盘价: 增大跳空幅度
  const gapPercent = fatTailRandom() * 0.015 + eventModifier * 0.25;
  let price = prevClose * (1 + gapPercent);
  price = clamp(price, lowerLimit, upperLimit);

  let momentum = 0;
  let cumVolume = 0;

  // 预计算目标收盘偏移
  const targetCloseChange = dayDirection + fatTailRandom() * dayTrend.volatility * 0.6;
  const targetClose = clamp(prevClose * (1 + targetCloseChange), lowerLimit, upperLimit);

  // 盘中突发冲击
  const shocks = rollIntradayShocks();

  // 开盘方向性脉冲（前8个tick有额外方向推力）
  const openBurstDirection = dayDirection + fatTailRandom() * 0.01;
  const openBurstStrength = 0.001 + Math.random() * 0.002; // 每tick 0.1%-0.3%

  // 追踪日内极值，用于尾盘恐慌/FOMO
  let dayHigh = price;
  let dayLow = price;

  for (let minute = 0; minute <= 240; minute++) {
    const seg = getSegment(minute);

    // --- 趋向目标收盘的引力 ---
    const progress = minute / 240;
    const gravityStrength = progress * progress * 0.003; // 增强引力
    const gravity = (targetClose - price) * gravityStrength;

    // --- 随机波动（肥尾） ---
    const baseVol = dayTrend.volatility * 0.006; // 翻倍基础tick波动
    const noise = fatTailRandom() * baseVol * seg.volatilityMult;

    // --- 趋势跟随 ---
    const trendPush = dayDirection * 0.0005 * seg.trendMult; // 增强趋势推力

    // --- 动量 ---
    momentum = momentum * seg.momentumDecay + noise * 0.35;

    // --- 开盘方向脉冲 ---
    let openBurst = 0;
    if (minute < 8) {
      const burstDecay = 1 - minute / 8;
      openBurst = openBurstDirection > 0
        ? openBurstStrength * burstDecay
        : -openBurstStrength * burstDecay;
    }

    // --- 盘中突发冲击 ---
    const shockEffect = getShockEffect(minute, shocks);

    // --- 尾盘恐慌/FOMO加速 ---
    let latePanic = 0;
    if (minute >= 220) {
      const changeFromPrevClose = (price - prevClose) / prevClose;
      const absChange = Math.abs(changeFromPrevClose);
      // 如果涨跌幅已经较大（>5%），尾盘波动加速
      if (absChange > 0.05) {
        const panicMult = (absChange - 0.05) * 8; // 越极端越恐慌
        latePanic = fatTailRandom() * 0.002 * panicMult;
        // 偏向当前方向（FOMO追涨杀跌）但有反转可能
        if (Math.random() < 0.7) {
          latePanic = Math.abs(latePanic) * Math.sign(changeFromPrevClose);
        }
      }
    }

    // --- 综合 ---
    const change = gravity + noise + trendPush + momentum + openBurst + shockEffect + latePanic;
    price = price * (1 + change);
    price = clamp(price, lowerLimit, upperLimit);

    // 更新日内极值
    dayHigh = Math.max(dayHigh, price);
    dayLow = Math.min(dayLow, price);

    // --- 模拟成交量 ---
    const baseVolume = 50000 + Math.random() * 30000;
    const shockVolBoost = shockEffect !== 0 ? 3.0 : 1.0;
    cumVolume += baseVolume * seg.volumeMult * (1 + Math.abs(change) * 150) * shockVolBoost;

    ticks.push({
      minute,
      price: round2(price),
      volume: Math.round(cumVolume),
      timeLabel: minuteToTimeLabel(minute),
    });
  }

  return ticks;
}

// ============================================================
// OHLC 提取
// ============================================================

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
