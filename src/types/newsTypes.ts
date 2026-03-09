// === 消息类型系统 ===

export type NewsSource = 'system' | 'csrc' | 'institution' | 'rumor' | 'breaking' | 'market_index' | 'social_media' | 'trade';
export type NewsPriority = 'normal' | 'important' | 'urgent';

export interface NewsMessage {
  id: number;
  text: string;
  source: NewsSource;
  priority: NewsPriority;
  timestamp: number;
  timeLabel?: string;
}

export const NEWS_SOURCE_CONFIG: Record<NewsSource, {
  label: string; emoji: string; color: string; bgColor: string; borderColor: string;
}> = {
  system:       { label: '系统',   emoji: '📋', color: '#9ca3af', bgColor: '#1a1a2e', borderColor: '#374151' },
  csrc:         { label: '证监会', emoji: '🏛️', color: '#ef4444', bgColor: '#2d1016', borderColor: '#991b1b' },
  institution:  { label: '机构',   emoji: '📊', color: '#3b82f6', bgColor: '#0e1a2e', borderColor: '#1e40af' },
  rumor:        { label: '传闻',   emoji: '🤫', color: '#9ca3af', bgColor: '#1a1a1a', borderColor: '#4b5563' },
  breaking:     { label: '突发',   emoji: '🔴', color: '#fbbf24', bgColor: '#2d2306', borderColor: '#b45309' },
  market_index: { label: '大盘',   emoji: '📈', color: '#a78bfa', bgColor: '#1a1028', borderColor: '#6d28d9' },
  social_media: { label: '热议',   emoji: '💬', color: '#f97316', bgColor: '#2d1a06', borderColor: '#c2410c' },
  trade:        { label: '交易',   emoji: '💰', color: '#22c55e', bgColor: '#0a2016', borderColor: '#166534' },
};

export interface ScheduledNews {
  tick: number;
  templateCategory: string;
  triggered: boolean;
}
