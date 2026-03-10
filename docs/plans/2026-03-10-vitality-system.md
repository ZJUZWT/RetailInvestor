# 精力/饥饿/SAN值系统 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将游戏从"天为回合制"改造为"时间连续流动 + 角色属性管理"模式，增加精力、饥饿、SAN值三大属性系统，让玩家自主管理角色生存状态。

**Architecture:** 保留现有分时图实时播放核心，取消"进入下一天"的硬切换。时间连续流动（跨越多天），玩家通过睡觉/吃饭/行动消耗和恢复三大属性。睡觉时暂停玩家操作但时间加速流过。引入日历系统标注交易日/休市日。新增死亡条件：精力归零（猝死）、饥饿归零（饿死）、SAN值归零（先失控再崩溃）。

**Tech Stack:** React 18 + TypeScript + Zustand + lightweight-charts + Tailwind CSS

---

## 整体改造概览

### 现有系统（回合制）
```
晨报 → 上午盘(实时) → 午休 → 下午盘(实时) → 盘后活动 → 结算 → [手动]下一天
```

### 新系统（连续时间流）
```
时间一直流动（可调速/暂停）
├── 交易日: 09:30开盘 → 11:30午休 → 13:00下午盘 → 15:00收盘 → 盘后自由时间 → 夜间
├── 非交易日(周末): 全天自由时间
├── 玩家随时可以: 吃饭/睡觉/做活动/交易(盘中)
└── 属性持续变化: 精力↓ 饱腹↓ SAN受行情影响
```

### 核心改动范围

| 模块 | 改动程度 | 说明 |
|------|---------|------|
| `types/index.ts` | **大改** | 新增三属性、日历、GamePhase重构 |
| `stores/gameStore.ts` | **大改** | 时间连续流动、属性衰减、睡觉机制 |
| `components/StatusBar.tsx` | **中改** | 显示三属性条 + 日历日期 |
| `components/LunchBreak.tsx` | **小改** | 去掉体力消耗，改为自动过渡 |
| `components/ActivityPanel.tsx` | **中改** | 改为随时可用（非仅盘后） |
| `components/Settlement.tsx` | **重构** | 取消日结算，改为持续状态面板 |
| `engine/VitalitySystem.ts` | **新建** | 精力/饥饿/SAN计算引擎 |
| `engine/CalendarSystem.ts` | **新建** | 日历与交易日判断 |
| `components/PlayerActions.tsx` | **新建** | 吃饭/睡觉操作面板 |
| `components/Calendar.tsx` | **新建** | 日历显示组件 |
| `components/SleepOverlay.tsx` | **新建** | 睡觉时的加速播放界面 |

---

## Task 1: Bug修复 - 午市消息不消耗体力

**Files:**
- Modify: `src/stores/gameStore.ts:291-296` (tickForward中进入午休时的stamina扣减)
- Modify: `src/components/LunchBreak.tsx:79` (去掉"消耗1点体力"提示文字)

**Step 1: 修复 gameStore.ts 中午休扣体力逻辑**

在 `tickForward` 方法中，进入 `lunch_break` 时有 `stamina: state.stamina - 1`，需要移除这个扣减：

```typescript
// gameStore.ts tickForward 中进入午休的 set({...})
set({
  phase: 'lunch_break',
  currentTick: AM_END_TICK,
  currentPrice: amClosePrice,
  amClose: amClosePrice,
  // 删除: stamina: state.stamina - 1,
  chartView: 'intraday',
  lunchHint: { direction: hintDirection, reliable: isReliable },
  messages: [...],
  intradayNewsSchedule: [],
});
```

**Step 2: 修复 LunchBreak.tsx 提示文字**

删除第79行的 `<p className="text-xs text-gray-600 mb-3">⚡ 消耗1点体力浏览午间消息</p>`

---

## Task 2: 分时图交易点位标记 (B/S/T)

**Files:**
- Modify: `src/types/index.ts` (新增 TradeMarker 类型)
- Modify: `src/stores/gameStore.ts` (新增 tradeMarkers 状态，buy/sell 中记录)
- Modify: `src/components/KLineChart.tsx` (在分时线上绘制标记)

