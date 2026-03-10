# 散户大冒险 — 全面游戏增强实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 从6个维度全面升级游戏可玩性：节奏优化、挂单系统、卡牌扩展、新手引导、Meta解锁、盘中快速事件

**Architecture:** 所有改动基于现有 Zustand 单 Store 架构，新增独立引擎模块（OrderSystem/TutorialSystem），扩展现有数据文件（cards/events），新增UI组件

**Tech Stack:** React 19 + TypeScript 5.9 + Zustand 5.0 + Tailwind CSS 4.2

---

## 模块概览

| # | 模块 | 优先级 | 核心改动 |
|---|------|--------|----------|
| 1 | 节奏优化 | P0 | 非交易时段自动快进 + 跳过当天按钮 |
| 2 | 挂单/止盈止损系统 | P0 | 限价委托 + 自动止盈止损 |
| 3 | 卡牌池扩展 | P1 | 从8张扩展到24张，含有副作用的强力卡 |
| 4 | 新手引导 | P1 | 第一天自动教程，逐步引导核心操作 |
| 5 | Meta解锁系统 | P2 | 跨局解锁内容，提升复玩动力 |
| 6 | 盘中快速事件 | P2 | 限时选择题，增加紧张感和决策点 |

---

## Task 1: 节奏优化 — 非交易时段自动快进 + 跳过当天

### 设计思路

当前痛点：一天1440分钟，非交易时段（盘后15:00→次日09:30=1110分钟）占比约77%，玩家大量时间在"看时间走"。

解决方案：
1. **智能加速**：非交易时段 + 没在做活动/吃饭/睡觉 → 自动切到3x速度
2. **"跳过到下一事件"按钮**：一键跳到下一个有意义的时间节点（开盘/收盘/新一天/睡醒）

**Files:**
- Modify: `src/stores/gameStore.ts` — globalTick 中添加自动加速逻辑 + 新增 skipToNextEvent action
- Modify: `src/components/TradingPanel.tsx` — 添加"跳过"按钮

**Step 1: gameStore 添加自动加速逻辑**

在 `globalTick()` 末尾（`set(updates)` 之前），添加自动速度调整：

```typescript
// ====== 智能加速：非关键时段自动快进 ======
const currentSpeed = state.playbackSpeed;
const isIdle = !state.vitality.isSleeping; // 不在睡觉（睡觉已经自动3x了）
const isNonTrading = curPhase !== 'am_trading' && curPhase !== 'pm_trading';
const isNonWorkCritical = !(jobState.employed && jobState.isWorkingHours && jobState.isSlacking);

if (isIdle && isNonTrading && isNonWorkCritical && currentSpeed === 1) {
  // 自动加速到2x（不是3x，保留玩家感知）
  updates.playbackSpeed = 2 as PlaybackSpeed;
  // 需要重启定时器
  get().actions.stopPlayback();
  setTimeout(() => get().actions.startPlayback(), 10);
} else if ((curPhase === 'am_trading' || curPhase === 'pm_trading') && currentSpeed > 1 && !state.vitality.isSleeping) {
  // 开盘恢复正常速度（仅当不是手动快进时）
  // 标记：只在自动加速的情况下回退
}
```

但实际上更优雅的方案是：不修改 playbackSpeed，而是动态调整 tick 间隔。在非关键时段，一次 globalTick 可以推进多分钟。

**更好的方案：批量推进**

在 TradingPanel 中添加"跳过"按钮，不修改核心时钟逻辑，而是提供快速跳过功能：

```typescript
// 新 action: skipToNext
skipToNext: () => {
  const state = get();
  const { calendar, vitality } = state;

  if (vitality.isSleeping) return; // 睡觉时不能跳
  if (state.gameStatus !== 'playing') return;

  const { marketPhase, minuteOfDay, isTradingDay } = calendar;

  let targetMinute: number;

  if (marketPhase === 'am_trading' || marketPhase === 'pm_trading') {
    return; // 交易时段不能跳过
  } else if (marketPhase === 'lunch_break') {
    targetMinute = 780; // 跳到13:00下午开盘
  } else if (marketPhase === 'after_hours') {
    // 跳到22:00（该睡觉了）或者如果已经>22:00跳到次日08:00
    if (minuteOfDay < 1320) {
      targetMinute = 1320; // 22:00
    } else {
      targetMinute = 1440 + 480; // 次日 08:00
    }
  } else if (marketPhase === 'pre_market') {
    if (isTradingDay) {
      targetMinute = 510; // 08:30 晨报时间
    } else {
      targetMinute = 1320; // 休市日跳到22:00
    }
  } else {
    // closed - 跳到22:00
    targetMinute = minuteOfDay < 1320 ? 1320 : 1440 + 480;
  }

  // 批量执行 globalTick
  const minutesToSkip = targetMinute - minuteOfDay;
  if (minutesToSkip <= 0) return;

  // 暂停播放，批量推进
  get().actions.stopPlayback();
  for (let i = 0; i < minutesToSkip; i++) {
    get().actions.globalTick();
  }
  get().actions.startPlayback();
}
```

