import { QuizItem, RawStandardProblem } from '../types';
import { rawStandardProblemsByLevel } from './standardProblems';
import { parseQuestionString } from './parser';

// Helper to pick a random item from an array
const randPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// This function now fetches a pre-defined problem from the question bank,
// ensuring that the same question is not picked twice in a single game session.
export const generateStandardProblem = (
  level: number,
  seenProblems: Record<number, Set<number>>
): { problem: QuizItem | null; updatedSeenProblems: Record<number, Set<number>> } => {
  const currentLevel = Math.max(1, Math.min(10, level));
  
  // Levels are 1-10, but array is 0-indexed
  const problemSet: RawStandardProblem[] = rawStandardProblemsByLevel[currentLevel - 1];

  if (!problemSet || problemSet.length === 0) {
    throw new Error(`No standard problems defined for level ${currentLevel}`);
  }
  
  const seenInLevel = seenProblems[currentLevel] || new Set<number>();
  
  // Find all problems in the current level that have not been seen yet
  const availableProblems = problemSet
    .map((problem, index) => ({ problem, index }))
    .filter(item => !seenInLevel.has(item.index));

  // If we've run out of unique questions for this level, signal level completion
  if (availableProblems.length === 0) {
    return { problem: null, updatedSeenProblems: seenProblems };
  }

  const chosenItem = randPick(availableProblems);

  // Add the index of the chosen problem to the set of seen problems for this level
  const newSeenInLevel = new Set(seenInLevel);
  newSeenInLevel.add(chosenItem.index);

  const updatedSeenProblems = {
    ...seenProblems,
    [currentLevel]: newSeenInLevel,
  };

  // Parse the question string into the QuestionPart[] structure
  const quizItem: QuizItem = {
    question: parseQuestionString(chosenItem.problem.questionString),
    answer: chosenItem.problem.answer,
    estimatedTime: chosenItem.problem.estimatedTime,
    // difficultyAdjustment is not used in standard mode, but is required by the QuizItem type.
    difficultyAdjustment: 'initial', 
  };
  
  return { problem: quizItem, updatedSeenProblems };
};