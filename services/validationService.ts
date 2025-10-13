import { Problem } from '../types';

/**
 * Validates the entire problem object received from the Gemini API.
 * It checks the top-level structure and types.
 * @param data - The raw data object from the API.
 * @throws an error if the problem is invalid.
 * @returns The validated Problem object.
 */
export const validateAndSanitizeProblem = (data: any): Problem => {
  if (!data || typeof data !== 'object') {
    throw new Error("Invalid problem format from API: not an object.");
  }
  
  const requiredStringEnum = ['initial', 'significant_increase', 'moderate_increase', 'significant_decrease', 'moderate_decrease'];

  if (typeof data.difficultyAdjustment !== 'string' || !requiredStringEnum.includes(data.difficultyAdjustment)) {
    throw new Error(`Invalid problem format from API: 'difficultyAdjustment' must be a valid enum string. Received: ${data.difficultyAdjustment}`);
  }

  if (typeof data.questionString !== 'string' || data.questionString.trim() === '') {
    throw new Error("Invalid problem format from API: 'questionString' must be a non-empty string.");
  }

  if (typeof data.answer !== 'number' || !isFinite(data.answer)) {
    throw new Error(`Invalid problem format from API: 'answer' must be a finite number. Received: ${data.answer}`);
  }

  if (typeof data.estimatedTime !== 'number' || !Number.isInteger(data.estimatedTime) || data.estimatedTime <= 0) {
    throw new Error(`Invalid problem format from API: 'estimatedTime' must be a positive integer. Received: ${data.estimatedTime}`);
  }

  // reasoning is optional
  if (data.reasoning && typeof data.reasoning !== 'string') {
     throw new Error(`Invalid problem format from API: 'reasoning' if present, must be a string. Received: ${typeof data.reasoning}`);
  }

  return {
    reasoning: data.reasoning,
    difficultyAdjustment: data.difficultyAdjustment,
    questionString: data.questionString,
    answer: data.answer,
    estimatedTime: data.estimatedTime,
  } as Problem;
};