**Step 2: TradingPanel 添加跳过按钮**

在非交易时段的提示区域添加跳过按钮：

```tsx
{!isTrading && (
  <div className="text-center py-4">
    <span className="text-gray-500 text-sm block mb-2">
      {/* 现有市场阶段提示 */}
    </span>
    <button
      onClick={skipToNext}
      className="px-4 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded text-sm transition-colors"
    >
      ⏭ 跳过到下一节点
    </button>
  </div>
)}
```

**Step 3: 自动加速（简单版）**

在 globalTick 中，当进入非交易时段且当前速度为1时，自动提速到2x：

在 `globalTick` 函数的 `set(updates)` 之前添加：

```typescript
// 智能自动加速
if (curPhase !== prevPhase) {
  const enteringIdle = (curPhase === 'after_hours' || curPhase === 'pre_market' || curPhase === 'closed' || curPhase === 'lunch_break');
  const enteringActive = (curPhase === 'am_trading' || curPhase === 'pm_trading');

  if (enteringIdle && state.playbackSpeed === 1) {
    // 进入非交易时段，自动加速
    setTimeout(() => get().actions.setPlaybackSpeed(2), 50);
  } else if (enteringActive && state.playbackSpeed === 2) {
    // 进入交易时段，恢复正常速度
    setTimeout(() => get().actions.setPlaybackSpeed(1), 50);
  }
}
```

---

## Task 2: 挂单/止盈止损系统

### 设计思路

让玩家在不能看盘时也能设置策略。挂单 = 限价委托，到价自动执行。

**Files:**
- Modify: `src/types/index.ts` — 新增 PendingOrder 类型
- Modify: `src/stores/gameStore.ts` — 新增 pendingOrders 状态 + 挂单逻辑 + globalTick 中检查触发
- Create: `src/components/OrderPanel.tsx` — 挂单界面

**Step 1: 类型定义**

```typescript
// src/types/index.ts 新增
export interface PendingOrder {
  id: string;
  type: 'limit_buy' | 'limit_sell' | 'stop_loss' | 'take_profit';
  /** 触发价格 */
  triggerPrice: number;
  /** 股数 */
  shares: number;
  /** 创建时间（游戏总分钟数） */
  createdAt: number;
  /** 是否已执行 */
  executed: boolean;
}
```

**Step 2: Store 新增**

StoreState 新增:
```typescript
pendingOrders: PendingOrder[];
```

GameActions 新增:
```typescript
placeOrder: (order: Omit<PendingOrder, 'id' | 'createdAt' | 'executed'>) => void;
cancelOrder: (orderId: string) => void;
```

**Step 3: globalTick 中检查挂单**

在交易时段tick推进后，遍历 pendingOrders，检查价格是否触发：

```typescript
// 检查挂单
if (isInTrading) {
  const price = updates.currentPrice ?? state.currentPrice;
  const orders = [...(state.pendingOrders ?? [])];
  const executedOrders: string[] = [];

  for (const order of orders) {
    if (order.executed) continue;
    let triggered = false;

    switch (order.type) {
      case 'limit_buy':
        triggered = price <= order.triggerPrice;
        break;
      case 'limit_sell':
        triggered = price >= order.triggerPrice;
        break;
      case 'stop_loss':
        triggered = price <= order.triggerPrice;
        break;
      case 'take_profit':
        triggered = price >= order.triggerPrice;
        break;
    }

    if (triggered) {
      // 执行交易
      if (order.type === 'limit_buy') {
        // 执行买入逻辑
      } else {
        // 执行卖出逻辑
      }
      executedOrders.push(order.id);
      newMessages.push(sysMsg(`📋 挂单触发！${order.type === 'limit_buy' ? '买入' : '卖出'} ${order.shares}股 @ ¥${price.toFixed(2)}`));
    }
  }

  if (executedOrders.length > 0) {
    updates.pendingOrders = orders.map(o =>
      executedOrders.includes(o.id) ? { ...o, executed: true } : o
    );
  }
}
```

**Step 4: OrderPanel 组件**

创建 `src/components/OrderPanel.tsx`：显示当前挂单列表，支持设置限价买入/卖出/止损/止盈，支持取消挂单。嵌入到 TradingPanel 下方或作为独立面板。

---

## Task 3: 卡牌池扩展 — 从8张到24张

### 设计思路

新增16张卡牌，包含有副作用的强力卡，增加策略深度。

