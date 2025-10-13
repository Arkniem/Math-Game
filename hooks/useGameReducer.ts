import { GameState, FeedbackType, GameMode, QuizItem, PerformanceRecord } from '../types';

const CORRECT_STREAK_TO_LEVEL_UP = 3;
const WRONG_STREAK_TO_LEVEL_DOWN = 2;

export interface State {
  gameState: GameState;
  gameMode: GameMode;
  problem: QuizItem | null;
  userAnswer: string;
  score: number;
  performanceHistory: PerformanceRecord[];
  feedback: FeedbackType;
  correctAnswer: number | null;
  timeElapsed: number;
  lastTimeTaken: number | null;
  notification: string | null;
  madeMistake: boolean;
  isShaking: boolean;
  apiLimitReached: boolean;
  standardLevel: number;
  consecutiveCorrect: number;
  consecutiveWrongs: number;
  needsNewProblem: boolean;
  needsToStart: boolean;
}

export const initialState: State = {
  gameState: GameState.Start,
  gameMode: GameMode.AI,
  problem: null,
  userAnswer: '',
  score: 0,
  performanceHistory: [],
  feedback: FeedbackType.None,
  correctAnswer: null,
  timeElapsed: 0,
  lastTimeTaken: null,
  notification: null,
  madeMistake: false,
  isShaking: false,
  apiLimitReached: false,
  standardLevel: 1,
  consecutiveCorrect: 0,
  consecutiveWrongs: 0,
  needsNewProblem: false,
  needsToStart: false,
};

type Action =
  | { type: 'START_GAME' }
  | { type: 'SET_GAME_MODE'; payload: GameMode }
  | { type: 'FETCH_PROBLEM_START' }
  | { type: 'FETCH_PROBLEM_SUCCESS'; payload: QuizItem }
  | { type: 'FETCH_PROBLEM_FAILURE'; payload: string }
  | { type: 'UPDATE_USER_ANSWER'; payload: string }
  | { type: 'SUBMIT_ANSWER'; payload: { timedOut: boolean } }
  | { type: 'INCREASE_DIFFICULTY' }
  | { type: 'SKIP_QUESTION' }
  | { type: 'UPDATE_TIMER'; payload: number }
  | { type: 'API_LIMIT_REACHED' }
  | { type: 'SET_NOTIFICATION'; payload: string | null };

