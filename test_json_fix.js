function cleanJson(str) {
    let cleaned = str.trim();

    // 1. Remove markdown code blocks
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/```$/, '');
    }

    // 2. Remove any text before the first '{' and after the last '}'
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    // 3. Escape control characters (newlines, tabs, etc.) ONLY within string values
    // This is a simplified state machine to detect if we are inside a string
    let result = '';
    let insideString = false;
    let escape = false;

    for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (insideString) {
            if (escape) {
                // Was escaped, just add char and reset escape
                result += char;
                escape = false;
            } else {
                if (char === '\\') {
                    escape = true;
                    result += char;
                } else if (char === '"') {
                    insideString = false;
                    result += char;
                } else if (char === '\n') {
                    // This is an unescaped newline INSIDE a string. Escape it.
                    result += '\\n';
                } else if (char === '\r') {
                    // This is an unescaped carriage return INSIDE a string. Escape it.
                    result += '\\r';
                } else if (char === '\t') {
                    // This is an unescaped tab INSIDE a string. Escape it.
                    result += '\\t';
                } else {
                    result += char;
                }
            }
        } else {
            // Not inside string
            if (char === '"') {
                insideString = true;
            }
            result += char;
        }
    }

    // 4. Handle single quotes for keys if necessary (simple heuristic, risky but kept for compat)
    // Only apply if it looks like invalid JSON with single quotes
    // result = result.replace(/'([^']+)'\s*:/g, '"$1":'); // Disabling this for now as it might be too aggressive

    return result;
}

const testCases = [
    {
        name: "Valid JSON with newlines in string",
        input: `{\n  "related_research": "- Item 1\\n- Item 2",\n  "action_items": "Action 1"\n}`,
        shouldPass: true
    },
    {
        name: "Valid JSON with structural newlines",
        input: `{\n  "key": "value"\n}`,
        shouldPass: true
    },
    {
        name: "Broken JSON with unescaped newline in string",
        input: `{\n  "related_research": "- Item 1\n- Item 2",\n  "action_items": "Action 1"\n}`,
        shouldPass: true
    },
    {
        name: "Markdown wrapped JSON",
        input: "```json\n{\n  \"key\": \"value\"\n}\n```",
        shouldPass: true
    },
    {
        name: "Text before/after JSON",
        input: "Sure here is the json:\n{\n  \"key\": \"value\"\n}\nHope that helps.",
        shouldPass: true
    }
];

console.log("Running tests...\n");

let passed = 0;
for (const test of testCases) {
    console.log(`Test: ${test.name}`);
    const cleaned = cleanJson(test.input);
    try {
        const parsed = JSON.parse(cleaned);
        console.log("  ✅ Parsed successfully");
        // console.log("  Cleaned Output:", cleaned); 
        passed++;
    } catch (e) {
        console.log("  ❌ Parse FAILED:", e.message);
        console.log("  Input:", JSON.stringify(test.input));
        console.log("  Cleaned:", JSON.stringify(cleaned));
    }
    console.log("---");
}

console.log(`\nPassed ${passed} / ${testCases.length}`);
