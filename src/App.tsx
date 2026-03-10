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

/** 右侧标签页菜单 */
const RIGHT_TABS = [
  { id: 'job', emoji: '💼', label: '工作' },
  { id: 'player', emoji: '🎮', label: '角色' },
  { id: 'activity', emoji: '🎯', label: '活动' },
  { id: 'cards', emoji: '🃏', label: '卡牌' },
] as const;

type RightTabId = typeof RIGHT_TABS[number]['id'];

function GameScreen() {
  const { gameStatus, job, cards } = useGameStore();
  const { toggleSlacking } = useGameStore(s => s.actions);
  const [activeTab, setActiveTab] = useState<RightTabId>('job');

  if (gameStatus !== 'playing') return null;

  // 上班时间且不在摸鱼 → 遮盖盘面（除非有分身术卡牌）
  const hasSkipWorkCheck = sumCardEffects(cards, 'skip_work_check') > 0;
  const isWorkBlocked = job.employed && job.isWorkingHours && !job.isSlacking && !hasSkipWorkCheck;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <StatusBar />
      <div className="max-w-[1400px] mx-auto p-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

          {/* ====== 左区：K线 + 交易 ====== */}
          <div className="lg:col-span-5 space-y-3 relative">
            {/* 工作遮罩：精简为横幅条 */}
            {isWorkBlocked && (
              <div className="bg-[#0a0a0f]/95 backdrop-blur-sm rounded-lg border border-gray-800 p-3 flex items-center justify-between gap-3 z-20 relative">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">🏢</span>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm">认真工作中</p>
                    <p className="text-gray-500 text-xs truncate">上班时间不能看盘</p>
                  </div>
                </div>
                <button
                  onClick={toggleSlacking}
                  className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-bold text-xs transition-colors shrink-0"
                >
                  🐟 摸鱼
                </button>
              </div>
            )}
            {/* K线图在工作时模糊化 */}
            <div className={isWorkBlocked ? 'blur-sm pointer-events-none select-none' : ''}>
              <KLineChart />
            </div>
            <TradingPanel />
            <OrderPanel />
            <PnLPanel />
          </div>

          {/* ====== 中区：消息 + 日历 + 事件 ====== */}
          <div className="lg:col-span-4 space-y-3">
            <MessageLog />
            <Calendar />
            <EventDisplay />
            <EventLog />
          </div>

          {/* ====== 右区：标签页菜单 ====== */}
          <div className="lg:col-span-3">
            {/* 标签栏 */}
            <div className="flex bg-[#0e0e18] rounded-t-lg border border-gray-800 border-b-0 overflow-hidden">
              {RIGHT_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 text-xs font-bold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#1a1a2e] text-white border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-[#12121f]'
                  }`}
                >
                  <span className="block text-base leading-none mb-0.5">{tab.emoji}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 标签内容 */}
            <div className="bg-[#0e0e18] rounded-b-lg border border-gray-800 border-t-0 min-h-[200px]">
              {activeTab === 'job' && <JobPanel />}
              {activeTab === 'player' && <PlayerActions />}
              {activeTab === 'activity' && <ActivityPanel />}
              {activeTab === 'cards' && <CardSlots />}
            </div>
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
