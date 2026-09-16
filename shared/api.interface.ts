export interface VocabWord {
  id: string;
  word: string;
  display: string;
  pos: string;
  zh: string;
  phonetic: string;
  definition: string;
  frq: number;
  note: string;
  academic: string;
  example: string;
  exampleZh: string;
  banks: string[];
  level: string;
}

export interface VocabWordWithProgress extends VocabWord {
  status: string;
  correctCount: number;
  wrongCount: number;
  familiarity: number;
  isFavorite: boolean;
  lastReviewedAt: string | null;
}

export interface WordListResponse {
  items: VocabWordWithProgress[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserStats {
  xp: number;
  level: number;
  streakDays: number;
  lastStudyDate: string | null;
  totalStudied: number;
  totalCorrect: number;
  totalWrong: number;
  maxStreak: number;
  totalQuizzes: number;
}

export interface QuizQuestion {
  id: string;
  type: 'en2zh' | 'zh2en' | 'spelling' | 'cloze';
  word: VocabWord;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  score: number;
  xpEarned: number;
  details: Array<{
    wordId: string;
    word: string;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
  }>;
}

export interface LearningSessionResult {
  correct: boolean;
  wordId: string;
  xpEarned: number;
  newFamiliarity: number;
  newStatus: string;
}

export interface WordBanksInfo {
  banks: string[];
  levels: string[];
  totalWords: number;
  byBank: Record<string, number>;
  byLevel: Record<string, number>;
}

export interface UserSessionInfo {
  isLoggedIn: boolean;
  userId?: string;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  total: number;
  errors: string[];
}

export interface ExampleFillResult {
  wordId: string;
  word: string;
  example: string;
  exampleZh: string;
  source: string;
}

export type ListeningQuestionType =
  | 'listen2zh'
  | 'listen2en'
  | 'listenSentence'
  | 'listenSpell';

export interface ListeningQuestion {
  id: string;
  type: ListeningQuestionType;
  word: VocabWord;
  audioText: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: {
    word: string;
    zh: string;
    phonetic: string;
    example?: string;
    exampleZh?: string;
  };
}

export interface ListeningResult {
  totalQuestions: number;
  correctCount: number;
  score: number;
  xpEarned: number;
  details: Array<{
    wordId: string;
    word: string;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
    type: ListeningQuestionType;
  }>;
}

export type ThemeType =
  | 'default'
  | 'midnight'
  | 'beyblade'
  | 'manga'
  | 'candy'
  | 'retro';

export interface ThemeInfo {
  id: ThemeType;
  name: string;
  description: string;
  emoji: string;
  previewColors: string[];
}

export const THEMES: ThemeInfo[] = [
  {
    id: 'default',
    name: '經典學院',
    description: '明亮活潑的藍紫色系，適合日常學習',
    emoji: '📚',
    previewColors: ['#6366f1', '#8b5cf6', '#ec4899'],
  },
  {
    id: 'midnight',
    name: '暗夜霓虹',
    description: '深色背景搭配螢光色系，神秘酷炫',
    emoji: '🌙',
    previewColors: ['#0f0f23', '#a855f7', '#22d3ee'],
  },
  {
    id: 'beyblade',
    name: '戰鬥陀螺',
    description: '金屬質感、紅藍對比，熱血競技風',
    emoji: '🌀',
    previewColors: ['#dc2626', '#2563eb', '#fbbf24'],
  },
  {
    id: 'manga',
    name: '日漫熱血',
    description: '漫畫網點、對白框，日系動漫風',
    emoji: '📖',
    previewColors: ['#fff7ed', '#f97316', '#1c1917'],
  },
  {
    id: 'candy',
    name: '彩虹糖果',
    description: '馬卡龍色系、圓潤可愛',
    emoji: '🍬',
    previewColors: ['#fbcfe8', '#a5f3fc', '#fde047'],
  },
  {
    id: 'retro',
    name: '復古電玩',
    description: '8-bit 像素風，復古遊戲機配色',
    emoji: '🎮',
    previewColors: ['#15803d', '#eab308', '#f8fafc'],
  },
];

export interface UserSettings {
  soundEnabled?: boolean;
  autoPlay?: boolean;
  dailyGoal?: number;
}

export interface UserPreferences {
  theme: ThemeType;
  settings: UserSettings;
}
