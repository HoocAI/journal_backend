
import { OpenAI } from 'openai';
import "dotenv/config";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const openaiService = {
    /**
     * Generates an affirmation for a goal based on the format: "I have [verb] [goal] by [date]"
     * @param goalContent The description of the goal
     * @param deadline Optional deadline for the goal
     * @returns A string containing the affirmation
     */
    async generateGoalAffirmation(goalContent: string, deadline?: Date): Promise<string> {
        const dateStr = deadline
            ? deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : '';

        const prompt = `
Convert the following goal into exactly 5 powerful personal affirmations.

Goal: "${goalContent}"
${deadline ? `Deadline: ${dateStr}` : 'No specific deadline'}

Rules for Good Affirmations:
1. **Quantity**: You MUST generate exactly 5 distinct affirmations.
2. **Present Tense**: Use "I am", "I am now", or "I have" (as if it has already happened). Avoid "I will" or "I want to".
3. **Positive**: Focus on the successful outcome and the feeling of achievement.
4. **Personal**: Use "I" and "My".
5. **Specific**: Include the goal content (e.g., "${goalContent}") and the deadline (${dateStr}) if provided.

Examples:
- "I am now successfully earning 150,000 per month and enjoying my financial freedom."
- "I am now successfully serving in the 'abc' post, leading with confidence and integrity since April 2026."

Return ONLY a valid JSON array containing exactly 5 string affirmations. Do not include markdown formatting like \`\`\`json.
`.trim();


        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a professional mindset and wellness coach specializing in affirmations. You always return responses in valid JSON format." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 300,
            });

            const content = response.choices[0]?.message?.content?.trim();
            if (content) {
                // Verify it's a valid JSON array
                try {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return JSON.stringify(parsed.slice(0, 5)); // Ensure exactly 5 if AI overproduced
                    }
                } catch (e) {
                    console.warn("AI returned malformed JSON, returning raw string.");
                }
            }

            const fallback = deadline
                ? `I have achieved ${goalContent} by ${dateStr}`
                : `I have successfully achieved ${goalContent}`;
            return JSON.stringify(Array(5).fill(fallback));
        } catch (error) {
            console.error('Error generating affirmation with OpenAI:', error);
            const fallback = deadline
                ? `I have achieved ${goalContent} by ${dateStr}`
                : `I have successfully achieved ${goalContent}`;
            return JSON.stringify(Array(5).fill(fallback));
        }
    }
};
