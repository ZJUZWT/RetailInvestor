import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import type { OrderType } from '../types';

export function OrderPanel() {
  const { pendingOrders, currentPrice, cash, shares, gameStatus } = useGameStore();
  const { placeOrder, cancelOrder } = useGameStore(s => s.actions);
  const [showForm, setShowForm] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('limit_buy');
  const [price, setPrice] = useState('');
  const [orderShares, setOrderShares] = useState('');

  if (gameStatus !== 'playing') return null;

  const activeOrders = (pendingOrders ?? []).filter(o => !o.executed);

  const handleSubmit = () => {
    const p = parseFloat(price);
    const s = parseInt(orderShares);
    if (isNaN(p) || p <= 0 || isNaN(s) || s <= 0 || s % 100 !== 0) return;

    placeOrder({ type: orderType, triggerPrice: p, shares: s });
    setPrice('');
    setOrderShares('');
    setShowForm(false);
  };

  const typeLabels: Record<OrderType, { label: string; emoji: string; color: string }> = {
    limit_buy: { label: '限价买入', emoji: '📈', color: 'text-red-400' },
    limit_sell: { label: '限价卖出', emoji: '📉', color: 'text-green-400' },
    stop_loss: { label: '止损', emoji: '🛡️', color: 'text-orange-400' },
    take_profit: { label: '止盈', emoji: '🎯', color: 'text-yellow-400' },
  };

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold">📋 挂单</h3>
        <span className="text-xs text-gray-500">{activeOrders.length}/3</span>
      </div>

      {/* 活跃挂单列表 */}
      {activeOrders.length > 0 ? (
        <div className="space-y-2 mb-3">
          {activeOrders.map(order => {
            const info = typeLabels[order.type];
            return (
              <div key={order.id} className="flex items-center justify-between bg-[#1a1a2e] rounded p-2 border border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{info.emoji}</span>
                  <div>
                    <span className={`text-xs font-bold ${info.color}`}>{info.label}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {order.shares}股 @ ¥{order.triggerPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => cancelOrder(order.id)}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-600 text-xs mb-3 text-center">暂无挂单</p>
      )}

      {/* 新增挂单 */}
      {!showForm ? (
        <button
          onClick={() => {
            setShowForm(true);
            setPrice(currentPrice.toFixed(2));
          }}
          disabled={activeOrders.length >= 3}
          className="w-full py-2 bg-[#1a1a2e] hover:bg-[#252540] text-gray-300 rounded text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          + 新挂单
        </button>
      ) : (
        <div className="bg-[#1a1a2e] rounded p-3 border border-gray-700 space-y-2">
          {/* 挂单类型 */}
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(typeLabels) as OrderType[]).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  orderType === type
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-600/50'
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              >
                {typeLabels[type].emoji} {typeLabels[type].label}
              </button>
            ))}
          </div>

          {/* 价格 */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">触发价格</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 outline-none"
              placeholder={`当前 ¥${currentPrice.toFixed(2)}`}
            />
          </div>

          {/* 股数 */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">股数（100的整数倍）</label>
            <input
              type="number"
              step="100"
              min="100"
              value={orderShares}
              onChange={e => setOrderShares(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 outline-none"
              placeholder={orderType === 'limit_buy' ? `最多 ${Math.floor(cash / currentPrice / 100) * 100}` : `最多 ${shares}`}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold transition-colors"
            >
              确认挂单
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
