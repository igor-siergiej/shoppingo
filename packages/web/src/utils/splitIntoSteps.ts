export const splitIntoSteps = (text: string): string[] =>
    text
        .split('\n')
        .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(Boolean);
