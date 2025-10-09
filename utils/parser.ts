import { QuestionPart } from '../types';

// A simple tokenizer to break the string into meaningful parts.
function tokenize(input: string): string[] {
    // Add spaces around operators and parentheses to make splitting easier
    const spacedInput = input
        .replace(/sqrt/g, 'sqrt ') // Ensure sqrt is a token
        .replace(/([+\-*/^])/g, ' $1 ')
        .replace(/([\(\){}\/|])/g, ' $1 ');
    return spacedInput.trim().split(/\s+/).filter(t => t.length > 0);
}

// Post-processes a flat list of parts to create nested 'power' structures.
// This is done to handle operator precedence for '^' correctly.
function postProcessForPowers(parts: QuestionPart[]): QuestionPart[] {
    // This loop runs as long as there are '^' operators to process.
    // It respects right-to-left associativity by finding the last '^' in each pass.
    while (parts.some(p => p.type === 'string' && p.value === '^')) {
        // FIX: Replaced `findLastIndex` with a compatible reverse loop for broader environment support.
        let lastPowerIndex = -1;
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            if (p.type === 'string' && p.value === '^') {
                lastPowerIndex = i;
                break;
            }
        }
        
        if (lastPowerIndex > 0 && lastPowerIndex < parts.length - 1) {
            const base = parts[lastPowerIndex - 1];
            const exponent = parts[lastPowerIndex + 1];

            const powerNode: QuestionPart = {
                type: 'power',
                base: base.type === 'group' ? base.content : [base],
                exponent: exponent.type === 'group' ? exponent.content : [exponent]
            };
            // Replace base, '^', and exponent with the new single 'power' node
            parts.splice(lastPowerIndex - 1, 3, powerNode);
        } else {
            // No valid power expression found, break to avoid infinite loop
            break; 
        }
    }
    return parts;
}

// The main parser function. It's a recursive descent parser.
export function parseQuestionString(questionString: string): QuestionPart[] {
    const tokens = tokenize(questionString);
    let position = 0;

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
                position++; // Consume '('
                const content = parse([')']);
                parts.push({ type: 'group', content: postProcessForPowers(content) });
                position++; // Consume ')'
            } else if (token === '{') {
                position++; // Consume '{'
                const numerator = parse(['/']);
                position++; // Consume '/'
                const denominator = parse(['}']);
                parts.push({ type: 'fraction', numerator: postProcessForPowers(numerator), denominator: postProcessForPowers(denominator) });
                position++; // Consume '}'
            } else if (token === 'sqrt') {
                position++; // Consume 'sqrt'
                position++; // Consume '('
                const content = parse([')']);
                parts.push({ type: 'root', content: postProcessForPowers(content) });
                position++; // Consume ')'
            } else if (token === '|') {
                position++; // Consume '|'
                const content = parse(['|']);
                parts.push({ type: 'absolute', content: postProcessForPowers(content) });
                position++; // Consume '|'
            } else {
                console.warn("Unknown token:", token);
                position++;
            }
        }
        return parts;
    }

    const initialParts = parse();
    // After parsing groups, process top-level power operators
    return postProcessForPowers(initialParts);
}
