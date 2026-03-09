import type { Card } from '../types';

export const ALL_CARDS: Card[] = [
  // === 白色（常见）===
  {
    id: 'tech_analysis_101',
    name: '技术分析入门',
    emoji: '🔍',
    description: '午间信息准确率+15%',
    rarity: 'common',
    type: 'passive',
    effects: [{ type: 'info_accuracy', value: 0.15, description: '午间信息准确率提升15%' }],
  },
  {
    id: 'douyin_guru',
    name: '抖音股神关注',
    emoji: '📺',
    description: '每天获得一条"大师分析"（50%是反向指标）',
    rarity: 'common',
    type: 'passive',
    effects: [{ type: 'trend_hint', value: 0.5, description: '每日获得提示，50%概率反向' }],
  },
  {
    id: 'frugal_life',
    name: '极简生活',
    emoji: '🥦',
    description: '每日生活费减少50元',
    rarity: 'common',
    type: 'passive',
    effects: [{ type: 'expense_reduce', value: 50, description: '每日节省50元' }],
  },
  {
    id: 'morning_exercise',
    name: '晨跑达人',
    emoji: '🏃',
    description: '每日体力上限+1',
    rarity: 'common',
    type: 'passive',
    effects: [{ type: 'stamina_bonus', value: 1, description: '体力上限+1' }],
  },

  // === 蓝色（稀有）===
  {
    id: 'insider_connection',
    name: '老鼠仓门路',
    emoji: '🐀',
    description: '每3天有一次机会提前知道明日涨跌方向',
    rarity: 'rare',
    type: 'passive',
    effects: [{ type: 'trend_hint', value: 0.9, description: '每3天一次可靠提示' }],
  },
  {
    id: 'zen_hold',
    name: '佛系持股心法',
    emoji: '🧘',
    description: '涨停跌停时不触发情绪事件',
    rarity: 'rare',
    type: 'passive',
    effects: [{ type: 'info_accuracy', value: 0.25, description: '情绪稳定，判断更准' }],
  },
  {
    id: 'expense_negotiator',
    name: '砍价大师',
    emoji: '💪',
    description: '生活费增加事件效果减半',
    rarity: 'rare',
    type: 'passive',
    effects: [{ type: 'expense_reduce', value: 100, description: '生活费增幅减半' }],
  },

  // === 金色（传说）===
  {
    id: 'diamond_hands',
    name: '钻石手',
    emoji: '💎',
    description: '连续持仓不卖的每一天，下次卖出收益+2%（累计）',
    rarity: 'legendary',
    type: 'passive',
    effects: [{ type: 'sell_bonus', value: 0.02, description: '每持仓一天，卖出收益+2%' }],
  },
];

export function getCardById(id: string): Card | undefined {
  return ALL_CARDS.find(c => c.id === id);
}
