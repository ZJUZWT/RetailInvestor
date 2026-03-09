# UI 动效增强实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为"散户大冒险"全面添加 UI 动画和视觉反馈效果，提升游戏表现力。

**Architecture:** 在 `src/index.css` 定义所有 `@keyframes` 和动画工具类，组件中通过 className 引用。唯一新增 JS 文件是 `src/hooks/useCountUp.ts`（计数滚动 hook）。通过 `App.tsx` 的包裹 div 实现全局震屏效果。不修改 engine/ 和 stores/。

**Tech Stack:** React 19 + TypeScript + Tailwind CSS 4 + CSS @keyframes

**验证方式:** `npm run build`（tsc + vite build），无测试框架。

---

### Task 1: CSS 动画基础层（index.css）

**Files:**
- Modify: `src/index.css`

**Step 1: 在 index.css 中添加所有 @keyframes 和工具类**

在现有 `.animate-fadeIn` 之后，追加以下内容：

```css
/* === 入场动画 === */
@keyframes scaleIn {
  0% { opacity: 0; transform: scale(0.8); }
  70% { opacity: 1; transform: scale(1.05); }
  100% { transform: scale(1); }
}
.animate-scaleIn {
  animation: scaleIn 0.5s ease-out;
}

/* === 震屏 === */
@keyframes shakeScreen {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-8px, -4px); }
  20% { transform: translate(8px, 4px); }
  30% { transform: translate(-6px, 6px); }
  40% { transform: translate(6px, -6px); }
  50% { transform: translate(-4px, 4px); }
  60% { transform: translate(4px, -4px); }
  70% { transform: translate(-2px, 2px); }
  80% { transform: translate(2px, -2px); }
  90% { transform: translate(-1px, 1px); }
}
.animate-shakeScreen {
  animation: shakeScreen 0.8s ease-out;
}

/* === 光晕脉冲 === */
@keyframes glowPulseBlue {
  0%, 100% { box-shadow: 0 0 8px rgba(74, 158, 255, 0.3); }
  50% { box-shadow: 0 0 20px rgba(74, 158, 255, 0.7), 0 0 40px rgba(74, 158, 255, 0.3); }
}
.animate-glowPulseBlue {
  animation: glowPulseBlue 1.5s ease-in-out infinite;
}

@keyframes glowPulseGold {
  0%, 100% { box-shadow: 0 0 10px rgba(255, 179, 64, 0.4); }
  50% { box-shadow: 0 0 30px rgba(255, 179, 64, 0.8), 0 0 60px rgba(255, 179, 64, 0.4); }
}
.animate-glowPulseGold {
  animation: glowPulseGold 1.5s ease-in-out infinite;
}

/* === 价格闪烁 === */
@keyframes priceFlashRed {
  0% { background-color: transparent; }
  30% { background-color: rgba(239, 68, 68, 0.25); }
  100% { background-color: transparent; }
}
@keyframes priceFlashGreen {
  0% { background-color: transparent; }
  30% { background-color: rgba(34, 197, 94, 0.25); }
  100% { background-color: transparent; }
}
.animate-priceFlashRed {
  animation: priceFlashRed 0.5s ease-out;
}
.animate-priceFlashGreen {
  animation: priceFlashGreen 0.5s ease-out;
}

/* === 高亮闪烁 === */
@keyframes flashHighlight {
  0% { background-color: transparent; }
  25% { background-color: rgba(250, 204, 21, 0.2); }
  100% { background-color: transparent; }
}
.animate-flashHighlight {
  animation: flashHighlight 0.5s ease-out;
}

/* === Toast 滑入/淡出 === */
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.animate-slideInRight {
  animation: slideInRight 0.3s ease-out;
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
.animate-fadeOut {
  animation: fadeOut 0.3s ease-in forwards;
}

/* === 弹跳入场 === */
@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.1); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); }
}
.animate-bounceIn {
  animation: bounceIn 0.5s ease-out;
}

/* === 卡牌翻转 === */
@keyframes cardFlip {
  0% { transform: perspective(600px) rotateY(180deg); opacity: 0; }
  40% { opacity: 1; }
  100% { transform: perspective(600px) rotateY(0deg); opacity: 1; }
}
.animate-cardFlip {
  animation: cardFlip 0.6s ease-out;
  backface-visibility: hidden;
}

/* === 缩小淡出 === */
@keyframes fadeScaleOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.8); }
}
.animate-fadeScaleOut {
  animation: fadeScaleOut 0.3s ease-in forwards;
}

/* === 弹窗动画 === */
@keyframes backdropFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-backdropFadeIn {
  animation: backdropFadeIn 0.3s ease-out;
}

@keyframes modalBounceIn {
  0% { opacity: 0; transform: scale(0.8) translateY(20px); }
  60% { opacity: 1; transform: scale(1.03) translateY(-5px); }
  100% { transform: scale(1) translateY(0); }
}
.animate-modalBounceIn {
  animation: modalBounceIn 0.4s ease-out;
}

/* === 主菜单呼吸浮动 === */
@keyframes floatPulse {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.animate-floatPulse {
  animation: floatPulse 3s ease-in-out infinite;
}

/* === 涨停/跌停脉冲光晕 === */
@keyframes pulseGlowRed {
  0%, 100% { text-shadow: 0 0 4px rgba(239, 68, 68, 0.5); }
  50% { text-shadow: 0 0 16px rgba(239, 68, 68, 1), 0 0 32px rgba(239, 68, 68, 0.5); }
}
@keyframes pulseGlowGreen {
  0%, 100% { text-shadow: 0 0 4px rgba(34, 197, 94, 0.5); }
  50% { text-shadow: 0 0 16px rgba(34, 197, 94, 1), 0 0 32px rgba(34, 197, 94, 0.5); }
}
.animate-pulseGlowRed {
  animation: pulseGlowRed 1s ease-in-out infinite;
}
.animate-pulseGlowGreen {
  animation: pulseGlowGreen 1s ease-in-out infinite;
}

/* === 金色光芒覆盖层 === */
@keyframes goldenBurst {
  0% { opacity: 0; transform: scale(0.5); }
  30% { opacity: 0.8; }
  100% { opacity: 0; transform: scale(2.5); }
}
.legendary-burst::before {
  content: '';
  position: absolute;
  inset: -50%;
  background: radial-gradient(circle, rgba(255, 179, 64, 0.4) 0%, transparent 70%);
  animation: goldenBurst 1s ease-out;
  pointer-events: none;
}
```

