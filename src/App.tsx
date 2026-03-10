import { useState, useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { sumCardEffects } from './engine/CardSystem';
import { StatusBar } from './components/StatusBar';
import { KLineChart } from './components/KLineChart';
import { TradingPanel } from './components/TradingPanel';
import { EventDisplay } from './components/EventDisplay';
import { CardSlots } from './components/CardSlots';
import { ActivityPanel } from './components/ActivityPanel';
import { PnLPanel } from './components/PnLPanel';
import { MainMenu } from './components/MainMenu';
import { GameOver } from './components/GameOver';
import { MessageLog } from './components/MessageLog';
import { EventLog } from './components/EventLog';
import { NewsWaterfall } from './components/NewsWaterfall';
import { Calendar } from './components/Calendar';
import { PlayerActions } from './components/PlayerActions';
import { JobPanel } from './components/JobPanel';
import { OrderPanel } from './components/OrderPanel';
import { FlashEventModal } from './components/FlashEventModal';

function GameScreen() {
  const { gameStatus, job, calendar, cards } = useGameStore();
  const { toggleSlacking } = useGameStore(s => s.actions);

  if (gameStatus !== 'playing') return null;

  // 上班时间且不在摸鱼 → 遮盖盘面（除非有分身术卡牌）
  const hasSkipWorkCheck = sumCardEffects(cards, 'skip_work_check') > 0;
  const isWorkBlocked = job.employed && job.isWorkingHours && !job.isSlacking && !hasSkipWorkCheck;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <StatusBar />
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧：K线图 + 交易面板 + 盈亏面板 */}
          <div className="lg:col-span-2 space-y-4 relative">
            {isWorkBlocked && (
              <div className="absolute inset-0 z-20 bg-[#0a0a0f]/95 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-4 border border-gray-800">
                <div className="text-center">
                  <span className="text-6xl block mb-4">🏢</span>
                  <p className="text-white font-bold text-xl mb-2">认真工作中...</p>
                  <p className="text-gray-400 text-sm mb-1">上班时间不能看盘！</p>
                  <p className="text-gray-500 text-xs mb-4">想看盘和交易？先开启摸鱼模式！</p>
                  <div className="flex flex-col gap-2 items-center">
                    <button
                      onClick={toggleSlacking}
                      className="px-6 py-2.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-bold text-sm transition-colors"
                    >
                      🐟 开始摸鱼（有风险！）
                    </button>
                    <p className="text-gray-600 text-xs">
                      ⚠️ 摸鱼会降低工作进度，影响今日工资
                    </p>
                  </div>
                </div>
              </div>
            )}
            <KLineChart />
            <TradingPanel />
            <OrderPanel />
            <PnLPanel />
          </div>

          {/* 右侧：日历 + 工作 + 角色操作 + 活动 + 事件 + 卡牌 + 消息 */}
          <div className="space-y-4">
            <Calendar />
            <JobPanel />
            <PlayerActions />
            <ActivityPanel />
            <EventDisplay />
            <CardSlots />
            <MessageLog />
            <EventLog />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const handler = () => {
      setShaking(true);
      setTimeout(() => setShaking(false), 800);
    };
    window.addEventListener('screen-shake', handler);
    return () => window.removeEventListener('screen-shake', handler);
  }, []);

  return (
    <div className={shaking ? 'animate-shakeScreen' : ''}>
      <MainMenu />
      <GameScreen />
      <GameOver />
      <NewsWaterfall />
      <FlashEventModal />
    </div>
  );
}

export default App;
