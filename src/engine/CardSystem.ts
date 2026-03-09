import type { Card, CardEffect, CardEffectType } from '../types';

/** 添加卡牌，如果槽位满则返回false */
export function addCard(cards: Card[], newCard: Card, maxSlots: number): Card[] | null {
  if (cards.some(c => c.id === newCard.id)) return cards; // 已有
  if (cards.length >= maxSlots) return null; // 需要玩家选择替换
  return [...cards, newCard];
}

/** 替换指定槽位的卡牌 */
export function replaceCard(cards: Card[], index: number, newCard: Card): Card[] {
  const next = [...cards];
  next[index] = newCard;
  return next;
}

/** 移除卡牌 */
export function removeCard(cards: Card[], cardId: string): Card[] {
  return cards.filter(c => c.id !== cardId);
}

/** 汇总所有被动卡牌的某类效果 */
export function sumCardEffects(cards: Card[], effectType: CardEffectType): number {
  return cards
    .filter(c => c.type === 'passive')
    .flatMap(c => c.effects)
    .filter(e => e.type === effectType)
    .reduce((sum, e) => sum + e.value, 0);
}

/** 获取所有被动效果列表 */
export function getAllPassiveEffects(cards: Card[]): CardEffect[] {
  return cards
    .filter(c => c.type === 'passive')
    .flatMap(c => c.effects);
}

/** 使用主动卡（扣除使用次数） */
export function useActiveCard(cards: Card[], cardId: string): Card[] {
  return cards.map(c => {
    if (c.id === cardId && c.type === 'active' && c.usesRemaining && c.usesRemaining > 0) {
      return { ...c, usesRemaining: c.usesRemaining - 1 };
    }
    return c;
  }).filter(c => !(c.type === 'active' && c.usesRemaining !== undefined && c.usesRemaining <= 0));
}