**Step 2: 验证构建**

Run: `npm run build`
Expected: 成功，无错误

**Step 3: 提交**

```bash
git add src/index.css
git commit -m "style: add CSS keyframes and animation utility classes for UI effects"
```

---

### Task 2: useCountUp Hook

**Files:**
- Create: `src/hooks/useCountUp.ts`

**Step 1: 创建 useCountUp hook**

```typescript
import { useState, useEffect, useRef } from 'react';

export function useCountUp(target: number, duration = 1500, decimals = 2): string {
  const [current, setCurrent] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startValueRef.current = current;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = startValueRef.current + (target - startValueRef.current) * eased;
      setCurrent(value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current.toFixed(decimals);
}
```

**Step 2: 验证构建**

Run: `npm run build`
Expected: 成功

**Step 3: 提交**

```bash
git add src/hooks/useCountUp.ts
git commit -m "feat: add useCountUp hook for animated number counting"
```

---

### Task 3: 事件弹出动画 + 震屏（EventDisplay + MorningNews + App）

**Files:**
- Modify: `src/components/EventDisplay.tsx` — 稀有度分级动画
- Modify: `src/components/MorningNews.tsx` — 事件入场动画
- Modify: `src/App.tsx` — 震屏 wrapper

**Step 1: 修改 EventDisplay.tsx**

