/**
 * Meta解锁系统 — 跨局持久化，解锁新内容，提升复玩动力
 */

import type { DeathCause } from '../types';

const META_KEY = 'retail_investor_meta';

// === 成就定义 ===
export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** 检查是否达成 */
  check: (stats: GameEndStats, meta: MetaState) => boolean;
  /** 解锁的奖励描述 */
  reward?: string;
}

export interface GameEndStats {
  isWin: boolean;
  totalAssets: number;
  peakAssets: number;
  totalTradingDays: number;
  deathCause: DeathCause | null;
  totalCaught: number;
  cards: string[];
}

export interface MetaState {
  totalGames: number;
  totalWins: number;
  totalDeaths: Record<string, number>;
  peakAssetsAllTime: number;
  totalCaughtAllTime: number;
  longestSurvival: number;
  shortestWin: number;
  achievements: string[];
  /** 最近一局解锁的成就 */
  lastUnlocked: string[];
}

function createInitialMeta(): MetaState {
  return {
    totalGames: 0,
    totalWins: 0,
    totalDeaths: {},
    peakAssetsAllTime: 0,
    totalCaughtAllTime: 0,
    longestSurvival: 0,
    shortestWin: Infinity,
    achievements: [],
    lastUnlocked: [],
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // === 入门成就 ===
  {
    id: 'first_game',
    name: '初入股市',
    emoji: '🎮',
    description: '完成第一局游戏',
    check: (_stats, meta) => meta.totalGames >= 1,
    reward: '解锁成就展示',
  },
  {
    id: 'first_win',
    name: '人生赢家',
    emoji: '🏆',
    description: '第一次达成目标',
    check: (stats) => stats.isWin,
    reward: '金色胜利特效',
  },
  {
    id: 'first_death',
    name: '韭菜的觉悟',
    emoji: '🌱',
    description: '第一次游戏失败',
    check: (stats) => !stats.isWin,
  },

  // === 生存成就 ===
  {
    id: 'survive_10',
    name: '坚韧的散户',
    emoji: '💪',
    description: '存活超过10个交易日',
    check: (stats) => stats.totalTradingDays >= 10,
  },
  {
    id: 'survive_30',
    name: '百战老兵',
    emoji: '🎖️',
    description: '存活超过30个交易日',
    check: (stats) => stats.totalTradingDays >= 30,
  },
  {
    id: 'survive_50',
    name: '不死鸟',
    emoji: '🔥',
    description: '存活超过50个交易日',
    check: (stats) => stats.totalTradingDays >= 50,
  },

  // === 财富成就 ===
  {
    id: 'peak_50k',
    name: '小有积蓄',
    emoji: '💰',
    description: '峰值资产超过¥50,000',
    check: (stats) => stats.peakAssets >= 50000,
  },
  {
    id: 'peak_100k',
    name: '十万户',
    emoji: '💎',
    description: '峰值资产超过¥100,000',
    check: (stats) => stats.peakAssets >= 100000,
  },
  {
    id: 'peak_500k',
    name: '半百万',
    emoji: '🏅',
    description: '峰值资产超过¥500,000',
    check: (stats) => stats.peakAssets >= 500000,
  },
  {
    id: 'peak_1m',
    name: '百万富翁',
    emoji: '👑',
    description: '峰值资产超过¥1,000,000',
    check: (stats) => stats.peakAssets >= 1000000,
  },

  // === 死亡成就 ===
  {
    id: 'death_bankrupt',
    name: '一夜回到解放前',
    emoji: '💸',
    description: '因破产而失败',
    check: (stats) => stats.deathCause === 'bankruptcy',
  },
  {
    id: 'death_starved',
    name: '炒股忘了吃饭',
    emoji: '🍚',
    description: '因饥饿而死亡',
    check: (stats) => stats.deathCause === 'starved',
  },
  {
    id: 'death_exhausted',
    name: '过劳死',
    emoji: '☠️',
    description: '因精力耗尽而猝死',
    check: (stats) => stats.deathCause === 'exhaustion',
  },
  {
    id: 'death_insane',
    name: '精神崩溃',
    emoji: '🤯',
    description: 'SAN值归零精神崩溃',
    check: (stats) => stats.deathCause === 'insanity',
  },
  {
    id: 'death_collector',
    name: '死法大全',
    emoji: '📚',
    description: '经历过所有四种死亡方式',
    check: (_stats, meta) => {
      const causes = ['bankruptcy', 'starved', 'exhaustion', 'insanity'];
      return causes.every(c => (meta.totalDeaths[c] ?? 0) > 0);
    },
    reward: '解锁死因统计面板',
  },

  // === 摸鱼成就 ===
  {
    id: 'caught_5',
    name: '惯犯',
    emoji: '👮',
    description: '累计被领导抓到5次',
    check: (_stats, meta) => meta.totalCaughtAllTime >= 5,
  },
  {
    id: 'caught_20',
    name: '摸鱼之王',
    emoji: '🐟',
    description: '累计被领导抓到20次',
    check: (_stats, meta) => meta.totalCaughtAllTime >= 20,
  },

  // === 速通成就 ===
  {
    id: 'speed_run_15',
    name: '速通高手',
    emoji: '⚡',
    description: '在15个交易日内达成目标',
    check: (stats) => stats.isWin && stats.totalTradingDays <= 15,
  },
  {
    id: 'speed_run_5',
    name: '闪电战',
    emoji: '🌩️',
    description: '在5个交易日内达成目标',
    check: (stats) => stats.isWin && stats.totalTradingDays <= 5,
  },

  // === 老手成就 ===
  {
    id: 'veteran_5',
    name: '常客',
    emoji: '🔄',
    description: '完成5局游戏',
    check: (_stats, meta) => meta.totalGames >= 5,
  },
  {
    id: 'veteran_10',
    name: '沉迷其中',
    emoji: '🎰',
    description: '完成10局游戏',
    check: (_stats, meta) => meta.totalGames >= 10,
  },
  {
    id: 'win_3',
    name: '稳定盈利',
    emoji: '📈',
    description: '累计赢得3局',
    check: (_stats, meta) => meta.totalWins >= 3,
  },
];

// === Meta 持久化 ===

export function loadMeta(): MetaState {
  try {
    const saved = localStorage.getItem(META_KEY);
    if (!saved) return createInitialMeta();
    const parsed = JSON.parse(saved);
    return { ...createInitialMeta(), ...parsed };
  } catch {
    return createInitialMeta();
  }
}

export function saveMeta(meta: MetaState): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

/**
 * 游戏结束时更新 Meta 进度，返回新解锁的成就
 */
export function updateMetaOnGameEnd(stats: GameEndStats): { meta: MetaState; newAchievements: Achievement[] } {
  const meta = loadMeta();

  // 更新统计
  meta.totalGames += 1;
  if (stats.isWin) {
    meta.totalWins += 1;
    meta.shortestWin = Math.min(meta.shortestWin, stats.totalTradingDays);
  }
  if (stats.deathCause) {
    meta.totalDeaths[stats.deathCause] = (meta.totalDeaths[stats.deathCause] ?? 0) + 1;
  }
  meta.peakAssetsAllTime = Math.max(meta.peakAssetsAllTime, stats.peakAssets);
  meta.totalCaughtAllTime += stats.totalCaught;
  meta.longestSurvival = Math.max(meta.longestSurvival, stats.totalTradingDays);

  // 检查新成就
  const newAchievements: Achievement[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!meta.achievements.includes(achievement.id)) {
      if (achievement.check(stats, meta)) {
        meta.achievements.push(achievement.id);
        newAchievements.push(achievement);
      }
    }
  }

  meta.lastUnlocked = newAchievements.map(a => a.id);

  // 保存
  saveMeta(meta);

  return { meta, newAchievements };
}

/**
 * 获取成就完成进度
 */
export function getAchievementProgress(): { total: number; unlocked: number; achievements: (Achievement & { unlocked: boolean })[] } {
  const meta = loadMeta();
  return {
    total: ACHIEVEMENTS.length,
    unlocked: meta.achievements.length,
    achievements: ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: meta.achievements.includes(a.id),
    })),
  };
}
