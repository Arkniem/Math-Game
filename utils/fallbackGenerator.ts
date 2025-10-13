import { QuizItem, RawStandardProblem } from '../types';
import { rawStandardProblemsByLevel } from './standardProblems';
import { parseQuestionString } from './mathProcessor';

// Helper to pick a random item from an array
const randPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// This function now fetches a pre-defined problem from the question bank.
// It will pick any question from the level, allowing for repeated practice.
export const generateStandardProblem = (
  level: number,
): { problem: QuizItem } => {
  const currentLevel = Math.max(1, Math.min(10, level));
  
  // Levels are 1-10, but array is 0-indexed
  const problemSet: RawStandardProblem[] = rawStandardProblemsByLevel[currentLevel - 1];

  if (!problemSet || problemSet.length === 0) {
    throw new Error(`No standard problems defined for level ${currentLevel}`);
  }
  
  const chosenItem = randPick(problemSet);

  // Parse the question string into the QuestionPart[] structure
  const quizItem: QuizItem = {
    questionString: chosenItem.questionString,
    question: parseQuestionString(chosenItem.questionString),
    answer: chosenItem.answer,
    estimatedTime: chosenItem.estimatedTime,
    reasoning: undefined,
    // difficultyAdjustment is not used in standard mode, but is required by the QuizItem type.
    difficultyAdjustment: 'initial', 
  };
  
  return { problem: quizItem };
};
