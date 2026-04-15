
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
Convert the following goal into a powerful personal affirmation using the exact format: "I have [past-tense-verb] [goal] by [date]".

Goal: "${goalContent}"
${deadline ? `Deadline: ${dateStr}` : 'No specific deadline'}

Rules:
1. Start with "I have ".
2. Use a strong past-tense verb (e.g., achieved, reached, completed, transformed).
3. If a deadline exists, end with " by [Date]".
4. If no deadline exists, end with " successfully".
5. Keep it concise, positive, and in the present-perfect tense as if it has already happened.

Example: "I want to achieve a promotion to 'abc' post by '15 April 2026'" -> "I have achieved a promotion to 'abc' post by 15 April 2026"

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
