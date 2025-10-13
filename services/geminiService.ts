import { GoogleGenAI, Type } from "@google/genai";
import { Problem, PerformanceRecord } from '../types';
import { validateAndSanitizeProblem } from "./validationService";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProblem = async (performanceHistory: PerformanceRecord[]): Promise<Problem> => {
  const historySnippet = performanceHistory.length > 0
    ? `Here is the student's recent performance history. Use this to inform your next choice.
${JSON.stringify(performanceHistory.slice(-5), null, 2)}`
    : "The student is just starting. Please provide a very simple single-digit addition problem, set 'difficultyAdjustment' to 'initial', and give it an 'estimatedTime' of 5 seconds.";

  const prompt = `
You are an expert adaptive math tutor AI. Your task is to generate a single arithmetic problem as a string, provide its numeric answer, and estimate the time to solve it.

**Your Primary Objective:**
Find the user's performance ceiling by gradually increasing the challenge. The difficulty should ramp up smoothly to keep the user in a state of 'flow'.

**How to Analyze Performance:**
Your analysis must synthesize the relationship between these factors: Question Complexity, Your Estimated Time, User's Actual Time, and User's Accuracy. Your goal is to generate problems where a proficient user's 'timeTaken' is close to your 'estimatedTime'.

**How to Adjust Difficulty (Smooth Progression):**
-   **If CORRECT and FAST (\`timeTaken\` <= \`estimatedTime\`):** The user has mastered this level. Make a **significant increase** in complexity (set 'difficultyAdjustment': 'significant_increase'). A user explicitly requesting a harder problem will also use this adjustment.
-   **If CORRECT but SLOW (\`timeTaken\` > \`estimatedTime\`):** The user struggled. You MUST **decrease the difficulty**.
    - If 'timeTaken' is slightly over (e.g., < 30% over), make a **moderate decrease** ('moderate_decrease').
    - If 'timeTaken' is very slow (e.g., > 30% over), make a **significant decrease** ('significant_decrease').
-   **If INCORRECT:** The problem was too difficult. Make a **moderate decrease** ('moderate_decrease') for a single error, or a **significant decrease** ('significant_decrease') for multiple recent errors.

**Rules for Generation:**
1.  The response must be a valid JSON object matching the provided schema.
2.  **Question String Formatting:** The "questionString" MUST be a mathematically valid expression.
    - Use standard operators: +, -, *, /.
    - Use parentheses for grouping: \`(...\`)\`.
    - For exponents, use the caret symbol: \`base^exponent\`.
    - **For fractions, use curly braces: \`{numerator/denominator}\`. Example: \`{1/2}\`**
    - **For square roots, use the sqrt function: \`sqrt(...)\`. Example: \`sqrt(64)\`**
    - **For absolute value, use vertical bars: \`|...|\`. Example: \`|-5|\`**
3.  The "answer" MUST be the correct numeric solution to the "questionString". For answers with decimals, round to two decimal places.
4.  The "difficultyAdjustment" value MUST be one of: 'initial', 'significant_increase', 'moderate_increase', 'significant_decrease', 'moderate_decrease'.
5.  **Variety Mandate:** Do not generate a problem that is identical to any of the last 5 questions in the provided performance history.

${historySnippet}

Based on this time-sensitive analysis, generate the next single, challenging problem now.
`;
  
  const problemSchema = {
    type: Type.OBJECT,
    properties: {
      reasoning: { type: Type.STRING, nullable: true },
      difficultyAdjustment: {
        type: Type.STRING,
        enum: ['initial', 'significant_increase', 'moderate_increase', 'significant_decrease', 'moderate_decrease'],
      },
      questionString: { type: Type.STRING },
      answer: { type: Type.NUMBER },
      estimatedTime: { type: Type.INTEGER },
    },
    required: ['difficultyAdjustment', 'questionString', 'answer', 'estimatedTime'],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: problemSchema,
      temperature: 0.9,
    },
  });

  const jsonText = response.text.trim();
  const problemData = JSON.parse(jsonText);

  // The new, crucial validation step.
  return validateAndSanitizeProblem(problemData);
};