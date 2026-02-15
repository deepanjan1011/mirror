function cleanSnippet(text) {
    if (!text) return "";

    let cleaned = text;

    // Remove "Posted on ... by ..."
    // distinct patterns:
    // "Posted on 18 Oct 2018 by Maddy White"
    // "By Author Name | Date"
    cleaned = cleaned.replace(/Posted on\s+[A-Za-z0-9\s,]+\s+by\s+[A-Za-z\s]+/gi, '');
    cleaned = cleaned.replace(/By\s+[A-Za-z\s]+\s*\|\s*[A-Za-z0-9\s,]+/gi, '');

    // Remove Social Share links
    // "Share this article:", "Share on Linkedin", "Share on Twitter", "Share on facebook", "Copy Link"
    cleaned = cleaned.replace(/Share\s+(this\s+article|on\s+(Linkedin|Twitter|Facebook|Reddit|WhatsApp|Email))/gi, '');
    cleaned = cleaned.replace(/Copy\s+Link/gi, '');

    // Remove Navigation / Breadcrumbs (simple heuristic: "Home > Category > Title")
    cleaned = cleaned.replace(/Home\s*>\s*[^>]+(?:\s*>\s*[^>]+)*/gi, '');

    // Remove common boilerplate
    cleaned = cleaned.replace(/Read\s+time:?\s*\d+\s*min(utes)?/gi, '');
    cleaned = cleaned.replace(/Subscribe\s+to\s+.*$/i, ''); // often at end
    cleaned = cleaned.replace(/Log\s+in/gi, '');
    cleaned = cleaned.replace(/Sign\s+up/gi, '');

    // Collapse multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove leading punctuation/orphans left behind
    cleaned = cleaned.replace(/^[^a-zA-Z0-9"']+/g, '');

    return cleaned;
}

const dirtySnippet = `Digital Transformation # Monitor your caffeine intake with this smart mug Posted on 18 Oct 2018 by Maddy White Share this article: Share on Linkedin Share on Twitter Share on facebook Copy Link If like me, you don’t think anyone can make a coffee better than yourself, then we may both be wrong. The latest in smart technology will now allow you to keep hot drinks at your preferred temperature and track the amount of caffeine consumed.`;

console.log("Original:\n", dirtySnippet);
console.log("\nCleaned:\n", cleanSnippet(dirtySnippet));

const otherExamples = [
    "Home > Tech > Gadgets This is a review.",
    "By John Doe | Jan 1, 2024 The market is growing.",
    "Read time: 5 min This article explains everything. Share on Twitter",
];

console.log("\n--- Other Examples ---");
otherExamples.forEach(ex => {
    console.log(`Original: "${ex}"`);
    console.log(`Cleaned:  "${cleanSnippet(ex)}"`);
    console.log("---");
});
