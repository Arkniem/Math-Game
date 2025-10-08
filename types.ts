export type DifficultyAdjustment = 'initial' | 'shocking_leap' | 'significant_increase' | 'moderate_increase' | 'significant_decrease' | 'moderate_decrease';

export type QuestionPart =
  | { type: 'string'; value: string }
  | { type: 'fraction'; numerator: QuestionPart[]; denominator: QuestionPart[] }
  | { type: 'group'; content: QuestionPart[] };

// This is what the AI returns
export interface Problem {
  reasoning?: string;
  difficultyAdjustment: DifficultyAdjustment;
  question: QuestionPart[];
  estimatedTime: number; // in seconds
}

// This is what we use in the app state, combining the question with its locally-calculated answer
export interface QuizItem {
  question: QuestionPart[];
  answer: number;
  difficultyAdjustment: DifficultyAdjustment;
  estimatedTime: number; // in seconds
}

// This is for the pre-defined standard problems
export interface StandardProblem {
  question: QuestionPart[];
  answer: number;
  estimatedTime: number; // in seconds
}

// This is for the new, raw, string-based problem definitions
export interface RawStandardProblem {
  questionString: string;
  answer: number;
  estimatedTime: number; // in seconds
}

export interface PerformanceRecord {
  question: string; // A string representation of the question for the AI
  correctAnswer: number;
  userAnswer: number | null;
  timeTaken: number; // in seconds
  estimatedTime: number; // in seconds
  correct: boolean;
  difficultyAdjustment: DifficultyAdjustment;
}

export enum GameState {
  Start,
  Playing,
  Feedback,
  Loading
}

export enum FeedbackType {
  None,
  Correct,
  Incorrect
}

export enum GameMode {
  AI,
  Standard
}