**Step 1: 新增类型**

在 `types/index.ts` 中添加：
```typescript
export interface TradeMarker {
  tick: number;
  price: number;
  type: 'B' | 'S';
  shares: number;
}
```

**Step 2: Store 新增 tradeMarkers 状态**

在 `StoreState` 中新增 `tradeMarkers: TradeMarker[]`，初始为 `[]`。

在 `buy` action 中 push `{ tick: state.currentTick, price: state.currentPrice, type: 'B', shares }`。

在 `sell` action 中 push `{ tick: state.currentTick, price: state.currentPrice, type: 'S', shares }`。

每天开盘时(`advancePhase` → `morning_news` → `am_trading`)清空 `tradeMarkers`。

**Step 3: KLineChart 绘制标记**

在分时图 series 创建后，使用 `setMarkers()` API：
```typescript
if (chartView === 'intraday' && tradeMarkers.length > 0) {
  const markers = tradeMarkers
    .filter(m => m.tick <= currentTick)
    .map(m => ({
      time: m.tick as unknown as UTCTimestamp,
      position: m.type === 'B' ? 'belowBar' as const : 'aboveBar' as const,
      color: m.type === 'B' ? '#ef4444' : '#22c55e',
      shape: m.type === 'B' ? 'arrowUp' as const : 'arrowDown' as const,
      text: `${m.type} ${m.shares}`,
    }));
  (seriesRef.current as ISeriesApi<'Line'>).setMarkers(markers);
}
```

---

## Task 3: 分时图右侧价格轴涨跌百分比

**Files:**
- Modify: `src/components/KLineChart.tsx` (分时图 series 的 priceFormat)

**Step 1: 自定义 priceFormatter**

在分时线 series 创建时添加 `priceFormat`：
```typescript
const series = chart.addSeries(LineSeries, {
  color: '#ffffff',
  lineWidth: 2,
  priceFormat: {
    type: 'custom',
    formatter: (price: number) => {
      const pct = ((price - todayOpen) / todayOpen * 100);
      const sign = pct >= 0 ? '+' : '';
      return `${price.toFixed(2)}  ${sign}${pct.toFixed(2)}%`;
    },
  },
  // ...其他选项
});
```

---

## Task 4: 精力/饥饿/SAN值 - 类型系统重构

**Files:**
- Modify: `src/types/index.ts` (新增属性类型、重构 GamePhase、新增日历类型)
- Create: `src/engine/VitalitySystem.ts` (属性计算引擎)
- Create: `src/engine/CalendarSystem.ts` (日历系统)

**Step 1: 重构 types/index.ts**

```typescript
// === 时间系统 ===
export interface GameCalendar {
  /** 游戏内日期 (从2026-01-05周一开始) */
  date: string;        // "2026-01-05" 格式
  dayOfWeek: number;   // 0=周日, 1=周一, ..., 6=周六
  /** 当天的分钟数 (0-1439, 0=00:00, 570=09:30, 900=15:00) */
  minuteOfDay: number;
  /** 是否交易日 */
  isTradingDay: boolean;
}

// === 角色属性 ===
export interface VitalityState {
  /** 精力值 0-100, 归零=猝死 */
  energy: number;
  maxEnergy: number;
  /** 饱腹值 0-100, 归零=饿死 */
  hunger: number;
  maxHunger: number;
  /** SAN值 0-100, <20失控, 归零=精神崩溃 */
  sanity: number;
  maxSanity: number;
  /** 是否正在睡觉 */
  isSleeping: boolean;
  /** 睡觉开始时间(minuteOfDay) */
  sleepStartMinute: number;
  /** 计划睡觉时长(小时) */
  sleepHours: number;
  /** 累计不睡觉小时数 */
  hoursWithoutSleep: number;
  /** 累计不吃东西小时数 */
  hoursWithoutFood: number;
  /** SAN值失控中 */
  isInsane: boolean;
}

// === 食物系统 (v1简单版) ===
export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  hungerRestore: number;
  description: string;
}

// === 死亡原因 ===
export type DeathCause = 'bankruptcy' | 'starved' | 'exhaustion' | 'insanity';

// GamePhase 重构 - 不再是固定6阶段，而是交易状态
export type MarketPhase =
  | 'pre_market'    // 盘前 (09:00-09:30)
  | 'am_trading'    // 上午交易 (09:30-11:30)
  | 'lunch_break'   // 午休 (11:30-13:00)
  | 'pm_trading'    // 下午交易 (13:00-15:00)
  | 'after_hours'   // 盘后 (15:00-次日09:00)
  | 'closed';       // 休市日全天
```

