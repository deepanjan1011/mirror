function truncateSnippet(text, maxSentences = 5, maxChars = 500) {
    if (!text) return "";

    // Split by sentence boundaries (period, question mark, exclamation point followed by space or end of string)
    // This is a simple approximation
    const sentenceRegex = /[^.!?]+[.!?]+(\s|$)/g;
    const sentences = text.match(sentenceRegex) || [text];

    let result = "";
    let count = 0;

    for (const sentence of sentences) {
        if (count >= maxSentences) break;
        if ((result + sentence).length > maxChars) break;

        result += sentence;
        count++;
    }

    // Fallback if no sentences found (e.g. no punctuation)
    if (!result && text.length > 0) {
        result = text.slice(0, maxChars);
        if (text.length > maxChars) result += "...";
    } else {
        result = result.trim();
    }

    return result;
}

const longText = `Digital Transformation # Monitor your caffeine intake with this smart mug Posted on 18 Oct 2018 by Maddy White Share this article: Share on Linkedin Share on Twitter Share on facebook Copy Link If like me, you don’t think anyone can make a coffee better than yourself, then we may both be wrong. The latest in smart technology will now allow you to keep hot drinks at your preferred temperature and track the amount of caffeine consumed. Design-driven company Ember, is best known for their temperature control technology, and being the maker of the world’s first temperature control mug that is connected to a smartphone app. [...] The app will send a notification when the set amount is reached, so consumers can then make an alternative beverage choice. Users will also be able to use the Health app data in order to understand how their caffeine consumption impacts their heart rate, sleeping patterns and general health. The patented technology is changing coffee and tea drinking experiences. Users can set their preferred drinking temperature (between 120˚F – 145˚F) and even keep it there, from the first sip to the last drop. Ember’s Travel Mug and Ceramic Mug are the most advanced smart coffee mugs on the market, allowing individuals to set and maintain their preferred drinking temperature for hot beverages and now, even track their caffeine intake. ### ‘Smart’ products revolutionising industries Sports: cricket [...] Now, the business has announced the release of a new update to the Ember app, which features an integration with the Apple Health app, allowing users to track their caffeine consumption throughout the day. Founded by inventor and entrepreneur Clay Alexander, Ember creates, designs and develops smartly-engineered household products that offer consumers complete customisation of their food and beverage temperature. The new Ember app gives users the ability to track their caffeine consumption, as well as set maximum caffeine intake measurements for the day.`;

console.log("Original Length:", longText.length);
console.log("Original:\n", longText);
console.log("\n---\n");
const truncated = truncateSnippet(longText);
console.log("Truncated Length:", truncated.length);
console.log("Truncated:\n", truncated);
console.log("\n---\n");

const shortText = "This is a short text. It has two sentences.";
console.log("Short Text Truncated:\n", truncateSnippet(shortText));

const noPunc = "This is a text with no punctuation it just goes on and on and on and on and on and on and on and on and on and on and on and on and on and on and on";
console.log("No Punctuation Truncated:\n", truncateSnippet(noPunc, 5, 50));
