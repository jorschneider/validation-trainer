export type EmotionType = 
  | 'worried' | 'angry' | 'frustrated' | 'sad' | 'embarrassed' | 'hurt' 
  | 'confused' | 'anxious' | 'overwhelmed' | 'exhausted'
  | 'excited' | 'proud' | 'happy' | 'grateful' | 'hopeful';

export type ScenarioCategory =
  | 'stressful-day'
  | 'frustration-others'
  | 'relationship-concerns'
  | 'excitement-pride'
  | 'insecurity-doubt'
  | 'decision-making'
  | 'past-hurt';

export interface Scenario {
  id: string;
  category: ScenarioCategory;
  title: string;
  description: string;
  partnerOpening: string;
  emotions: EmotionType[];
  difficulty: 'easy' | 'medium' | 'hard';
  idealResponse: string;
  followUp?: string;
}

export interface ConversationMessage {
  role: 'partner' | 'user';
  content: string;
  timestamp: number;
}

export interface ValidationFeedback {
  identifiedEmotion: boolean;
  offeredJustification: boolean;
  usedMicroValidations: boolean;
  avoidedInvalidating: boolean;
  avoidedPrematureFix: boolean;
  askedPermission: boolean;
  matchedEnergy: boolean;
  usedIStatements: boolean;
  avoidedAbsolutes: boolean;
  overallScore: number;
  positives: string[];
  mistakes: string[];
  suggestions: string[];
  modelResponse: string;
}

export interface PracticeSession {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  startTime: number;
  endTime: number;
  messages: ConversationMessage[];
  feedback: ValidationFeedback;
}

export interface UserProgress {
  totalSessions: number;
  currentStreak: number;
  lastPracticeDate: string;
  averageScore: number;
  commonMistakes: { [key: string]: number };
  categoryProgress: { [key in ScenarioCategory]: number };
  sessions: PracticeSession[];
}