**Files:**
- Modify: `src/data/cards.ts` — 新增16张卡牌
- Modify: `src/types/index.ts` — 新增 CardEffectType（如 `sanity_drain`, `catch_rate_reduce` 等）
- Modify: `src/engine/CardSystem.ts` — 支持新效果类型
- Modify: `src/stores/gameStore.ts` — 应用新卡牌效果

**新增卡牌列表：**

常见(6张):
| 名称 | 效果 | 副作用 |
|------|------|--------|
| 咖啡续命 | 精力衰减-20% | 无 |
| 散户日记 | 事件描述更详细 | 无 |
| 经济学课本 | 信息准确率+10% | 无 |
| 带饭达人 | 生活费-30 | 无 |
| 假装加班 | 被抓概率-30% | 无 |
| 午睡小能手 | 午休时自动恢复5精力 | 无 |

稀有(6张):
| 名称 | 效果 | 副作用 |
|------|------|--------|
| 2倍杠杆 | 买入时仓位翻倍 | SAN衰减速度×1.5 |
| 量化交易入门 | 挂单不限数量 | 生活费+50 |
| 领导的秘密 | 摸鱼永不被抓 | 工资-30% |
| 短线之王 | T+0特权 | 每次卖出扣50元手续费 |
| 金融圈人脉 | 社交应酬100%获卡 | 应酬费用×2 |
| 冥想大师 | SAN值不会低于20 | 精力恢复-20% |

传说(4张):
| 名称 | 效果 | 副作用 |
|------|------|--------|
| 时光机 | 可查看明日开盘价 | 每次使用消耗20精力 |
| 涨停密码 | 每5天触发一次涨停 | 随机1天跌停 |
| 财神附体 | 所有收益+10% | 生活费×2 |
| 分身术 | 上班不影响看盘 | SAN值上限降到60 |

**Step 1: 新增 CardEffectType**

```typescript
export type CardEffectType =
  | 'info_accuracy'    // 信息准确率
  | 'trend_hint'       // 趋势提示
  | 'sell_bonus'       // 卖出加成
  | 'expense_reduce'   // 生活费减少
  | 'stamina_bonus'    // 体力加成
  | 'trade_override'   // 交易规则覆盖
  // 新增:
  | 'energy_drain_reduce'   // 精力衰减降低
  | 'catch_rate_reduce'     // 被抓概率降低
  | 'leverage'              // 杠杆倍数
  | 'sanity_drain_mult'     // SAN衰减倍率（副作用）
  | 'expense_increase'      // 生活费增加（副作用）
  | 'salary_reduce'         // 工资降低（副作用）
  | 't0_enabled'            // T+0特权
  | 'sell_fee'              // 卖出手续费（副作用）
  | 'socializing_card_rate' // 社交获卡率
  | 'socializing_cost_mult' // 社交费用倍率
  | 'sanity_floor'          // SAN值下限
  | 'energy_recovery_reduce'// 精力恢复降低
  | 'skip_work_check'       // 跳过上班检查（可看盘）
  | 'sanity_cap'            // SAN值上限降低
  | 'revenue_bonus'         // 所有收益加成
  | 'expense_mult'          // 生活费倍率
  | 'lunch_energy_restore'  // 午休精力恢复
  ;
```

**Step 2: 在 cards.ts 中添加16张新卡**

（完整的卡牌数据省略，在实际编码时写入）

**Step 3: 在 gameStore.ts 中应用新效果**

需要在以下位置应用新的卡牌效果：
- `tickVitality` 的上下文中传入 energy_drain_reduce 等
- `toggleSlacking` 中应用 catch_rate_reduce
- `buy` 中应用 leverage
- `sell` 中应用 t0_enabled / sell_fee
- `doActivity` 中应用 socializing 相关
- `globalTick` 上班系统中应用 skip_work_check / salary_reduce

---

## Task 4: 新手引导系统

### 设计思路

第一天（第一个交易日）通过一个"前辈NPC"以消息的形式逐步教玩家核心操作。

**Files:**
- Create: `src/engine/TutorialSystem.ts` — 教程步骤定义和状态管理
- Modify: `src/stores/gameStore.ts` — 新增 tutorialStep 状态，在 globalTick 中检查教程触发
- Create: `src/components/TutorialOverlay.tsx` — 教程高亮遮罩/提示框

**教程步骤：**

```typescript
const TUTORIAL_STEPS = [
  { id: 'welcome', trigger: 'game_start', message: '👋 嘿，新来的！我是你的前辈老张...' },
  { id: 'work_progress', trigger: 'minute_of_day >= 540', message: '📋 上班了！看到工作进度条了吗？...' },
  { id: 'slacking', trigger: 'minute_of_day >= 570', message: '🐟 开盘了！想看盘就得摸鱼...' },
  { id: 'trading', trigger: 'first_slacking', message: '📈 看到K线了吧？在交易面板可以买卖...' },
  { id: 'toilet', trigger: 'minute_of_day >= 600', message: '🚽 告诉你个诀窍——带薪拉屎...' },
  { id: 'eating', trigger: 'hunger < 60', message: '🍜 快饿了吧？记得吃东西...' },
  { id: 'sleeping', trigger: 'energy < 40', message: '😴 精力不够了，该睡觉了...' },
  { id: 'complete', trigger: 'day_2', message: '✅ 你已经掌握了基本操作！...' },
];
```

