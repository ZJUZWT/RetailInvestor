import { useGameStore } from '../stores/gameStore';

export function MessageLog() {
  const { messages } = useGameStore();

  if (messages.length === 0) return null;

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <h3 className="text-white font-bold mb-2 text-sm">📋 消息</h3>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {messages.map((msg, i) => (
          <p key={i} className="text-xs text-gray-400">
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
}
