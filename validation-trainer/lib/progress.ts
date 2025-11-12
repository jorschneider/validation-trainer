import { UserProgress, PracticeSession, ValidationFeedback } from '@/types/validation';

const STORAGE_KEY = 'validation-progress';

export function loadProgress(): UserProgress | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const progress = JSON.parse(saved) as UserProgress;
    return progress;
  } catch (error) {
    console.error('Error loading progress:', error);
    return null;
  }
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving progress:', error);
    throw error;
  }
}

export function createSession(
  scenarioId: string,
  scenarioTitle: string,
  messages: Array<{ role: string; content: string; timestamp: number }>,
  feedback: ValidationFeedback,
  startTime?: number
): PracticeSession {
  const now = Date.now();
  const sessionStartTime = startTime || (messages.length > 0 ? messages[0].timestamp : now - 60000);
  
  return {
    id: `${scenarioId}-${now}`,
    scenarioId,
    scenarioTitle,
    startTime: sessionStartTime,
    endTime: now,
    messages: messages as PracticeSession['messages'],
    feedback,
  };
}

export function addSessionToProgress(session: PracticeSession): UserProgress {
  const existing = loadProgress();

  if (!existing) {
    // Create new progress
    const categoryProgress: { [key: string]: number } = {};
    categoryProgress[session.scenarioId.split('-')[0] as string] = 1;

    return {
      totalSessions: 1,
      currentStreak: 1,
      lastPracticeDate: new Date().toISOString().split('T')[0],
      averageScore: session.feedback.overallScore,
      commonMistakes: session.feedback.mistakes.reduce((acc, mistake) => {
        acc[mistake] = 1;
        return acc;
      }, {} as { [key: string]: number }),
      categoryProgress: categoryProgress as any,
      sessions: [session],
    };
  }

  // Update existing progress
  const sessions = [...existing.sessions, session].slice(-50); // Keep last 50 sessions
  const totalSessions = sessions.length;
  const averageScore =
    sessions.reduce((sum, s) => sum + s.feedback.overallScore, 0) / totalSessions;

  // Update streak
  const lastDate = new Date(existing.lastPracticeDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const currentStreak = daysDiff === 1 ? existing.currentStreak + 1 : daysDiff === 0 ? existing.currentStreak : 1;

  // Update common mistakes
  const commonMistakes = { ...existing.commonMistakes };
  session.feedback.mistakes.forEach((mistake) => {
    commonMistakes[mistake] = (commonMistakes[mistake] || 0) + 1;
  });

  // Update category progress
  const categoryId = session.scenarioId.split('-')[0];
  const categoryProgress = { ...existing.categoryProgress };
  categoryProgress[categoryId as keyof typeof categoryProgress] =
    (categoryProgress[categoryId as keyof typeof categoryProgress] || 0) + 1;

  return {
    ...existing,
    totalSessions,
    currentStreak,
    lastPracticeDate: new Date().toISOString().split('T')[0],
    averageScore,
    commonMistakes,
    categoryProgress,
    sessions,
  };
}