**实现方式：** 以 waterfallQueue 消息的形式推送，不需要单独的 overlay 组件，保持简洁。在 StoreState 中添加 `tutorialStep: number`（0-based），每完成一步+1，达到最后一步后不再触发。

---

## Task 5: Meta解锁系统

### 设计思路

每局结束后，根据游戏表现解锁新内容（卡牌/事件/角色），存储在 localStorage 中跨局持久化。

**Files:**
- Create: `src/engine/MetaSystem.ts` — Meta进度管理
- Create: `src/data/achievements.ts` — 成就/解锁条件定义
- Modify: `src/stores/gameStore.ts` — 游戏结束时结算 Meta 进度
- Modify: `src/components/MainMenu.tsx` — 显示解锁进度和成就
- Modify: `src/components/GameOver.tsx` — 显示本局解锁的新内容

**解锁条件举例：**

```typescript
const UNLOCKS = [
  { id: 'card_leverage', condition: 'total_games >= 1', reward: '解锁卡牌: 2倍杠杆' },
  { id: 'card_t0', condition: 'peak_assets >= 50000', reward: '解锁卡牌: 短线之王' },
  { id: 'event_crash', condition: 'death_count >= 3', reward: '解锁传说事件: 股灾来临' },
  { id: 'char_security', condition: 'caught_total >= 10', reward: '解锁角色: 保安（低薪但永不被抓）' },
  { id: 'char_trader', condition: 'won_once', reward: '解锁角色: 全职炒股（无工作但+20%收益）' },
  { id: 'goal_10m', condition: 'won_with_5m', reward: '解锁目标: 移民火星 (¥10,000,000)' },
];
```

**Meta状态存储：**

```typescript
// localStorage key: 'retail_investor_meta'
interface MetaState {
  totalGames: number;
  totalWins: number;
  totalDeaths: Record<DeathCause, number>;
  peakAssetsAllTime: number;
  totalCaughtAllTime: number;
  unlockedCards: string[];
  unlockedEvents: string[];
  unlockedCharacters: string[];
  unlockedGoals: string[];
  achievements: string[];
}
```

---

## Task 6: 盘中快速事件

### 设计思路

交易时段随机弹出限时选择题（10秒倒计时），玩家需要快速决策，不选择则按默认处理。

**Files:**
- Create: `src/data/flashEvents.ts` — 快速事件数据
- Create: `src/components/FlashEvent.tsx` — 弹窗UI + 倒计时
- Modify: `src/stores/gameStore.ts` — 新增 flashEvent 状态 + 触发/处理逻辑

**快速事件举例：**

```typescript
const FLASH_EVENTS = [
  {
    id: 'rumor_positive',
    title: '传闻利好！',
    description: '突然传来消息：某大机构正在建仓这只股票！',
    timeLimit: 10,
    choices: [
      { text: '跟单买入！', effect: { buy_percent: 50 } },
      { text: '冷静观望', effect: { sanity_restore: 5 } },
      { text: '反手做空（止盈卖出）', effect: { sell_percent: 50 } },
    ],
    defaultChoice: 1, // 不选默认观望
  },
  {
    id: 'flash_crash',
    title: '急跌！',
    description: '大盘闪崩！你的股票跟着跳水3%！',
    timeLimit: 8,
    choices: [
      { text: '割肉跑路', effect: { sell_percent: 100 } },
      { text: '加仓抄底', effect: { buy_percent: 30 } },
      { text: '装死不动', effect: {} },
    ],
    defaultChoice: 2,
  },
  // ... 更多
];
```

**触发机制：** 在 globalTick 的交易时段中，每分钟有约 0.3% 的概率触发一个快速事件（平均每个交易日约1次）。触发时暂停游戏时间，显示弹窗，倒计时结束或玩家选择后恢复。

---

## 执行顺序

按依赖关系排序：

1. **Task 1: 节奏优化** — 独立，最高优先级
2. **Task 3: 卡牌扩展** — 独立，为后续 Meta 系统提供内容
3. **Task 2: 挂单系统** — 独立，核心交易增强
4. **Task 6: 盘中快速事件** — 独立，增加紧张感
5. **Task 4: 新手引导** — 需要了解所有系统后编写
6. **Task 5: Meta解锁** — 需要所有内容就位后才能定义解锁条件

每个 Task 完成后 commit 一次。
