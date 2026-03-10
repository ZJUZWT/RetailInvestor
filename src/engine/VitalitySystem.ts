/**
 * 生命体征系统 - 精力/饥饿/SAN值计算引擎
 */

// === 类型定义 ===

export interface VitalityState {
  /** 精力值 0-100 */
  energy: number;
  maxEnergy: number;
  /** 饱腹值 0-100 */
  hunger: number;
  maxHunger: number;
  /** SAN值 0-100 */
  sanity: number;
  maxSanity: number;
  /** 是否正在睡觉 */
  isSleeping: boolean;
  /** 睡觉开始时的游戏总分钟数 */
  sleepStartMinute: number;
  /** 计划睡觉时长(小时) */
  sleepHours: number;
  /** 累计不睡觉小时数 */
  hoursWithoutSleep: number;
  /** 累计不吃东西小时数 */
  hoursWithoutFood: number;
  /** SAN失控状态 */
  isInsane: boolean;
}

export type DeathCause = 'bankruptcy' | 'starved' | 'exhaustion' | 'insanity';

export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  hungerRestore: number;
  sanityRestore: number;
  description: string;
}

// === 初始状态 ===

export function createInitialVitality(): VitalityState {
  return {
    energy: 100,
    maxEnergy: 100,
    hunger: 80,
    maxHunger: 100,
    sanity: 100,
    maxSanity: 100,
    isSleeping: false,
    sleepStartMinute: 0,
    sleepHours: 0,
    hoursWithoutSleep: 0,
    hoursWithoutFood: 0,
    isInsane: false,
  };
}

// === 食物数据 ===

export const FOODS: FoodItem[] = [
  { id: 'instant_noodle', name: '方便面', emoji: '🍜', cost: 8, hungerRestore: 25, sanityRestore: 0, description: '便宜管饱，散户标配' },
  { id: 'snack', name: '零食', emoji: '🍪', cost: 15, hungerRestore: 15, sanityRestore: 1, description: '垫垫肚子，聊胜于无' },
  { id: 'takeout', name: '外卖', emoji: '🥡', cost: 30, hungerRestore: 50, sanityRestore: 2, description: '打工人的续命神器' },
  { id: 'restaurant', name: '下馆子', emoji: '🍽️', cost: 80, hungerRestore: 75, sanityRestore: 8, description: '好好吃一顿，心情也好了' },
];

// === 每tick属性更新 ===

export interface VitalityTickContext {
  /** 是否在睡觉 */
  isSleeping: boolean;
  /** 持仓涨跌幅百分比(如 -5.0 表示亏5%) */
  holdingChangePercent: number;
  /** 是否在看盘(交易时段) */
  isWatching: boolean;
  /** 实际睡了多久(小时) - 用于计算恢复 */
  sleepElapsedHours: number;
}

/**
 * 计算一次时间推进的属性变化
 * @param state 当前生命体征
 * @param minutesElapsed 流逝的游戏分钟数
 * @param ctx 上下文
 * @returns 需要更新的属性字段
 */
