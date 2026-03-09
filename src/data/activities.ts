import type { Activity } from '../types';

export const ACTIVITIES: Activity[] = [
  {
    id: 'social_media',
    name: '刷社交媒体',
    emoji: '📱',
    staminaCost: 1,
    description: '刷刷抖音微博雪球，看看大V们怎么说（信不信由你）',
  },
  {
    id: 'research',
    name: '复盘研究',
    emoji: '📊',
    staminaCost: 1,
    description: '认真看看K线和财报，获取较可靠的明日信息',
  },
  {
    id: 'socializing',
    name: '社交应酬',
    emoji: '🤝',
    staminaCost: 2,
    description: '请人吃饭套消息，可能获得内幕或卡牌（但要花钱）',
  },
  {
    id: 'side_hustle',
    name: '搞副业',
    emoji: '🎰',
    staminaCost: 1,
    description: '搞点副业赚外快，可能赚也可能亏（最后的翻盘机会）',
  },
  {
    id: 'rest',
    name: '早点休息',
    emoji: '😴',
    staminaCost: 0,
    description: '养精蓄锐，明天体力+1',
  },
];
