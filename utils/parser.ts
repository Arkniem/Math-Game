import { QuestionPart } from '../types';

// A simple tokenizer to break the string into meaningful parts.
function tokenize(input: string): string[] {
    // Add spaces around operators and parentheses to make splitting easier, but not for numbers
    const spacedInput = input
        .replace(/([+\-*/])/g, ' $1 ')
        .replace(/([\(\){}\/])/g, ' $1 ');
    return spacedInput.trim().split(/\s+/);
}

// The parser function. It's a recursive descent parser.
export function parseQuestionString(questionString: string): QuestionPart[] {
    const tokens = tokenize(questionString);
    let position = 0;

    function parse(endTokens: string[] = []): QuestionPart[] {
        const parts: QuestionPart[] = [];
        
        while (position < tokens.length && !endTokens.includes(tokens[position])) {
            let token = tokens[position];

            if (!isNaN(parseFloat(token))) {
                // Handle numbers
                parts.push({ type: 'string', value: token });
                position++;
            } else if (['+', '*', '/', '-'].includes(token)) {
                // Handle operators
                 parts.push({ type: 'string', value: token });
                 position++;
            } else if (token === '(') {
                // Handle groups
                position++; // Consume '('
                const content = parse([')']);
                parts.push({ type: 'group', content });
                position++; // Consume ')'
            } else if (token === '{') {
                // Handle fractions
                position++; // Consume '{'
                const numerator = parse(['/']);
                position++; // Consume '/'
                const denominator = parse(['}']);
                parts.push({ type: 'fraction', numerator, denominator });
                position++; // Consume '}'
            } else {
                // Should not happen with well-formed strings
                console.warn("Unknown token:", token);
                position++;
            }
        }
        return parts;
    }

    return parse();
}
