const cleanJson = (str) => {
    let cleaned = str.trim();
    // 1. Remove markdown code blocks
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```(?:json)?\n?/g, '').replace(/```$/, '');
    }
    // 2. Escape unescaped newlines inside strings to prevent "Bad control character" error
    // ORIGINAL LOGIC from route.ts
    cleaned = cleaned.replace(/(?<!\\)\n/g, '\\n');

    // 3. Attempt to fix single quotes
    cleaned = cleaned.replace(/'([^']+)'\s*:/g, '"$1":');

    return cleaned;
};

const rawResponse = `{
  "related_research": "- Global smart mugs market: $0.74 billion in 2025 to $1.31 billion by 2031.
- Smart coffee mug sales peak: February 2026, 11,000+ sales.",
  "action_items": "- Target tech-savvy millennials and Gen Z.
- Emphasize health tracking and temperature control."
}`;

console.log("Original:");
console.log(rawResponse);

const cleaned = cleanJson(rawResponse);
console.log("\nCleaned:");
console.log(cleaned);

try {
    JSON.parse(cleaned);
    console.log("\nParse SUCCESS");
} catch (e) {
    console.log("\nParse FAILED:", e.message);
}