为不同稀有度应用不同动画类：
- common: `animate-fadeIn`（保留现有）
- rare: `animate-fadeIn` + `animate-glowPulseBlue`
- legendary: `animate-scaleIn` + `animate-glowPulseGold` + 金色光芒覆盖 + 触发全局震屏

需要添加：
- 根据 `currentEvent.rarity` 选择动画 className
- 传说级事件加 `legendary-burst` 伪元素（需要 `position: relative` 和 `overflow: hidden`）
- 用 `useEffect` + `CustomEvent` 触发全局震屏

关键代码变更：
```tsx
import { useEffect } from 'react';
// ...

// 根据稀有度选择动画
const animClass =
  currentEvent.rarity === 'legendary' ? 'animate-scaleIn animate-glowPulseGold' :
  currentEvent.rarity === 'rare' ? 'animate-fadeIn animate-glowPulseBlue' :
  'animate-fadeIn';

// 传说级触发震屏
useEffect(() => {
  if (currentEvent?.rarity === 'legendary') {
    window.dispatchEvent(new CustomEvent('screen-shake'));
  }
}, [currentEvent]);

// 在 JSX 中 className 加上 animClass，传说级加 relative overflow-hidden + legendary-burst 子元素
```

**Step 2: 修改 MorningNews.tsx**

在事件显示区域应用同样的稀有度动画逻辑（与 EventDisplay 类似），用 `key={currentEvent?.id}` 确保事件切换时动画重播。

**Step 3: 修改 App.tsx**

在 `GameScreen` 外包一层 div，监听 `screen-shake` CustomEvent，触发时添加 `animate-shakeScreen` class，动画结束后移除：

```tsx
const [shaking, setShaking] = useState(false);

useEffect(() => {
  const handler = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 800);
  };
  window.addEventListener('screen-shake', handler);
  return () => window.removeEventListener('screen-shake', handler);
}, []);

// <div className={shaking ? 'animate-shakeScreen' : ''}>
```

**Step 4: 验证构建**

Run: `npm run build`
Expected: 成功

**Step 5: 提交**

```bash
git add src/components/EventDisplay.tsx src/components/MorningNews.tsx src/App.tsx
git commit -m "feat: add rarity-based event animations with legendary screen shake"
```

---

### Task 4: 股价涨跌动画 + 涨停跌停提示（KLineChart）

**Files:**
- Modify: `src/components/KLineChart.tsx`

**Step 1: 添加价格闪烁动画**

在 KLineChart 头部价格显示区域：
- 用 `useRef` 保存上一个价格，比较方向
- 价格变化时通过 `key={currentPrice}` 触发 `animate-priceFlashRed` 或 `animate-priceFlashGreen`
- 给价格数字容器加 `rounded px-2` 让闪烁背景有形状

关键代码变更：
```tsx
const prevPriceRef = useRef(currentPrice);
const priceDirection = currentPrice > prevPriceRef.current ? 'up' : currentPrice < prevPriceRef.current ? 'down' : 'flat';

useEffect(() => {
  prevPriceRef.current = currentPrice;
}, [currentPrice]);

const priceFlashClass =
  priceDirection === 'up' ? 'animate-priceFlashRed' :
  priceDirection === 'down' ? 'animate-priceFlashGreen' : '';
```

**Step 2: 添加涨停/跌停提示**

- 计算 `isLimitUp = changePercent >= 9.9` 和 `isLimitDown = changePercent <= -9.9`
- 涨停时价格数字加 `animate-pulseGlowRed`，旁边显示红色"涨停！"角标（`animate-bounceIn`）
- 跌停时价格数字加 `animate-pulseGlowGreen`，旁边显示绿色"跌停！"角标

```tsx
const isLimitUp = changePercent >= 9.9;
const isLimitDown = changePercent <= -9.9;

// 价格元素上:
// className 追加 isLimitUp ? 'animate-pulseGlowRed' : isLimitDown ? 'animate-pulseGlowGreen' : ''

// 旁边显示角标:
// {isLimitUp && <span className="animate-bounceIn text-red-500 font-black text-sm ml-2">涨停！</span>}
// {isLimitDown && <span className="animate-bounceIn text-green-500 font-black text-sm ml-2">跌停！</span>}
```