export function tickVitality(
  state: VitalityState,
  minutesElapsed: number,
  ctx: VitalityTickContext,
): Partial<VitalityState> {
  const updates: Partial<VitalityState> = {};
  const hours = minutesElapsed / 60;

  // ---- 精力 ----
  if (ctx.isSleeping) {
    // 睡觉恢复精力：非线性（越多越好）
    // 公式: 总恢复 = 12 * totalSleepHours^1.3
    // 增量式：当前恢复 = f(累计)-f(累计-delta)
    const totalSlept = ctx.sleepElapsedHours;
    const prevSlept = Math.max(0, totalSlept - hours);
    const recoveryNow = sleepRecoveryFunc(totalSlept) - sleepRecoveryFunc(prevSlept);
    updates.energy = Math.min(state.maxEnergy, state.energy + recoveryNow);
    // 睡觉时不累积不睡觉时间
    updates.hoursWithoutSleep = 0;
  } else {
    // 清醒时精力下降：每小时约4点
    const drain = 4 * hours;
    updates.energy = Math.max(0, state.energy - drain);
    updates.hoursWithoutSleep = state.hoursWithoutSleep + hours;
  }

  // ---- 饥饿 ----
  // 无论睡不睡都会饿：每小时约4.5点（约22小时不吃会饿死）
  const hungerDrain = 4.5 * hours;
  updates.hunger = Math.max(0, state.hunger - hungerDrain);
  if ((updates.hunger ?? state.hunger) <= 0) {
    updates.hoursWithoutFood = state.hoursWithoutFood + hours;
  } else {
    // 有饱腹值就重置计时
    updates.hoursWithoutFood = 0;
  }

  // ---- SAN值 ----
  let sanDelta = 0;

  // 基础自然恢复：每小时+0.3（很慢）
  sanDelta += 0.3 * hours;

  // 睡觉恢复：每小时+2.5
  if (ctx.isSleeping) sanDelta += 2.5 * hours;

  // 亏损影响SAN（超过3%才有影响）
  if (ctx.holdingChangePercent < -3) {
    const lossSeverity = Math.abs(ctx.holdingChangePercent + 3) / 7; // 归一化到0~1
    const watchingMult = ctx.isWatching ? 2.5 : 0.5; // 看盘时影响更大
    sanDelta -= lossSeverity * watchingMult * hours * 3;
  }

  // 赚钱微恢复SAN（超过3%）
  if (ctx.holdingChangePercent > 3) {
    const gainBenefit = Math.min(1, (ctx.holdingChangePercent - 3) / 7);
    sanDelta += gainBenefit * 1.0 * hours;
  }

  // 极度疲劳降SAN
  if ((updates.energy ?? state.energy) < 20) {
    sanDelta -= 1.5 * hours;
  }

  // 极度饥饿降SAN
  if ((updates.hunger ?? state.hunger) < 20) {
    sanDelta -= 1.5 * hours;
  }

  updates.sanity = Math.max(0, Math.min(state.maxSanity, state.sanity + sanDelta));

  // SAN失控判定：<20进入失控，>30恢复正常
  const currentSan = updates.sanity ?? state.sanity;
  if (currentSan < 20 && !state.isInsane) {
    updates.isInsane = true;
  } else if (currentSan > 30 && state.isInsane) {
    updates.isInsane = false;
  }

  return updates;
}

// === 睡眠恢复函数 ===

/** 睡觉总恢复量（非线性，边际收益递增）
 *  sleepRecoveryFunc(h) = 12 * h^1.3
 *  2h → ~29, 4h → ~71, 6h → ~112(cap100), 8h → ~158(cap100)
 */
function sleepRecoveryFunc(hours: number): number {
  if (hours <= 0) return 0;
  return 12 * Math.pow(hours, 1.3);
}

/** 预计睡X小时总共恢复多少精力 */
export function calculateSleepRecovery(hours: number): number {
  return Math.min(100, Math.round(sleepRecoveryFunc(hours)));
}

// === 死亡检查 ===

export function checkDeath(vitality: VitalityState): DeathCause | null {
  // 精力归零 + 超过1小时没睡 → 猝死
  if (vitality.energy <= 0 && vitality.hoursWithoutSleep > 1) return 'exhaustion';
  // 饱腹归零 + 超过2小时没吃 → 饿死
  if (vitality.hunger <= 0 && vitality.hoursWithoutFood > 2) return 'starved';
  // SAN=0 + 失控状态 → 精神崩溃
  if (vitality.sanity <= 0 && vitality.isInsane) return 'insanity';
  return null;
}

// === SAN失控效果 ===

export function insanityCheck(): { blocked: boolean; message: string } | null {
  // 30%概率触发失控效果
  if (Math.random() < 0.3) {
    const effects = [
      { blocked: true, message: '😵 你的手在发抖，点不准交易按钮...' },
      { blocked: true, message: '🤯 脑子一片空白，忘了要做什么' },
      { blocked: false, message: '😰 极度焦虑，但还是勉强完成了操作' },
      { blocked: true, message: '😱 看到K线就恶心，暂时无法交易' },
      { blocked: false, message: '🥴 恍恍惚惚地操作了一下，希望没按错' },
    ];
    return effects[Math.floor(Math.random() * effects.length)];
  }
  return null;
}