**Step 2: 创建 VitalitySystem.ts**

```typescript
// src/engine/VitalitySystem.ts

import type { VitalityState } from '../types';

/** 每游戏分钟的属性衰减（每tick调用一次） */
export function tickVitality(
  state: VitalityState,
  minutesElapsed: number,  // 流逝的分钟数
  context: {
    isSleeping: boolean;
    stockChangePercent: number;  // 当前持仓涨跌幅，影响SAN
    isWatching: boolean;  // 是否在看盘（看盘时SAN影响更大）
  },
): Partial<VitalityState> {
  const updates: Partial<VitalityState> = {};
  const hours = minutesElapsed / 60;

  // --- 精力衰减 ---
  if (context.isSleeping) {
    // 睡觉恢复精力：边际收益递增
    // 睡1h恢复5, 睡4h恢复30, 睡6h恢复55, 睡8h恢复90
    // 公式：recovery = 0.8 * hours^1.6 (每小时)
    // 这里按分钟算增量
    const recoveryPerMin = (0.8 * Math.pow(state.sleepHours, 0.6)) / 60;
    updates.energy = Math.min(state.maxEnergy, state.energy + recoveryPerMin * minutesElapsed);
  } else {
    // 清醒时精力下降：每小时约4点
    const drain = 4 * hours;
    updates.energy = Math.max(0, state.energy - drain);
    updates.hoursWithoutSleep = state.hoursWithoutSleep + hours;
  }

  // --- 饥饿衰减 ---
  // 无论睡不睡都会饿，每小时约5点
  const hungerDrain = 5 * hours;
  updates.hunger = Math.max(0, state.hunger - hungerDrain);
  if (updates.hunger !== undefined && updates.hunger < state.hunger) {
    updates.hoursWithoutFood = state.hoursWithoutFood + hours;
  }

  // --- SAN值 ---
  let sanDelta = 0;
  // 基础自然恢复（很慢）：每小时+0.5
  sanDelta += 0.5 * hours;
  // 睡觉恢复：每小时+2
  if (context.isSleeping) sanDelta += 2 * hours;

  // 亏损影响SAN
  if (context.stockChangePercent < -3) {
    const lossSeverity = Math.abs(context.stockChangePercent + 3) / 7; // 0~1
    const watching = context.isWatching ? 2.0 : 0.5; // 看盘时影响翻倍
    sanDelta -= lossSeverity * watching * hours * 3;
  }
  // 赚钱恢复SAN
  if (context.stockChangePercent > 3) {
    sanDelta += 0.5 * hours;
  }

  // 极度疲劳降SAN
  if (state.energy < 20) sanDelta -= 1 * hours;
  // 极度饥饿降SAN
  if ((updates.hunger ?? state.hunger) < 20) sanDelta -= 1 * hours;

  updates.sanity = Math.max(0, Math.min(state.maxSanity, state.sanity + sanDelta));

  // SAN失控判定
  if ((updates.sanity ?? state.sanity) < 20) {
    updates.isInsane = true;
  } else if ((updates.sanity ?? state.sanity) > 30) {
    updates.isInsane = false;
  }

  return updates;
}

/** 睡觉精力恢复总量（非线性，越多越好） */
export function calculateSleepRecovery(hours: number): number {
  // 公式：recovery = 12 * hours^1.3
  // 2h → 30, 4h → 60, 6h → 90, 8h → 100+
  return Math.min(100, Math.round(12 * Math.pow(hours, 1.3)));
}

/** 吃饭恢复饥饿值 */
export function calculateFoodRecovery(foodHungerRestore: number): number {
  return foodHungerRestore;
}

/** 检查死亡条件 */
export function checkDeath(vitality: VitalityState): DeathCause | null {
  if (vitality.energy <= 0 && vitality.hoursWithoutSleep > 2) return 'exhaustion';
  if (vitality.hunger <= 0 && vitality.hoursWithoutFood > 2) return 'starved';
  if (vitality.sanity <= 0 && vitality.isInsane) return 'insanity';
  return null;
}

/** SAN失控效果：返回是否阻止本次交易操作 */
export function insanityCheck(): { blocked: boolean; message: string } | null {
  if (Math.random() < 0.3) {
    const effects = [
      { blocked: true, message: '😵 你的手在发抖，无法点击交易按钮...' },
      { blocked: true, message: '🤯 脑子一片空白，忘记了要干什么' },
      { blocked: false, message: '😰 你感到极度焦虑，但还是完成了操作' },
      { blocked: true, message: '😱 看到K线就恶心，暂时无法交易' },
    ];
    return effects[Math.floor(Math.random() * effects.length)];
  }
  return null;
}
```