**Step 3: 验证构建**

Run: `npm run build`
Expected: 成功

**Step 4: 提交**

```bash
git add src/components/KLineChart.tsx
git commit -m "feat: add price flash animation and limit-up/down indicators"
```

---

### Task 5: 交易操作反馈（TradingPanel）

**Files:**
- Modify: `src/components/TradingPanel.tsx`

**Step 1: 添加 Toast 通知系统**

在 TradingPanel 内部用 `useState` 管理 toast 列表：

```tsx
const [toasts, setToasts] = useState<{ id: number; message: string; type: 'buy' | 'sell' }[]>([]);
let toastId = useRef(0);

const showToast = (message: string, type: 'buy' | 'sell') => {
  const id = toastId.current++;
  setToasts(prev => [...prev, { id, message, type }]);
  setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2300);
};
```

修改 `handleBuy` 和 `handleSell`，在成功后调用 `showToast`：
```tsx
const handleBuy = () => {
  if (shareAmount > 0 && shareAmount <= maxBuyShares) {
    buy(shareAmount);
    showToast(`买入 ${shareAmount} 股 ¥${(shareAmount * currentPrice).toFixed(0)}`, 'buy');
    setAmount('');
  }
};
```

在 JSX 中渲染 Toast：
```tsx
{/* Toast 通知 */}
<div className="fixed top-4 right-4 z-50 space-y-2">
  {toasts.map(toast => (
    <div
      key={toast.id}
      className={`animate-slideInRight px-4 py-2 rounded-lg text-sm font-bold shadow-lg ${
        toast.type === 'buy' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
      }`}
    >
      {toast.type === 'buy' ? '📈' : '📉'} {toast.message}
    </div>
  ))}
</div>
```

**Step 2: 添加现金/股数变化高亮**

用 `useRef` 记录上一次的 cash 和 shares 值，变化时用 `key` 触发 `animate-flashHighlight`：

```tsx
const prevCashRef = useRef(cash);
const prevSharesRef = useRef(shares);
const cashChanged = cash !== prevCashRef.current;
const sharesChanged = shares !== prevSharesRef.current;

useEffect(() => { prevCashRef.current = cash; }, [cash]);
useEffect(() => { prevSharesRef.current = shares; }, [shares]);

// 在现金显示上:
// <span key={cash} className={`text-green-400 font-mono ${cashChanged ? 'animate-flashHighlight' : ''}`}>
```

**Step 3: 验证构建**

Run: `npm run build`
Expected: 成功

**Step 4: 提交**

```bash
git add src/components/TradingPanel.tsx
git commit -m "feat: add trading toast notifications and value change highlights"
```

---

### Task 6: 卡牌翻牌动画（CardSlots）

**Files:**
- Modify: `src/components/CardSlots.tsx`

**Step 1: 添加翻牌动画**

在 pendingCard 弹窗中：
- 弹窗背景加 `animate-backdropFadeIn`
- 弹窗内容加 `animate-modalBounceIn`
- 卡牌展示区域加 `animate-cardFlip`
- 用 `useState` 控制翻转状态，先显示卡背（0.1s 延迟后翻转）

卡牌背面样式（纯 CSS）：
```tsx
// 初始显示卡牌背面，然后翻转
const [flipped, setFlipped] = useState(false);
useEffect(() => {
  if (pendingCard) {
    setFlipped(false);
    const timer = setTimeout(() => setFlipped(true), 100);
    return () => clearTimeout(timer);
  }
}, [pendingCard]);
```

卡牌背面渲染：
```tsx
<div className={`rounded p-3 mb-4 ${flipped ? 'animate-cardFlip' : ''}`}
  style={{
    border: `2px solid ${RARITY_COLORS[pendingCard.card.rarity]}`,
    background: flipped
      ? `${RARITY_COLORS[pendingCard.card.rarity]}15`
      : `linear-gradient(135deg, #1a1a2e, #2a2a4e)`,
  }}
