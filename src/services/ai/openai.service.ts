
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
Convert the following goal into a powerful personal affirmation.

Goal: "${goalContent}"
${deadline ? `Deadline: ${dateStr}` : 'No specific deadline'}

Rules for a Good Affirmation:
1. **Present Tense**: Use "I am", "I am now", or "I have" (as if it has already happened). Avoid "I will" or "I want to".
2. **Positive**: Focus on the successful outcome and the feeling of achievement.
3. **Personal**: Use "I" and "My".
4. **Specific**: Include the goal content (e.g., "${goalContent}") and the deadline (${dateStr}) if provided.

Examples:
- "I want to earn 150,000 per month" -> "I am now successfully earning 150,000 per month and enjoying my financial freedom."
- "Achieve promotion to 'abc' post by April 2026" -> "I am now successfully serving in the 'abc' post, leading with confidence and integrity since April 2026."

Return ONLY the affirmation text.
`.trim();


        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a professional mindset and wellness coach specializing in affirmations." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 100,
            });

            return response.choices[0]?.message?.content?.trim() || `I have achieved my goal: ${goalContent}`;
        } catch (error) {
            console.error('Error generating affirmation with OpenAI:', error);
            // Fallback to a simple manual format if AI fails
            if (deadline) {
                return `I have achieved ${goalContent} by ${dateStr}`;
            }
            return `I have successfully achieved ${goalContent}`;
        }
    }
};