**Step 3: 创建 CalendarSystem.ts**

```typescript
// src/engine/CalendarSystem.ts

import type { GameCalendar } from '../types';

/** 游戏起始日期 */
const GAME_START_DATE = new Date('2026-01-05'); // 周一

/** 从游戏总分钟数计算日历 */
export function getCalendar(totalGameMinutes: number): GameCalendar {
  const totalDays = Math.floor(totalGameMinutes / 1440); // 1440分钟/天
  const minuteOfDay = totalGameMinutes % 1440;

  const date = new Date(GAME_START_DATE);
  date.setDate(date.getDate() + totalDays);

  const dayOfWeek = date.getDay();
  const isTradingDay = dayOfWeek >= 1 && dayOfWeek <= 5; // 周一到周五

  const dateStr = date.toISOString().slice(0, 10);

  return { date: dateStr, dayOfWeek, minuteOfDay, isTradingDay };
}

/** 获取星期几中文 */
export function getDayOfWeekLabel(dayOfWeek: number): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek];
}

/** 分钟数转时间字符串 */
export function minuteToTimeStr(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** 判断当前市场阶段 */
export function getMarketPhase(calendar: GameCalendar): 'pre_market' | 'am_trading' | 'lunch_break' | 'pm_trading' | 'after_hours' | 'closed' {
  if (!calendar.isTradingDay) return 'closed';

  const min = calendar.minuteOfDay;
  if (min >= 540 && min < 570) return 'pre_market';      // 09:00-09:30
  if (min >= 570 && min < 690) return 'am_trading';       // 09:30-11:30
  if (min >= 690 && min < 780) return 'lunch_break';      // 11:30-13:00
  if (min >= 780 && min < 900) return 'pm_trading';       // 13:00-15:00
  return 'after_hours';                                    // 其他时间
}

/** 获取本周日历（用于简单日历显示） */
export function getWeekCalendar(currentDate: string): {
  date: string;
  dayOfWeek: number;
  label: string;
  isTradingDay: boolean;
  isToday: boolean;
}[] {
  const current = new Date(currentDate);
  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - current.getDay() + 1); // 周一

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    week.push({
      date: dateStr,
      dayOfWeek: dow,
      label: getDayOfWeekLabel(dow),
      isTradingDay: dow >= 1 && dow <= 5,
      isToday: dateStr === currentDate,
    });
  }
  return week;
}

/** 食物数据 (v1简单版) */
export const FOODS = [
  { id: 'instant_noodle', name: '方便面', emoji: '🍜', cost: 8, hungerRestore: 25, description: '便宜管饱，但不太健康' },
  { id: 'takeout', name: '外卖', emoji: '🥡', cost: 30, hungerRestore: 50, description: '普通外卖，还行吧' },
  { id: 'restaurant', name: '下馆子', emoji: '🍽️', cost: 80, hungerRestore: 75, description: '好好吃一顿，心情也好点 (SAN+5)' },
  { id: 'snack', name: '零食', emoji: '🍪', cost: 15, hungerRestore: 15, description: '垫垫肚子' },
];
```

