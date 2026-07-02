
import { OpenAI } from 'openai';
import "dotenv/config";

const apiKey = process.env.OPENAI_API_KEY || '';
const openai = apiKey ? new OpenAI({ apiKey }) : null;

/**
 * Helper to generate offline fallback affirmation avoiding generic prefixes and duplicate dates
 */
function generateFallbackAffirmation(goalContent: string, dateStr: string, deadline?: Date): string {
    let fallbackText = goalContent.replace(/^(i want to |i will |i need to )/i, '');
    fallbackText = fallbackText.charAt(0).toUpperCase() + fallbackText.slice(1);
    
    if (deadline) {
        const lowerContent = goalContent.toLowerCase();
        const lowerDateStr = dateStr.toLowerCase();
        const hasDate = lowerContent.includes(lowerDateStr) || 
                        lowerContent.includes(deadline.getFullYear().toString());
        if (!hasDate) {
            fallbackText = `${fallbackText} by ${dateStr}`;
        }
    }
    
    console.log('[OpenAI] Generated affirmation (Fallback):', fallbackText);
    return fallbackText;
}

export const openaiService = {
    /**
     * Generates a single affirmation for a goal
     * @param goalContent The description of the goal
     * @param deadline Optional deadline for the goal
     * @returns A string containing the affirmation
     */
    async generateGoalAffirmation(goalContent: string, deadline?: Date): Promise<string> {
        const dateStr = deadline
            ? deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : '';

        if (!openai) {
            console.warn('[OpenAI] API key is missing. Using offline fallback for affirmations.');
            return generateFallbackAffirmation(goalContent, dateStr, deadline);
        }

        const prompt = `
Convert the following goal (sometimes called a manifestation) into exactly 1 powerful personal affirmation.

Goal: "${goalContent}"
${deadline ? `Deadline: ${dateStr}` : 'No specific deadline'}

Rules for the Affirmation:
1. **Present Tense**: Use "I am", "I am now", "I feel", "I enjoy", or action verbs (as if it has already happened). Avoid "I will" or "I want to".
2. **No Generic Prefix**: Do NOT start the affirmation with the generic phrase "I have achieved" or "I have successfully achieved". Instead, describe the specific state or result directly (e.g., instead of "I have achieved my weight goal", use "I am healthy and weigh my ideal weight").
3. **Positive**: Focus on the successful outcome and the feeling of achievement.
4. **Personal**: Use "I" and "My".
5. **No Date Duplication**: If the Goal content ("${goalContent}") already mentions a date, year, month, or timeframe, do NOT append or repeat the deadline ("${dateStr}") in the affirmation. Only include the deadline if it is not already described in the Goal content.

Return ONLY the plain text of the affirmation. Do not wrap it in quotes, JSON, or markdown.
`.trim();

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a professional mindset and wellness coach. You MUST return exactly 1 affirmation in plain text. No JSON, no markdown, no quotes." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 150,
            });

            let content = response.choices[0]?.message?.content?.trim() || '';
            if (content) {
                // Clean up any outer quotes or brackets in case AI ignored instruction
                content = content.replace(/^["'\[]+|["'\]]+$/g, '').trim();
                if (content.length > 0) {
                    console.log('[OpenAI] Generated affirmation:', content);
                    return content;
                }
            }
            
            return generateFallbackAffirmation(goalContent, dateStr, deadline);
        } catch (error: any) {
            if (error?.status === 401 || error?.message?.includes('API key')) {
                console.warn('[OpenAI] API key is invalid (401). Using offline fallback for affirmations.');
            } else {
                console.error('[OpenAI] Failed to generate affirmation:', error?.message || error);
            }
            return generateFallbackAffirmation(goalContent, dateStr, deadline);
        }
    }
};
