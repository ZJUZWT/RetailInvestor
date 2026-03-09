import { create } from 'zustand';
import type { GameState, GamePhase, Card, OpeningPattern, MAVisible } from '../types';
import type { IntradayTick } from '../engine/IntradaySimulator';
import { getRandomGoal } from '../data/goals';
import {
  generateTrendSegments,
  getTrendForDay,
  getRandomStockName,
  getInitialPrice,
  getRandomOpeningPattern,
  generateHistoryData,
} from '../engine/StockSimulator';
import {
  generateIntradayTicks,
  intradayToOHLC,
  AM_END_TICK,
  PM_START_TICK,
  TOTAL_TICKS,
} from '../engine/IntradaySimulator';
import {
  rollEvent,
  getEventStockModifier,
  getEventCashChange,
  getEventExpenseChange,
  getEventStaminaChange,
  getEventCard,
  getEventChainId,
  checkEventChains,
  executeActivity,
} from '../engine/EventSystem';
import { addCard, replaceCard, sumCardEffects } from '../engine/CardSystem';

const SAVE_KEY = 'retail_investor_save';

export type PlaybackSpeed = 0 | 1 | 2 | 3; // 0=暂停, 1=正常, 2=快进, 3=超快

// 每个speed对应的ms/tick间隔
const SPEED_INTERVALS: Record<PlaybackSpeed, number> = {
  0: Infinity, // 暂停
  1: 500,      // 正常: ~2分钟/半天
  2: 200,      // 快进
  3: 80,       // 超快
};

interface PendingCard {
  card: Card;
}

export interface StoreState extends GameState {
  actions: GameActions;
  pendingCard: PendingCard | null;
  lunchHint: { direction: 'up' | 'down'; reliable: boolean } | null;
  eventModifier: number;
  extraStaminaNextDay: number;

  // 盘中实时数据
  intradayTicks: IntradayTick[];      // 预生成的全天tick
  currentTick: number;                // 当前播放到第几个tick
  playbackSpeed: PlaybackSpeed;       // 播放速度
  tickTimerId: number | null;         // setInterval id
  chartView: 'intraday' | 'daily' | 'weekly' | 'monthly' | '5day'; // K线视图
  recentIntradayHistory: IntradayTick[][]; // 最近5天分时数据
  maVisible: MAVisible;                    // 均线显示开关
}

interface GameActions {
  newGame: () => void;
  loadGame: () => boolean;
  saveGame: () => void;
  advancePhase: () => void;
  buy: (shares: number) => void;
  sell: (shares: number) => void;
  doActivity: (activityId: string) => void;
  finishAfterHours: () => void;
  replaceCardAt: (index: number, newCard: Card) => void;
  dismissPendingCard: () => void;
  addMessage: (msg: string) => void;
  getTotalAssets: () => number;

  // 盘中控制
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  tickForward: () => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  setChartView: (view: StoreState['chartView']) => void;
  toggleMA: (key: keyof MAVisible) => void;
}

function createInitialState(): Omit<StoreState, 'actions'> {
  const price = getInitialPrice();
  return {
    day: 0,
    phase: 'morning_news' as GamePhase,
    gameStatus: 'menu',
    cash: 100000,
    shares: 0,
    shareCostBasis: 0,
    stamina: 3,
    maxStamina: 3,
    dailyExpense: 200,
    goal: getRandomGoal(),
    currentPrice: price,
    stockHistory: [],
    trendSegments: generateTrendSegments(),
    stockName: getRandomStockName(),
    boughtToday: false,
    todayOpen: price,
    amClose: price,
    cards: [],
    maxCardSlots: 3,
    activeEventChains: [],
    currentEvent: null,
    eventLog: [],
    messages: [],
    activitiesDoneToday: [],
    peakAssets: 100000,
    totalTradingDays: 0,
    pendingCard: null,
    lunchHint: null,
    eventModifier: 0,
    extraStaminaNextDay: 0,
    intradayTicks: [],
    currentTick: 0,
    playbackSpeed: 1,
    tickTimerId: null,
    chartView: 'intraday',
    recentIntradayHistory: [],
    maVisible: { ma5: true, ma10: true, ma20: true },
    historyDays: 0,
    openingPattern: 'sideways_consolidation' as OpeningPattern,
  };
}