---

## Task 5: Store 大重构 - 连续时间流动

**Files:**
- Modify: `src/stores/gameStore.ts` (核心重构)

这是最大的改动。核心变化：

1. **取消 `day` 和 `phase` 的硬切换**，改为 `totalGameMinutes` 驱动一切
2. **tickForward** 改为推进游戏分钟（而不是分时图分钟），每tick推进 N 个游戏分钟（取决于速度和是否在交易时段）
3. **新增睡觉/吃饭 action**
4. **属性持续衰减** 在每个tick中计算
5. **日切换自动处理**：当时间推进到新一天09:30且是交易日时，自动生成新的分时数据

关键新增状态：
```typescript
// 新增到 StoreState
totalGameMinutes: number;    // 游戏总分钟数（核心时钟）
calendar: GameCalendar;       // 当前日历
vitality: VitalityState;      // 角色属性
marketPhase: MarketPhase;     // 当前市场阶段
deathCause: DeathCause | null;
```

关键新增 Action：
```typescript
eat: (foodId: string) => void;
sleep: (hours: number) => void;  // 开始睡觉
wakeUp: () => void;              // 手动醒来
```

时间流逝的核心逻辑：
```
每个 tick:
  1. 推进 totalGameMinutes += speed 对应的分钟数
  2. 计算新的 calendar 和 marketPhase
  3. 如果是交易时段且有分时数据 → 同步推进分时图
  4. 如果进入新交易日 → 自动生成新的分时数据 + 事件
  5. 更新属性衰减（精力、饥饿、SAN）
  6. 检查死亡条件
  7. 如果在睡觉 → 检查是否该醒来
```

---

## Task 6: UI改造 - 状态栏、日历、操作面板

**Files:**
- Modify: `src/components/StatusBar.tsx` (三属性显示 + 日期)
- Create: `src/components/Calendar.tsx` (简单日历)
- Create: `src/components/PlayerActions.tsx` (吃饭/睡觉面板)
- Create: `src/components/SleepOverlay.tsx` (睡觉加速播放覆盖层)
- Modify: `src/components/GameOver.tsx` (新增死亡原因)
- Modify: `src/App.tsx` (布局调整)

### StatusBar 改造

显示三个属性条（精力/饥饿/SAN）+ 日期时间 + 星期：

```
散户大冒险 | 2026-01-07 周三 10:45 | ⚡82/100 🍚65/100 🧠90/100 | 💰¥29,800 | 📦500股 | 🎯50%
```

### Calendar 组件

简单的一周日历条，高亮当天，灰色标注周末休市：

```
一(5) 二(6) [三(7)] 四(8) 五(9) 六(10) 日(11)
 📈    📈    📈     📈    📈    休市   休市
```

### PlayerActions 面板

随时可用的操作面板（不再限定盘后）：
- 🍜 吃东西（展开食物列表）
- 😴 睡觉（选择睡几小时的滑块）
- 原有的盘后活动（复盘研究等）

### SleepOverlay

睡觉时的全屏半透明覆盖层：
- 显示"💤 正在睡觉..."
- 显示睡觉进度条
- 时间加速（分时图如果在播放就快进）
- "提前醒来"按钮

### GameOver 改造

新增死亡原因展示：
- 💀 猝死：连续{X}小时没有睡觉，你倒在了电脑前...
- 🍚 饿死：连续{X}小时没有吃东西...
- 🤯 精神崩溃：SAN值归零，你再也无法面对K线了...
- 💸 破产：（保持原有）

---

## 执行顺序建议

1. **Task 1** → Bug修复（最小改动，立即见效）
2. **Task 2** → 交易标记（独立功能，不影响其他）
3. **Task 3** → 价格百分比（独立功能）
4. **Task 4** → 类型系统 + 引擎（为后续铺路）
5. **Task 5** → Store重构（核心改动）
6. **Task 6** → UI改造（基于新Store）

Task 1-3 互不依赖可并行。Task 4-6 需要顺序执行。