>
```

**Step 2: 已有卡牌添加入场动画**

每张卡牌用 `animate-fadeIn` 入场。

**Step 3: 验证构建**

Run: `npm run build`
Expected: 成功

**Step 4: 提交**

```bash
git add src/components/CardSlots.tsx
git commit -m "feat: add card flip animation for new card acquisition"
```

---

### Task 7: 结算计数滚动（Settlement）

**Files:**
- Modify: `src/components/Settlement.tsx`

**Step 1: 引入 useCountUp 并应用**

```tsx
import { useCountUp } from '../hooks/useCountUp';

// 在组件内:
const animatedAssets = useCountUp(totalAssets, 1500, 2);
const animatedProgress = useCountUp(parseFloat(progress), 1200, 1);
```

替换静态数字显示为动画值：
- `¥{totalAssets.toFixed(2)}` → `¥{animatedAssets}`
- `{progress}%` → `{animatedProgress}%`
- 现金和持仓市值也可以加动画

面板整体加 `animate-fadeIn` 入场。

**Step 2: 验证构建**

Run: `npm run build`
Expected: 成功

**Step 3: 提交**

```bash
git add src/components/Settlement.tsx
git commit -m "feat: add counting animation to settlement panel numbers"
```

---

### Task 8: 整体过渡动画（多个组件）

**Files:**
- Modify: `src/components/MorningNews.tsx` — 面板入场 `animate-fadeIn`
- Modify: `src/components/LunchBreak.tsx` — 面板入场 `animate-fadeIn`
- Modify: `src/components/ActivityPanel.tsx` — 面板入场 `animate-fadeIn`
- Modify: `src/components/GameOver.tsx` — 弹窗动画 + 计数器
- Modify: `src/components/MainMenu.tsx` — 标题浮动呼吸

**Step 1: 阶段面板入场动画**

MorningNews.tsx、LunchBreak.tsx、ActivityPanel.tsx：在最外层 div 加 `animate-fadeIn`。

例如 MorningNews.tsx:
```tsx
<div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4 animate-fadeIn">
```

LunchBreak.tsx 同理。
ActivityPanel.tsx 同理。

**Step 2: GameOver 弹窗动画**

- 背景遮罩层加 `animate-backdropFadeIn`
- 内容容器加 `animate-modalBounceIn`
- 统计数字（最终资产、峰值资产、完成度）用 `useCountUp`

```tsx
import { useCountUp } from '../hooks/useCountUp';

// 最终资产
const animatedAssets = useCountUp(totalAssets, 1500, 2);
const animatedPeak = useCountUp(peakAssets, 1500, 2);
const animatedCompletion = useCountUp(totalAssets / goal.targetAmount * 100, 1200, 1);

// 遮罩:
<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-backdropFadeIn">
// 内容:
<div className="bg-[#12121a] rounded-xl p-8 max-w-md mx-4 border border-gray-700 text-center animate-modalBounceIn">
```

**Step 3: MainMenu 标题呼吸浮动**

```tsx
<h1 className="text-6xl font-black text-white mb-2 animate-floatPulse">
  散户大冒险
</h1>
```

**Step 4: 验证构建**

Run: `npm run build`
Expected: 成功

**Step 5: 提交**

```bash
git add src/components/MorningNews.tsx src/components/LunchBreak.tsx src/components/ActivityPanel.tsx src/components/GameOver.tsx src/components/MainMenu.tsx
git commit -m "feat: add phase panel transitions, modal animations, and menu effects"
```

---

### Task 9: 最终验证

**Step 1: 完整构建验证**

Run: `npm run build`
Expected: 成功，0 errors

**Step 2: 验证无 engine/stores 变更**

Run: `git diff --name-only` 确认没有 `src/engine/` 或 `src/stores/` 下的文件被修改。

**Step 3: 最终提交（如有遗漏修改）**

确保所有改动都已提交。
