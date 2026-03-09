# 历史 K 线预生成 & 均线系统 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 游戏开始前预生成 250 天历史日 K 数据（含 5 种开局模式），在 K 线图上增加 MA5/MA10/MA20 均线（可开关）和分时均价线，保留最近 5 天分时数据用于 5 日视图。

**Architecture:** 扩展现有 StockSimulator，新增 `generateHistoryData()` 批量调用已有的日模拟函数生成 250 天历史。开局模式通过预设趋势段模板控制最后 30-50 天走势。KLineChart 组件增加均线计算（useMemo）和 LineSeries 渲染。gameStore 新增状态字段管理历史天数、分时缓存、均线开关。

**Tech Stack:** React 19, TypeScript, Zustand, lightweight-charts (LineSeries for MA lines)

---

## Task 1: 新增类型定义

**Files:**
- Modify: `src/types/index.ts`

**Step 1: 添加开局模式类型和均线可见性类型**

在 `src/types/index.ts` 的 `// === 牛熊趋势 ===` 部分之后，`// === 活动结果 ===` 之前，添加：

```typescript
// === 开局模式 ===
export type OpeningPattern =
  | 'slow_bull_pullback'    // 慢牛回调
  | 'dark_decline_bottom'   // 暗跌见底
  | 'sideways_consolidation'// 震荡盘整
  | 'surge_high'            // 暴涨后高位
  | 'v_shape_rebound';      // V型反弹

export const OPENING_PATTERN_NAMES: Record<OpeningPattern, string> = {
  slow_bull_pullback: '慢牛回调',
  dark_decline_bottom: '暗跌见底',
  sideways_consolidation: '震荡盘整',
  surge_high: '暴涨后高位',
  v_shape_rebound: 'V型反弹',
};

// === 均线显示 ===
export interface MAVisible {
  ma5: boolean;
  ma10: boolean;
  ma20: boolean;
}
```

**Step 2: 扩展 GameState 接口**

在 `GameState` 接口中，在 `stockName: string;` 之后添加：

```typescript
  historyDays: number;            // 历史预生成天数（250）
  openingPattern: OpeningPattern; // 本局开局模式
```

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add OpeningPattern, MAVisible types and historyDays to GameState"
```

---

## Task 2: 扩展 StockSimulator — 历史数据生成

**Files:**
- Modify: `src/engine/StockSimulator.ts`

**Step 1: 添加开局模式趋势模板**

在 `getInitialPrice()` 函数之后，添加开局模式配置和历史趋势段生成：

```typescript
import type { TrendSegment, StockDataPoint, OpeningPattern } from '../types';