export const gameReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...initialState,
        gameMode: state.gameMode,
        apiLimitReached: state.apiLimitReached,
        needsToStart: true,
      };

    case 'SET_GAME_MODE':
      return {
        ...state,
        gameMode: action.payload,
      };

    case 'FETCH_PROBLEM_START':
      return {
        ...state,
        gameState: GameState.Loading,
        feedback: FeedbackType.None,
        userAnswer: '',
        madeMistake: false,
        needsNewProblem: false,
        needsToStart: false,
      };

    case 'FETCH_PROBLEM_SUCCESS':
      return {
        ...state,
        gameState: GameState.Playing,
        problem: action.payload,
        timeElapsed: 0,
      };

    case 'FETCH_PROBLEM_FAILURE':
        return {
            ...state,
            gameState: GameState.Start, // Or an error state
            notification: action.payload,
        };

    case 'API_LIMIT_REACHED':
      return {
        ...state,
        apiLimitReached: true,
        gameMode: GameMode.Standard,
        notification: "AI is resting. Switched to Standard Mode!",
      };
      
    case 'UPDATE_USER_ANSWER': {
      let isShaking = false;
      let madeMistake = state.madeMistake;
      if (action.payload === 'backspace' && !madeMistake) {
        madeMistake = true;
        isShaking = true;
      }

      let newUserAnswer = state.userAnswer;
      if (action.payload === 'backspace') {
          newUserAnswer = newUserAnswer.slice(0, -1);
      } else if (action.payload === '-') {
          newUserAnswer = newUserAnswer.startsWith('-') ? newUserAnswer.substring(1) : '-' + newUserAnswer;
      } else if (action.payload === '.') {
          if (!newUserAnswer.includes('.')) {
            newUserAnswer = (newUserAnswer === '' || newUserAnswer === '-') ? newUserAnswer + '0.' : newUserAnswer + '.';
          }
      } else {
        newUserAnswer += action.payload;
      }

      return { ...state, userAnswer: newUserAnswer, madeMistake, isShaking };
    }

    case 'SUBMIT_ANSWER': {
        if (state.gameState !== GameState.Playing || !state.problem) return state;

        const timeTaken = state.timeElapsed;
        const { timedOut } = action.payload;
        const parsedUserAnswer = parseFloat(state.userAnswer);
        const isNumericallyCorrect = !isNaN(parsedUserAnswer) && Math.abs(parsedUserAnswer - state.problem.answer) < 0.01;
        const wasCorrect = !timedOut && isNumericallyCorrect;
        const performanceCorrect = wasCorrect && !state.madeMistake;

        const newRecord: PerformanceRecord = {
            question: state.problem.questionString,
            correctAnswer: state.problem.answer,
            userAnswer: isNaN(parsedUserAnswer) ? null : parsedUserAnswer,
            timeTaken: parseFloat(timeTaken.toFixed(2)),
            estimatedTime: state.problem.estimatedTime,
            correct: performanceCorrect,
            difficultyAdjustment: state.problem.difficultyAdjustment,
        };
        
        const newHistory = [...state.performanceHistory, newRecord];

        if (wasCorrect) {
            let scoreUpdate = state.score;
            if (performanceCorrect) {
                const timeBonus = Math.max(0, state.problem.estimatedTime - timeTaken);
                const points = 50 + Math.round(timeBonus * 5);
                scoreUpdate += Math.max(10, points);
            }

            let newLevel = state.standardLevel;
            let newStreak = state.consecutiveCorrect + 1;
            if (state.gameMode === GameMode.Standard && newStreak >= CORRECT_STREAK_TO_LEVEL_UP && state.standardLevel < 10) {
                newLevel++;
                newStreak = 0;
            }

            return {
                ...state,
                gameState: GameState.Feedback,
                feedback: FeedbackType.Correct,
                score: scoreUpdate,
                performanceHistory: newHistory,
                consecutiveCorrect: newStreak,
                consecutiveWrongs: 0,
                standardLevel: newLevel,
                lastTimeTaken: parseFloat(timeTaken.toFixed(1)),
                needsNewProblem: true,
            };
        } else { // Incorrect
            let newLevel = state.standardLevel;
            let newWrongs = state.consecutiveWrongs + 1;
            if (state.gameMode === GameMode.Standard && newWrongs >= WRONG_STREAK_TO_LEVEL_DOWN) {
                newLevel = Math.max(1, state.standardLevel - 1);
                newWrongs = 0;
            }

            return {
                ...state,
                gameState: GameState.Feedback,
                feedback: FeedbackType.Incorrect,
                correctAnswer: state.problem.answer,
                performanceHistory: newHistory,
                consecutiveCorrect: 0,
                consecutiveWrongs: newWrongs,
                standardLevel: newLevel,
                lastTimeTaken: parseFloat(timeTaken.toFixed(1)),
                needsNewProblem: true,
            };
        }
    }

    case 'INCREASE_DIFFICULTY': {
      if (state.gameState !== GameState.Playing || !state.problem) return state;

      if (state.gameMode === GameMode.Standard) {
        if (state.standardLevel === 10) {
          return { ...state, notification: "You are on the highest level!" };
        }
        return {
            ...state,
            gameState: GameState.Loading,
            standardLevel: Math.min(10, state.standardLevel + 1),
            consecutiveCorrect: 0,
            consecutiveWrongs: 0,
            needsNewProblem: true,
        };
      }
      
      // AI Mode
      const timeTaken = state.timeElapsed;
      const record: PerformanceRecord = {
          question: state.problem.questionString,
          correctAnswer: state.problem.answer,
          userAnswer: null,
          timeTaken: parseFloat(timeTaken.toFixed(2)),
          estimatedTime: state.problem.estimatedTime,
          correct: false, // Treat as incorrect/skipped since user didn't solve it
          difficultyAdjustment: 'significant_increase', // User explicitly asked for a harder problem
      };
      
      return {
        ...state,
        gameState: GameState.Loading,
        performanceHistory: [...state.performanceHistory, record],
        needsNewProblem: true,
      };
    }

    case 'SKIP_QUESTION': {
      if (state.gameState !== GameState.Playing || !state.problem) return state;

      const timeTaken = state.timeElapsed;
      
      let newLevel = state.standardLevel;
      let newWrongs = state.consecutiveWrongs + 1;
      if (state.gameMode === GameMode.Standard && newWrongs >= WRONG_STREAK_TO_LEVEL_DOWN) {
          newLevel = Math.max(1, state.standardLevel - 1);
          newWrongs = 0;
      }

      const record: PerformanceRecord = {
          question: state.problem.questionString,
          correctAnswer: state.problem.answer,
          userAnswer: null,
          timeTaken: parseFloat(timeTaken.toFixed(2)),
          estimatedTime: state.problem.estimatedTime,
          correct: false,
          difficultyAdjustment: state.problem.difficultyAdjustment,
      };

      return {
        ...state,
        gameState: GameState.Feedback,
        feedback: FeedbackType.Incorrect,
        correctAnswer: state.problem.answer,
        lastTimeTaken: parseFloat(timeTaken.toFixed(1)),
        performanceHistory: [...state.performanceHistory, record],
        consecutiveCorrect: 0,
        consecutiveWrongs: newWrongs,
        standardLevel: newLevel,
        needsNewProblem: true,
      };
    }

    case 'UPDATE_TIMER':
      return { ...state, timeElapsed: action.payload };

    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload, isShaking: false };

    default:
      return state;
  }
};