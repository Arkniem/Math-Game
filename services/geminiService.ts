import { GoogleGenAI, Type } from "@google/genai";
import { Problem, PerformanceRecord, QuestionPart } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to recursively convert QuestionPart[] to a simple string for history
const stringifyQuestion = (question: QuestionPart[]): string => {
  return question.map(part => {
    switch (part.type) {
      case 'string':
        return part.value;
      case 'fraction':
        return `(${stringifyQuestion(part.numerator)} / ${stringifyQuestion(part.denominator)})`;
      case 'group':
        return `(${stringifyQuestion(part.content)})`;
      default:
        return '';
    }
  }).join(' ');
};

export const generateProblem = async (performanceHistory: PerformanceRecord[]): Promise<Problem> => {
  const historySnippet = performanceHistory.length > 0
    ? `Here is the student's recent performance history. Use this to inform your next choice.
${JSON.stringify(performanceHistory, null, 2)}`
    : "The student is just starting. Please provide a very simple single-digit addition problem, set 'difficultyAdjustment' to 'initial', and give it an 'estimatedTime' of 5 seconds.";

  const prompt = `
You are an expert adaptive math tutor AI. Your task is to generate a single arithmetic problem that is perfectly calibrated to the user's skill level, and to provide an estimated time for how long it should take them.

**Your Primary Objective:**
Find the user's performance ceiling by gradually increasing the challenge. The difficulty should ramp up smoothly to keep the user in a state of 'flow'. A key part of this is timing. You must generate a reasonable 'estimatedTime' (in seconds) for each problem.

**How to Analyze Performance:**
Your analysis must synthesize the relationship between **five** factors:
1.  Question Complexity: The inherent difficulty of the problem you previously generated.
2.  Your Estimated Time ('estimatedTime'): The time in seconds you predicted the last problem would take.
3.  User's Actual Time ('timeTaken'): How long it actually took them.
4.  User's Accuracy ('correct'): Whether they got the answer right.
5.  Your Previous Action ('difficultyAdjustment'): The adjustment you made for that question.

Your goal is to generate problems where a proficient user's 'timeTaken' is close to your 'estimatedTime'.

**How to Adjust Difficulty (Smooth Progression):**
-   **If CORRECT and FAST (\`timeTaken\` <= \`estimatedTime\`):** The user has mastered this level. Make a **significant, but reasonable, increase** in complexity (set 'difficultyAdjustment': 'significant_increase'). Also, set a new, appropriate 'estimatedTime' for the harder problem.
-   **If CORRECT but SLOW (\`timeTaken\` > \`estimatedTime\`):** The user succeeded but struggled with time. The problem was too hard. You MUST **decrease the difficulty**.
    -   To determine the severity of the slowness, calculate a time threshold: \`threshold = min(estimatedTime * 1.3, estimatedTime + 10)\`. This means the time limit is 1.3x the estimate, but capped at a maximum of 10 seconds over the estimate.
    -   If 'timeTaken' is over 'estimatedTime' but **at or below this 'threshold'**, make a **moderate decrease** ('moderate_decrease').
    -   If 'timeTaken' is **greater than this 'threshold'**, make a **significant decrease** ('significant_decrease').
-   **If INCORRECT:** The problem was too difficult, regardless of time.
    -   If this is a single error, make a **moderate decrease** ('moderate_decrease').
    -   If they have been incorrect on several recent problems, make a **significant decrease** ('significant_decrease').

**Target Problem Complexity:**
As the user demonstrates skill, you should gradually generate problems that combine multiple concepts, such as negative numbers, decimals, complex/nested fractions, and multi-step operations.

**Rules for Generation:**
1.  The response must be a JSON object with three keys: "difficultyAdjustment" (a string literal), "question" (the recursive array of parts), and "estimatedTime" (an integer in seconds). You can optionally include a "reasoning" key.
2.  The "difficultyAdjustment" value MUST be one of: 'initial', 'shocking_leap', 'significant_increase', 'moderate_increase', 'significant_decrease', 'moderate_decrease'.
3.  The "question" must follow the recursive structure:
    -   Numbers/operators: \`{ "type": "string", "value": "..." }\`.
    -   Fractions: \`{ "type": "fraction", "numerator": [...parts], "denominator": [...parts] }\`.
    -   Parentheses: \`{ "type": "group", "content": [...parts] }\`.
4.  **You MUST NOT provide the answer.** Only generate the question structure.
5.  **Variety Mandate:** Do not generate a problem that is identical to any of the questions in the provided performance history.

${historySnippet}

Based on this time-sensitive analysis, generate the next single, challenging problem now.
`;

  // FIX: Added a response schema to ensure the API returns a valid JSON object in the expected format.
  const problemSchema = {
    type: Type.OBJECT,
    properties: {
      reasoning: { type: Type.STRING, nullable: true },
      difficultyAdjustment: {
        type: Type.STRING,
        enum: ['initial', 'shocking_leap', 'significant_increase', 'moderate_increase', 'significant_decrease', 'moderate_decrease'],
      },
      question: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            value: { type: Type.STRING, nullable: true },
            numerator: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {} }, nullable: true },
            denominator: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {} }, nullable: true },
            content: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {} }, nullable: true },
          },
          required: ['type'],
        },
      },
      estimatedTime: { type: Type.INTEGER },
    },
    required: ['difficultyAdjustment', 'question', 'estimatedTime'],
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

  if (!problemData.question || !Array.isArray(problemData.question) || !problemData.difficultyAdjustment || typeof problemData.estimatedTime !== 'number') {
    throw new Error("Invalid problem format from API. Missing 'question', 'difficultyAdjustment', or 'estimatedTime'.");
  }

  return problemData as Problem;
};

export { stringifyQuestion };