/** 开局模式的最后阶段趋势模板 */
const OPENING_TEMPLATES: Record<OpeningPattern, TrendSegment[]> = {
  slow_bull_pullback: [
    // 先涨半年，然后最近回调
    { startDay: -60, endDay: -20, dailyBias: 0.006, volatility: 0.025 },
    { startDay: -19, endDay: 0, dailyBias: -0.004, volatility: 0.035 },
  ],
  dark_decline_bottom: [
    // 持续阴跌，最近出现企稳
    { startDay: -50, endDay: -10, dailyBias: -0.005, volatility: 0.03 },
    { startDay: -9, endDay: 0, dailyBias: 0.001, volatility: 0.02 },
  ],
  sideways_consolidation: [
    // 近期窄幅横盘
    { startDay: -40, endDay: 0, dailyBias: 0.0005, volatility: 0.018 },
  ],
  surge_high: [
    // 最近连续大涨
    { startDay: -30, endDay: 0, dailyBias: 0.008, volatility: 0.04 },
  ],
  v_shape_rebound: [
    // 急跌后快速反弹
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
```

**Step 2: 修改 `generateTrendSegments` 支持历史天数**

将现有 `generateTrendSegments` 签名改为接受 `historyDays` 参数，总天数为 `historyDays + gameDays`。在历史末段覆盖开局模式模板：

```typescript
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
    // 移除与模板时间段重叠的已有趋势段
    const templateStart = historyDays + template[0].startDay;
    const filtered = segments.filter(s => s.endDay < templateStart);

    // 添加模板趋势段（将相对天数转为绝对天数）
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
```

**Step 3: 添加 `generateHistoryData` 函数**

```typescript
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
```

**Step 4: Commit**

```bash
git add src/engine/StockSimulator.ts
git commit -m "feat: add history generation, opening patterns to StockSimulator"
```

---

## Task 3: 更新 gameStore — 新增状态字段和历史生成

**Files:**
- Modify: `src/stores/gameStore.ts`

**Step 1: 导入新类型和函数**

在文件顶部的导入中，更新 StockSimulator 的导入：

```typescript
import type { GameState, GamePhase, Card, OpeningPattern, MAVisible } from '../types';
import type { IntradayTick } from '../engine/IntradaySimulator';
import {
  generateTrendSegments,
  getTrendForDay,
  getRandomStockName,
  getInitialPrice,
  getRandomOpeningPattern,
  generateHistoryData,
} from '../engine/StockSimulator';
```

**Step 2: 扩展 StoreState 接口**

在 `StoreState` 接口中添加新字段：

```typescript
export interface StoreState extends GameState {
  // ...existing fields...

  // 新增
  recentIntradayHistory: IntradayTick[][]; // 最近5天分时数据
  maVisible: MAVisible;                    // 均线显示开关
}
```

**Step 3: 扩展 GameActions 接口**

添加均线开关 action：

```typescript
interface GameActions {
  // ...existing actions...
  toggleMA: (key: keyof MAVisible) => void;
}
```

**Step 4: 更新 createInitialState**

```typescript
function createInitialState(): Omit<StoreState, 'actions'> {
  const price = getInitialPrice();
  return {
    // ...existing fields...
    historyDays: 0,
    openingPattern: 'sideways_consolidation' as OpeningPattern,
    recentIntradayHistory: [],
    maVisible: { ma5: true, ma10: true, ma20: true },
  };
}
```

**Step 5: 更新 `newGame` action**

改用 250 天历史生成：

```typescript
newGame: () => {
  get().actions.stopPlayback();
  const price = getInitialPrice();
  const goal = getRandomGoal();
  const pattern = getRandomOpeningPattern();
  const historyDays = 250;
  const segments = generateTrendSegments(historyDays, 200, pattern);
  const stockName = getRandomStockName();

  // 批量生成历史日K
  const historyData = generateHistoryData(historyDays, price, segments);
  const lastClose = historyData.length > 0
    ? historyData[historyData.length - 1].close
    : price;
  const startDay = historyDays + 1;

  set({
    ...createInitialState(),
    day: startDay,
    phase: 'morning_news',
    gameStatus: 'playing',
    currentPrice: lastClose,
    todayOpen: lastClose,
    amClose: lastClose,
    goal,
    trendSegments: segments,
    stockName,
    stockHistory: historyData,
    historyDays,
    openingPattern: pattern,
    recentIntradayHistory: [],
    maVisible: { ma5: true, ma10: true, ma20: true },
    messages: [
      `欢迎来到股市！你的目标：${goal.title}（¥${goal.targetAmount.toLocaleString()}）`,
      `你选择了【${stockName}】，当前价格 ¥${lastClose}`,
      '祝你好运，散户！',
    ],
  });
},
```

**Step 6: 更新收盘逻辑 — 保存分时数据到 recentIntradayHistory**

在 `tickForward` 中，下午盘结束进入盘后的分支里，保存当天分时数据：

```typescript
// 下午盘结束 → 自动进入盘后
if (state.phase === 'pm_trading' && nextTick >= TOTAL_TICKS - 1) {
  get().actions.stopPlayback();
  const closePrice = state.intradayTicks[TOTAL_TICKS - 1]?.price ?? state.currentPrice;
  const ohlc = intradayToOHLC(state.intradayTicks);
  const dayData = { day: state.day, ...ohlc };
  const changePercent = ((closePrice - state.todayOpen) / state.todayOpen * 100).toFixed(2);

  // 保留最近5天分时数据
  const recentHistory = [...state.recentIntradayHistory, state.intradayTicks];
  if (recentHistory.length > 5) recentHistory.shift();

  set({
    phase: 'after_hours',
    currentTick: TOTAL_TICKS - 1,
    currentPrice: closePrice,
    stockHistory: [...state.stockHistory, dayData],
    recentIntradayHistory: recentHistory,
    chartView: 'intraday',
    messages: [
      `📊 收盘价: ¥${closePrice.toFixed(2)} (${Number(changePercent) >= 0 ? '+' : ''}${changePercent}%)`,
      `⚡ 盘后活动时间 | 剩余体力: ${state.stamina}`,
    ],
  });
  return;
}
```

**Step 7: 添加 toggleMA action**

```typescript
toggleMA: (key: keyof MAVisible) => {
  const state = get();
  set({ maVisible: { ...state.maVisible, [key]: !state.maVisible[key] } });
},
```

**Step 8: 更新 saveGame — 排除新的不可序列化字段并包含新字段**

在 `saveGame` 的解构中确认 `recentIntradayHistory` 和 `maVisible` 被包含在 saveable 中（它们是可序列化的，无需排除）。

**Step 9: 更新 UI 显示天数**

在所有显示 `day` 的地方，用 `day - historyDays` 得到玩家看到的"第 N 天"。这包括：
- `advancePhase` 中 settlement→morning_news 的消息 `=== 第 ${nextDay - state.historyDays} 天 ===`
- `newGame` 中不需要改（第一天晨报消息不含天数）

**Step 10: Commit**

```bash
git add src/stores/gameStore.ts
git commit -m "feat: integrate history generation, intraday cache, MA toggle in gameStore"
```

---

## Task 4: 更新 KLineChart — 均线渲染

**Files:**
- Modify: `src/components/KLineChart.tsx`

**Step 1: 添加均线计算函数**

在组件外部添加工具函数：

```typescript
/** 计算移动平均线 */
function calculateMA(
  data: { time: unknown; close: number }[],
  period: number,
): { time: unknown; value: number }[] {
  const result: { time: unknown; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    result.push({ time: data[i].time, value: Math.round((sum / period) * 100) / 100 });
  }
  return result;
}

/** 计算分时均价线（累计均价） */
function calculateAvgPriceLine(
  data: { time: unknown; value: number }[],
): { time: unknown; value: number }[] {
  const result: { time: unknown; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].value;
    result.push({ time: data[i].time, value: Math.round((sum / (i + 1)) * 100) / 100 });
  }
  return result;
}
```

**Step 2: 从 store 获取新状态**

```typescript
const { maVisible } = useGameStore();
const { setChartView, toggleMA } = useGameStore(s => s.actions);
const recentIntradayHistory = useGameStore(s => s.recentIntradayHistory);
const historyDays = useGameStore(s => s.historyDays);
```

**Step 3: 计算均线数据（useMemo）**

```typescript
const maData = useMemo(() => {
  if (chartView === 'intraday' || !chartData || chartData.length === 0) return null;

  const withClose = chartData.map(d => ({ ...d, close: d.close }));
  return {
    ma5: calculateMA(withClose, 5),
    ma10: calculateMA(withClose, 10),
    ma20: calculateMA(withClose, 20),
  };
}, [chartData, chartView]);
```

**Step 4: 计算分时均价线数据**

```typescript
const avgPriceData = useMemo(() => {
  if (chartView !== 'intraday' || intradayData.length === 0) return [];
  return calculateAvgPriceLine(intradayData);
}, [intradayData, chartView]);
```

**Step 5: 更新 5 日视图渲染逻辑**

在 `chartData` 的 useMemo 中，修改 `'5day'` 分支：

```typescript
if (chartView === '5day') {
  // 5日分时拼接（如果有分时数据），否则回退到5日K线
  if (recentIntradayHistory.length > 0) return null; // 用分时线渲染
  const recent = history.slice(-5);
  return recent.map(d => ({
    time: d.day as unknown as import('lightweight-charts').UTCTimestamp,
    open: d.open, high: d.high, low: d.low, close: d.close,
  }));
}
```

新增 5 日分时数据拼接：

```typescript
const fiveDayIntradayData = useMemo(() => {
  if (chartView !== '5day' || recentIntradayHistory.length === 0) return [];
  const result: { time: number; value: number }[] = [];
  recentIntradayHistory.forEach((dayTicks, dayIndex) => {
    dayTicks.forEach(tick => {
      result.push({
        time: (dayIndex * 241 + tick.minute) as unknown as import('lightweight-charts').UTCTimestamp,
        value: tick.price,
      });
    });
  });
  // 追加当天已有的tick
  if (intradayTicks.length > 0) {
    const dayIndex = recentIntradayHistory.length;
    intradayTicks
      .filter(t => t.minute <= currentTick)
      .forEach(tick => {
        result.push({
          time: (dayIndex * 241 + tick.minute) as unknown as import('lightweight-charts').UTCTimestamp,
          value: tick.price,
        });
      });
  }
  return result;
}, [chartView, recentIntradayHistory, intradayTicks, currentTick]);
```

**Step 6: 更新图表渲染 useEffect — 添加均线 Series**

在 K 线图渲染分支中（`else` 分支），在 candlestick series 之后添加均线：

```typescript
// 添加均线
const MA_COLORS = { ma5: '#f6c244', ma10: '#4a9eff', ma20: '#a855f7' };
const maSeriesRefs: ISeriesApi<'Line'>[] = [];

if (maData) {
  for (const [key, color] of Object.entries(MA_COLORS) as [keyof typeof MA_COLORS, string][]) {
    if (maVisible[key] && maData[key].length > 0) {
      const maSeries = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      maSeries.setData(maData[key]);
      maSeriesRefs.push(maSeries);
    }
  }
}
```

在分时图渲染分支中，添加均价线：

```typescript
// 分时均价线
if (avgPriceData.length > 0) {
  const avgSeries = chart.addSeries(LineSeries, {
    color: '#f97316',       // 橙色
    lineWidth: 1,
    lineStyle: 2,           // 虚线
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
  });
  avgSeries.setData(avgPriceData);
}
```

处理 5 日分时视图渲染（新增分支）：

```typescript
if (chartView === '5day' && fiveDayIntradayData.length > 0) {
  // 5日分时线
  const series = chart.addSeries(LineSeries, {
    color: '#ffffff',
    lineWidth: 2,
    priceLineVisible: true,
    lastValueVisible: true,
  });
  series.setData(fiveDayIntradayData);
  seriesRef.current = series;
  chart.timeScale().fitContent();
}
```

**Step 7: 添加均线开关 UI**

在视图切换按钮行之后添加均线 toggle：

```tsx
{/* 均线开关 - 非分时视图时显示 */}
{chartView !== 'intraday' && chartView !== '5day' && (
  <div className="flex gap-1 items-center ml-2">
    <span className="text-xs text-gray-500">MA:</span>
    {([
      { key: 'ma5' as const, label: 'MA5', color: '#f6c244' },
      { key: 'ma10' as const, label: 'MA10', color: '#4a9eff' },
      { key: 'ma20' as const, label: 'MA20', color: '#a855f7' },
    ]).map(ma => (
      <button
        key={ma.key}
        onClick={() => toggleMA(ma.key)}
        className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
          maVisible[ma.key]
            ? 'opacity-100'
            : 'opacity-30'
        }`}
        style={{ color: ma.color, borderColor: ma.color, borderWidth: '1px' }}
      >
        {ma.label}
      </button>
    ))}
  </div>
)}
```

**Step 8: 更新 useEffect 依赖**

确保图表 useEffect 的依赖数组包含 `maVisible`、`maData`、`avgPriceData`、`fiveDayIntradayData`。

**Step 9: Commit**

```bash
git add src/components/KLineChart.tsx
git commit -m "feat: add MA lines, avg price line, 5-day intraday view to KLineChart"
```

---

## Task 5: 更新显示天数的组件

**Files:**
- Modify: `src/components/StatusBar.tsx`
- Modify: `src/components/Settlement.tsx`
- Modify: `src/components/MorningNews.tsx`
- Modify: `src/components/GameOver.tsx`

**Step 1: 查找所有显示 `day` 的位置**

所有需要显示玩家天数的位置，改用 `day - historyDays`：

- StatusBar: 显示 "Day N" → 改为 `Day {day - historyDays}`
- Settlement/MorningNews: 消息中的天数
- GameOver: 统计数据中的天数

**Step 2: 逐个组件更新**

每个组件从 store 获取 `historyDays`，然后用 `day - historyDays` 显示。

**Step 3: Commit**

```bash
git add src/components/StatusBar.tsx src/components/Settlement.tsx src/components/MorningNews.tsx src/components/GameOver.tsx
git commit -m "feat: display player-relative day numbers (day - historyDays)"
```

---

## Task 6: 验证与构建

**Step 1: 运行 TypeScript 编译检查**

```bash
npx tsc -b --noEmit
```

Expected: 无错误

**Step 2: 运行构建**

```bash
npm run build
```

Expected: 构建成功

**Step 3: 本地预览测试**

```bash
npm run preview
```

手动验证：
- 新游戏 → K 线图应有 250 天历史数据
- 日 K 视图有 MA5/MA10/MA20 三条均线
- 均线 toggle 按钮可开关
- 分时图有橙色均价虚线
- 第一天显示为 "第 1 天"，不是 "第 251 天"
- 玩过几天后，5 日视图显示分时拼接数据

**Step 4: Commit & Deploy**

```bash
git add .
git commit -m "feat: complete historical K-line and MA system"
npm run deploy
```