export const useGameStore = create<StoreState>((set, get) => ({
  ...createInitialState(),

  actions: {
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

    loadGame: () => {
      try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) return false;
        const state = JSON.parse(saved);
        set({ ...state, pendingCard: null, lunchHint: null, tickTimerId: null, playbackSpeed: 1 as PlaybackSpeed });
        return true;
      } catch {
        return false;
      }
    },

    saveGame: () => {
      const state = get();
      const { actions, pendingCard, lunchHint, tickTimerId, ...saveable } = state;
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveable));
    },

    // ==================== 盘中控制 ====================

    setPlaybackSpeed: (speed: PlaybackSpeed) => {
      const state = get();
      set({ playbackSpeed: speed });

      // 重启定时器
      if (state.tickTimerId !== null) {
        clearInterval(state.tickTimerId);
        set({ tickTimerId: null });
      }
      if (speed > 0 && (state.phase === 'am_trading' || state.phase === 'pm_trading')) {
        get().actions.startPlayback();
      }
    },

    startPlayback: () => {
      const state = get();
      if (state.tickTimerId !== null) clearInterval(state.tickTimerId);
      if (state.playbackSpeed === 0) return;

      const interval = SPEED_INTERVALS[state.playbackSpeed];
      const id = window.setInterval(() => {
        get().actions.tickForward();
      }, interval);

      set({ tickTimerId: id });
    },

    stopPlayback: () => {
      const state = get();
      if (state.tickTimerId !== null) {
        clearInterval(state.tickTimerId);
        set({ tickTimerId: null });
      }
    },

    tickForward: () => {
      const state = get();
      const nextTick = state.currentTick + 1;

      // 上午盘结束 → 自动进入午休
      if (state.phase === 'am_trading' && nextTick > AM_END_TICK) {
        get().actions.stopPlayback();
        const amClosePrice = state.intradayTicks[AM_END_TICK]?.price ?? state.currentPrice;

        // 自动生成午间消息：根据下午走势给出提示（40%准确率，有卡牌加成）
        const pmClosePrice = state.intradayTicks[TOTAL_TICKS - 1]?.price ?? amClosePrice;
        const actualDirection = pmClosePrice >= amClosePrice ? 'up' : 'down';
        const infoAccuracy = 0.4 + sumCardEffects(state.cards, 'info_accuracy');
        const isReliable = Math.random() < infoAccuracy;
        const hintDirection = isReliable ? actualDirection : (actualDirection === 'up' ? 'down' : 'up');

        const lunchMessages = [
          { text: '食堂里有人在聊这只股票，听说下午可能', source: '食堂八卦' },
          { text: '你刷到一条消息，分析师说下午走势可能', source: '手机推送' },
          { text: '同事神秘兮兮地跟你说，下午大概率会', source: '同事爆料' },
          { text: '午休群里有人发了条消息，说下午要', source: '微信群' },
          { text: '你打盹时梦到下午股价', source: '午间灵感' },
        ];
        const lunchMsg = lunchMessages[Math.floor(Math.random() * lunchMessages.length)];

        set({
          phase: 'lunch_break',
          currentTick: AM_END_TICK,
          currentPrice: amClosePrice,
          amClose: amClosePrice,
          stamina: state.stamina - 1,
          chartView: 'intraday',
          lunchHint: { direction: hintDirection, reliable: isReliable },
          messages: [
            `🍜 午间休息 | 上午收盘: ¥${amClosePrice.toFixed(2)}`,
            `💬 ${lunchMsg.source}：${lunchMsg.text}${hintDirection === 'up' ? '涨 📈' : '跌 📉'}`,
          ],
        });
        return;
      }

      // 下午盘结束 → 自动进入盘后
      if (state.phase === 'pm_trading' && nextTick >= TOTAL_TICKS - 1) {
        get().actions.stopPlayback();
        const closePrice = state.intradayTicks[TOTAL_TICKS - 1]?.price ?? state.currentPrice;

        // 生成日K数据
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

      // 正常推进tick
      if (nextTick < state.intradayTicks.length) {
        const tick = state.intradayTicks[nextTick];
        set({
          currentTick: nextTick,
          currentPrice: tick.price,
        });
      }
    },

    setChartView: (view: StoreState['chartView']) => {
      const state = get();
      // 盘中只能看分时图
      if (state.phase === 'am_trading' || state.phase === 'pm_trading') {
        return; // 锁定分时图
      }
      set({ chartView: view });
    },

    toggleMA: (key: keyof MAVisible) => {
      const state = get();
      set({ maVisible: { ...state.maVisible, [key]: !state.maVisible[key] } });
    },

    // ==================== 回合推进 ====================

    advancePhase: () => {
      const state = get();
      if (state.gameStatus !== 'playing') return;

      if (state.phase === 'settlement') {
        // 进入下一天
        const nextDay = state.day + 1;
        const staminaBonus = sumCardEffects(state.cards, 'stamina_bonus');
        const baseStamina = 3 + staminaBonus + state.extraStaminaNextDay;

        const { triggered, remaining } = checkEventChains(nextDay, state.activeEventChains);
        const chainEvent = triggered.length > 0 ? triggered[0] : null;
        const todayEvent = chainEvent || rollEvent();
        const eventMod = getEventStockModifier(todayEvent);

        const cashFromEvent = getEventCashChange(todayEvent);
        const expenseFromEvent = getEventExpenseChange(todayEvent);
        const staminaFromEvent = getEventStaminaChange(todayEvent);
        const cardFromEvent = getEventCard(todayEvent);
        const chainId = getEventChainId(todayEvent);

        const newChains = [...remaining];
        if (chainId) {
          newChains.push({ eventId: chainId, triggerDay: nextDay + 1 + Math.floor(Math.random() * 2) });
        }

        let pendingCard: PendingCard | null = null;
        let newCards = state.cards;
        if (cardFromEvent) {
          const result = addCard(state.cards, cardFromEvent, state.maxCardSlots);
          if (result === null) {
            pendingCard = { card: cardFromEvent };
          } else {
            newCards = result;
          }
        }

        const newStamina = Math.max(0, baseStamina + staminaFromEvent);

        set({
          day: nextDay,
          phase: 'morning_news',
          currentEvent: todayEvent,
          eventLog: [...state.eventLog, { day: nextDay, event: todayEvent }],
          cash: state.cash + cashFromEvent,
          dailyExpense: Math.max(100, state.dailyExpense + expenseFromEvent),
          stamina: newStamina,
          maxStamina: baseStamina,
          boughtToday: false,
          activitiesDoneToday: [],
          activeEventChains: newChains,
          cards: newCards,
          pendingCard,
          eventModifier: eventMod,
          extraStaminaNextDay: 0,
          messages: [
            `=== 第 ${nextDay - state.historyDays} 天 ===`,
            `📰 ${todayEvent.title}`,
            todayEvent.description,
          ],
          lunchHint: null,
          intradayTicks: [],
          currentTick: 0,
          chartView: 'intraday',
        });
        return;
      }

      if (state.phase === 'morning_news') {
        // 进入上午交易：预生成全天分时数据
        const prevClose = state.currentPrice;
        const trend = getTrendForDay(state.day, state.trendSegments);
        const ticks = generateIntradayTicks(prevClose, trend, state.eventModifier);
        const openPrice = ticks[0].price;

        set({
          phase: 'am_trading',
          todayOpen: openPrice,
          currentPrice: openPrice,
          intradayTicks: ticks,
          currentTick: 0,
          playbackSpeed: 1 as PlaybackSpeed,
          chartView: 'intraday',
          messages: [
            `📈 开盘价: ¥${openPrice.toFixed(2)} ${openPrice >= prevClose ? '↑' : '↓'}`,
            '盘中实时交易已开始，可随时买入/卖出',
          ],
        });

        // 启动播放
        setTimeout(() => get().actions.startPlayback(), 50);
        return;
      }

      if (state.phase === 'lunch_break') {
        // 进入下午交易：从PM_START_TICK继续
        set({
          phase: 'pm_trading',
          currentTick: PM_START_TICK,
          chartView: 'intraday',
          messages: ['📈 下午开盘，继续交易'],
        });

        setTimeout(() => get().actions.startPlayback(), 50);
        return;
      }

      if (state.phase === 'after_hours') {
        get().actions.finishAfterHours();
        return;
      }
    },

    // ==================== 交易 ====================

    buy: (shares: number) => {
      const state = get();
      const cost = shares * state.currentPrice;
      if (cost > state.cash || shares <= 0) return;

      const totalCost = state.shareCostBasis * state.shares + cost;
      const totalShares = state.shares + shares;

      set({
        cash: Math.round((state.cash - cost) * 100) / 100,
        shares: totalShares,
        shareCostBasis: Math.round((totalCost / totalShares) * 100) / 100,
        boughtToday: true,
        messages: [`✅ 买入 ${shares} 股 @ ¥${state.currentPrice.toFixed(2)}，花费 ¥${cost.toFixed(2)}`],
      });
    },

    sell: (shares: number) => {
      const state = get();
      if (shares > state.shares || shares <= 0) return;
      if (state.boughtToday) {
        set({ messages: ['❌ T+1规则：今日买入的股票明天才能卖出！'] });
        return;
      }

      const revenue = shares * state.currentPrice;
      const sellBonus = sumCardEffects(state.cards, 'sell_bonus');
      const bonus = revenue * sellBonus;
      const total = revenue + bonus;
      const remainingShares = state.shares - shares;

      set({
        cash: Math.round((state.cash + total) * 100) / 100,
        shares: remainingShares,
        shareCostBasis: remainingShares > 0 ? state.shareCostBasis : 0,
        messages: [
          `✅ 卖出 ${shares} 股 @ ¥${state.currentPrice.toFixed(2)}，获得 ¥${total.toFixed(2)}${bonus > 0 ? ` (含加成 +¥${bonus.toFixed(2)})` : ''}`,
        ],
      });
    },

    // ==================== 活动 ====================

    doActivity: (activityId: string) => {
      const state = get();
      const costs: Record<string, number> = { social_media: 1, research: 1, socializing: 2, side_hustle: 1 };
      const cost = costs[activityId] ?? 0;
      if (state.stamina < cost) {
        set({ messages: ['❌ 体力不足！'] });
        return;
      }
      if (state.activitiesDoneToday.includes(activityId)) {
        set({ messages: ['❌ 今天已经做过了！'] });
        return;
      }

      const result = executeActivity(activityId, state.cash, state.cards);
      const updates: Partial<StoreState> = {
        stamina: state.stamina - cost,
        activitiesDoneToday: [...state.activitiesDoneToday, activityId],
        messages: [result.message],
      };

      if (result.cashChange) updates.cash = Math.round((state.cash + result.cashChange) * 100) / 100;
      if (result.staminaChange) updates.extraStaminaNextDay = (state.extraStaminaNextDay || 0) + result.staminaChange;
      if (result.infoHint) updates.lunchHint = result.infoHint;
      if (result.card) {
        const cardResult = addCard(state.cards, result.card, state.maxCardSlots);
        if (cardResult === null) updates.pendingCard = { card: result.card };
        else updates.cards = cardResult;
      }

      set(updates as StoreState);
    },

    finishAfterHours: () => {
      const state = get();
      const expenseReduction = sumCardEffects(state.cards, 'expense_reduce');
      const actualExpense = Math.max(50, state.dailyExpense - expenseReduction);
      const newCash = Math.round((state.cash - actualExpense) * 100) / 100;
      const totalAssets = newCash + state.shares * state.currentPrice;
      const newPeak = Math.max(state.peakAssets, totalAssets);

      let gameStatus = state.gameStatus;
      const messages: string[] = [
        `💸 今日生活费: -¥${actualExpense}`,
        `💰 剩余现金: ¥${newCash.toFixed(2)}`,
        `📊 总资产: ¥${totalAssets.toFixed(2)} / 目标 ¥${state.goal.targetAmount.toLocaleString()}`,
      ];

      if (totalAssets >= state.goal.targetAmount) {
        gameStatus = 'won';
        messages.push(`🎉 恭喜！你达成了目标【${state.goal.title}】！`);
      } else if (totalAssets < actualExpense) {
        gameStatus = 'lost';
        messages.push('💀 破产了！连生活费都付不起了...');
      } else if (newCash < 0) {
        messages.push('⚠️ 警告：现金已为负！请尽快卖出股票回笼资金！');
      }

      set({
        phase: 'settlement',
        cash: newCash,
        gameStatus,
        peakAssets: newPeak,
        totalTradingDays: state.totalTradingDays + 1,
        messages,
      });

      if (gameStatus === 'playing') {
        setTimeout(() => get().actions.saveGame(), 0);
      } else {
        localStorage.removeItem(SAVE_KEY);
      }
    },

    // ==================== 卡牌 ====================

    replaceCardAt: (index: number, newCard: Card) => {
      set({ cards: replaceCard(get().cards, index, newCard), pendingCard: null });
    },

    dismissPendingCard: () => set({ pendingCard: null }),

    addMessage: (msg: string) => set(state => ({ messages: [...state.messages, msg] })),

    getTotalAssets: () => {
      const s = get();
      return Math.round((s.cash + s.shares * s.currentPrice) * 100) / 100;
    },
  },
}));
