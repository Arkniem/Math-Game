import { QuestionPart } from '../types';

// This file now only contains the logic to parse a math string into the QuestionPart[] structure
// for rendering purposes. The evaluation logic has been removed as the AI now provides the answer.

function tokenizeString(input: string): string[] {
    const processedInput = input.replace(/%/g, ' / 100 ').replace(/of/gi, ' * ');
    const spacedInput = processedInput
        .replace(/sqrt/g, ' sqrt ')
        .replace(/([+\-*/^])/g, ' $1 ')
        .replace(/([\(\){}|])/g, ' $1 ');
    return spacedInput.trim().split(/\s+/).filter(t => t.length > 0);
}

// Post-processing function for powers, respecting right-to-left associativity.
function processPowers(parts: QuestionPart[]): QuestionPart[] {
    for (let i = parts.length - 2; i >= 0; i--) {
        const part = parts[i];
        if (part.type === 'string' && part.value === '^') {
            const base = parts[i - 1];
            const exponent = parts[i + 1];
            if (!base || !exponent) continue;

            const powerNode: QuestionPart = {
                type: 'power',
                base: base.type === 'group' ? base.content : [base],
                exponent: exponent.type === 'group' ? exponent.content : [exponent]
            };
            parts.splice(i - 1, 3, powerNode);
        }
    }
    return parts;
}

// Post-processing function for division, converting it into a fraction structure.
function processFractions(parts: QuestionPart[]): QuestionPart[] {
    // Left-to-right for division
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.type === 'string' && part.value === '/') {
            const numeratorPart = parts[i - 1];
            const denominatorPart = parts[i + 1];

            if (!numeratorPart || !denominatorPart) continue;

            // Unwrap parentheses if the numerator/denominator is a group.
            // This is key to making `(a+b)/(c+d)` render as a fraction without the parens.
            const numerator = numeratorPart.type === 'group' ? numeratorPart.content : [numeratorPart];
            const denominator = denominatorPart.type === 'group' ? denominatorPart.content : [denominatorPart];

            const fractionNode: QuestionPart = {
                type: 'fraction',
                numerator,
                denominator
            };
            
            parts.splice(i - 1, 3, fractionNode);
            // Restart scan since we modified the array.
            i = -1;
        }
    }
    return parts;
}

export function parseQuestionString(questionString: string): QuestionPart[] {
    const tokens = tokenizeString(questionString);
    let position = 0;

    // The main parse function creates a structured list of parts, respecting groupings.
    function parse(endTokens: string[] = []): QuestionPart[] {
        const parts: QuestionPart[] = [];
        while (position < tokens.length && !endTokens.includes(tokens[position])) {
            let token = tokens[position];

            if (!isNaN(parseFloat(token))) {
                parts.push({ type: 'string', value: token });
                position++;
            } else if (['+', '*', '/', '-', '^'].includes(token)) {
                 parts.push({ type: 'string', value: token });
                 position++;
            } else if (token === '(') {
                position++;
                parts.push({ type: 'group', content: parse([')']) });
                position++;
            } else if (token === '{') { // For explicit AI fractions
                position++;
                const numerator = parse(['/']);
                position++;
                const denominator = parse(['}']);
                parts.push({ type: 'fraction', numerator, denominator });
                position++;
            } else if (token === 'sqrt') {
                position++;
                position++; // Consume '('
                parts.push({ type: 'root', content: parse([')']) });
                position++;
            } else if (token === '|') {
                position++;
                parts.push({ type: 'absolute', content: parse(['|']) });
                position++;
            } else {
                position++;
            }
        }
        return parts;
    }
    
    // This function recursively applies the operator precedence rules.
    function recursivelyProcessOperators(parts: QuestionPart[]): QuestionPart[] {
        // First, recurse into any nested structures.
        const processedParts = parts.map(part => {
            if (part.type === 'group' || part.type === 'root' || part.type === 'absolute') {
                return { ...part, content: recursivelyProcessOperators(part.content) };
            }
            if (part.type === 'fraction') {
                 return { ...part, 
                    numerator: recursivelyProcessOperators(part.numerator), 
                    denominator: recursivelyProcessOperators(part.denominator) 
                };
            }
            if (part.type === 'power') {
                 return { ...part, 
                    base: recursivelyProcessOperators(part.base), 
                    exponent: recursivelyProcessOperators(part.exponent) 
                };
            }
            return part;
        });

        // Apply precedence rules at the current level (Powers -> Fractions).
        const withPowers = processPowers(processedParts);
        const withFractions = processFractions(withPowers);
        return withFractions;
    }

    const initialParts = parse();
    return recursivelyProcessOperators(initialParts);
}