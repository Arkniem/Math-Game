import { QuestionPart } from '../types';

// Defines the precedence of mathematical operators.
const precedence: { [key: string]: number } = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '^': 3, // Highest precedence for exponents
};

const functions = ['sqrt', 'abs'];

// Applies a given binary operator to two numbers.
function applyOp(op: string, b: number, a: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/':
      if (b === 0) throw new Error("Division by zero");
      return a / b;
    case '^': return Math.pow(a, b);
  }
  throw new Error(`Unsupported operator: ${op}`);
}

// Applies a given unary function to one number.
function applyFunc(func: string, a: number): number {
  switch (func) {
    case 'sqrt':
      if (a < 0) throw new Error("Square root of a negative number");
      return Math.sqrt(a);
    case 'abs': return Math.abs(a);
  }
  throw new Error(`Unsupported function: ${func}`);
}

/**
 * Recursively traverses the nested QuestionPart structure and flattens it into a
 * single array of tokens suitable for the Shunting-yard algorithm.
 * It wraps complex structures in parentheses to preserve their integrity.
 */
function flattenToTokens(parts: QuestionPart[]): (string | number)[] {
  const initialTokens: (string | number)[] = [];

  const processParts = (partsToProcess: QuestionPart[]) => {
    // Defensive check: If parts are missing from the API response, do nothing.
    if (!partsToProcess) return;

    for (const part of partsToProcess) {
      switch (part.type) {
        case 'string':
          const value = part.value.trim();
          if (!isNaN(parseFloat(value))) {
            initialTokens.push(parseFloat(value));
          } else if (value === '-') {
            const prevToken = initialTokens.length > 0 ? initialTokens[initialTokens.length - 1] : null;
            const isUnary = initialTokens.length === 0 || (typeof prevToken === 'string' && ['(', '+', '-', '*', '/', '^'].includes(prevToken));
            if (isUnary) {
              initialTokens.push(-1, '*');
            } else {
              initialTokens.push('-');
            }
          } else if (['+', '*', '/', '(', ')', '^'].includes(value)) {
            initialTokens.push(value);
          }
          break;
        
        case 'power':
          initialTokens.push('(');
          processParts(part.base);
          initialTokens.push(')');
          initialTokens.push('^');
          initialTokens.push('(');
          processParts(part.exponent);
          initialTokens.push(')');
          break;

        case 'root':
          initialTokens.push('sqrt', '(');
          processParts(part.content);
          initialTokens.push(')');
          break;

        case 'absolute':
          initialTokens.push('abs', '(');
          processParts(part.content);
          initialTokens.push(')');
          break;
          
        case 'fraction':
          initialTokens.push('(');
          processParts(part.numerator);
          initialTokens.push(')');
          initialTokens.push('/');
          initialTokens.push('(');
          processParts(part.denominator);
          initialTokens.push(')');
          break;

        case 'group':
          initialTokens.push('(');
          processParts(part.content);
          initialTokens.push(')');
          break;
      }
    }
  };
  
  processParts(parts);
  
  const finalTokens: (string | number)[] = [];
  if (initialTokens.length === 0) {
      return [];
  }

  for (let i = 0; i < initialTokens.length; i++) {
    finalTokens.push(initialTokens[i]);

    const currentToken = initialTokens[i];
    const nextToken = initialTokens[i + 1];
    
    if (nextToken === undefined) break;

    const isNumberThenParen = typeof currentToken === 'number' && nextToken === '(';
    const isParenThenNumber = currentToken === ')' && typeof nextToken === 'number';
    const isParenThenParen = currentToken === ')' && nextToken === '(';
    const isNumberThenFunction = typeof currentToken === 'number' && typeof nextToken === 'string' && functions.includes(nextToken);

    if (isNumberThenParen || isParenThenNumber || isParenThenParen || isNumberThenFunction) {
      finalTokens.push('*');
    }
  }

  return finalTokens;
}


/**
 * Converts an array of infix tokens to postfix (Reverse Polish Notation) using the Shunting-yard algorithm.
 * This correctly arranges numbers and operators to respect the order of operations and function calls.
 */
function toPostfix(tokens: (string | number)[]): (string | number)[] {
  const outputQueue: (string | number)[] = [];
  const operatorStack: string[] = [];

  for (const token of tokens) {
    if (typeof token === 'number') {
      outputQueue.push(token);
    } else if (typeof token === 'string' && functions.includes(token)) {
      operatorStack.push(token);
    } else if (typeof token === 'string' && token in precedence) {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1] !== '(' &&
        (
          precedence[operatorStack[operatorStack.length - 1]] > precedence[token] ||
          // Handle left-associativity for operators of same precedence (except for '^')
          (precedence[operatorStack[operatorStack.length - 1]] === precedence[token] && token !== '^')
        )
      ) {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.push(token);
    } else if (token === '(') {
      operatorStack.push(token);
    } else if (token === ')') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
        outputQueue.push(operatorStack.pop()!);
      }
      if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] === '(') {
        operatorStack.pop(); // Discard '('
      } else {
        throw new Error("Mismatched parentheses");
      }
      // If a function is at the top of the stack, move it to the output queue
      if (operatorStack.length > 0 && functions.includes(operatorStack[operatorStack.length - 1])) {
        outputQueue.push(operatorStack.pop()!);
      }
    }
  }

  while (operatorStack.length > 0) {
    const op = operatorStack.pop()!;
    if (op === '(') throw new Error("Mismatched parentheses");
    outputQueue.push(op);
  }

  return outputQueue;
}

/**
 * Evaluates a postfix expression (an array of tokens in RPN).
 */
function evaluatePostfix(postfix: (string | number)[]): number {
  const stack: number[] = [];

  for (const token of postfix) {
    if (typeof token === 'number') {
      stack.push(token);
    } else if (functions.includes(token as string)) {
      const a = stack.pop();
      if (a === undefined) {
        throw new Error("Invalid expression: insufficient values for a function.");
      }
      stack.push(applyFunc(token as string, a));
    } else { // is a binary operator
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) {
        throw new Error("Invalid expression: insufficient values for an operator.");
      }
      stack.push(applyOp(token as string, b, a));
    }
  }

  if (stack.length !== 1) {
    throw new Error("Invalid expression: the final stack should have one number.");
  }

  return stack[0];
}

/**
 * Main evaluation function. It orchestrates the process:
 * 1. Flattens the recursive question parts into a clean, linear token stream.
 * 2. Converts the tokens from infix to postfix notation.
 * 3. Evaluates the postfix expression to get the final answer.
 */
export const evaluateExpression = (parts: QuestionPart[]): number => {
  try {
    const tokens = flattenToTokens(parts);
    const postfix = toPostfix(tokens);
    const result = evaluatePostfix(postfix);

    // Round to 2 decimal places to handle floating point inaccuracies.
    return Math.round(result * 100) / 100;
  } catch (error) {
    console.error("Failed to evaluate expression:", error, { parts });
    // Return a fallback value in case of a critical parsing error.
    return NaN;
  }
};