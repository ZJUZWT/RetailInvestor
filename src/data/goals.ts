import type { Goal } from '../types';

export const GOALS: Goal[] = [
  {
    id: 'milk_tea',
    title: '开一家奶茶店',
    targetAmount: 500000,
    description: '攒够50万，在小区门口开一家奶茶店，从此告别股市。',
  },
  {
    id: 'mother_in_law_house',
    title: '给丈母娘买房首付',
    targetAmount: 2000000,
    description: '丈母娘说了，200万首付到位才能领证。时间紧迫！',
  },
  {
    id: 'iceland',
    title: '去冰岛看极光',
    targetAmount: 300000,
    description: '人生短暂，攒够30万就辞职去冰岛看极光！',
  },
  {
    id: 'lambo',
    title: '提一辆兰博基尼',
    targetAmount: 5000000,
    description: '500万到手，直接去4S店提一辆大牛，从此走上人生巅峰。',
  },
  {
    id: 'freedom',
    title: '财务自由躺平',
    targetAmount: 3000000,
    description: '300万存银行吃利息，每个月躺赚，再也不上班了。',
  },
];

export function getRandomGoal(): Goal {
  return GOALS[Math.floor(Math.random() * GOALS.length)];
}
