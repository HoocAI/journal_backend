
import { OpenAI } from 'openai';
import "dotenv/config";

const apiKey = process.env.OPENAI_API_KEY || '';
const openai = apiKey ? new OpenAI({ apiKey }) : null;

/**
 * Helper to generate offline fallback affirmations avoiding generic prefixes and duplicate dates
 */
function generateFallbackAffirmations(goalContent: string, dateStr: string, deadline?: Date): string {
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
    
    const affirmations = Array(5).fill(fallbackText);
    console.log('[OpenAI] Generated affirmations (Fallback):', affirmations);
    return JSON.stringify(affirmations);
}

export const openaiService = {
    /**
     * Generates affirmations for a goal
     * @param goalContent The description of the goal
     * @param deadline Optional deadline for the goal
     * @returns A stringified JSON array containing 5 affirmations
     */
    async generateGoalAffirmation(goalContent: string, deadline?: Date): Promise<string> {
        const dateStr = deadline
            ? deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : '';

        if (!openai) {
            console.warn('[OpenAI] API key is missing. Using offline fallback for affirmations.');
            return generateFallbackAffirmations(goalContent, dateStr, deadline);
        }

        const prompt = `
Convert the following goal (sometimes called a manifestation) into exactly 5 powerful personal affirmations.

Goal: "${goalContent}"
${deadline ? `Deadline: ${dateStr}` : 'No specific deadline'}

Rules for Good Affirmations:
1. **Quantity**: You MUST generate exactly 5 distinct affirmations.
2. **Present Tense**: Use "I am", "I am now", "I feel", "I enjoy", or action verbs (as if it has already happened). Avoid "I will" or "I want to".
3. **No Generic Prefix**: Do NOT start the affirmations with the generic phrase "I have achieved" or "I have successfully achieved". Instead, describe the specific state or result directly (e.g., instead of "I have achieved my weight goal", use "I am healthy and weigh my ideal weight").
4. **Positive**: Focus on the successful outcome and the feeling of achievement.
5. **Personal**: Use "I" and "My".
6. **No Date Duplication**: If the Goal content ("${goalContent}") already mentions a date, year, month, or timeframe, do NOT append or repeat the deadline ("${dateStr}") in the affirmations. Only include the deadline if it is not already described in the Goal content.

Return ONLY a valid JSON array containing exactly 5 string affirmations. Do not include markdown formatting like \`\`\`json.
`.trim();

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a professional mindset and wellness coach. You MUST return exactly 5 affirmations in a strict JSON array format. No prose, no conversation, just the array." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 300,
            });

            const content = response.choices[0]?.message?.content?.trim();
            if (content) {
                // Remove markdown code blocks if AI ignored instructions
                const cleanContent = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
                
                try {
                    const parsed = JSON.parse(cleanContent);
                    if (Array.isArray(parsed)) {
                        // Strictly return 5 items
                        const result = parsed.slice(0, 5);
                        while (result.length < 5) {
                            result.push(result[result.length - 1] || "I am achieving my goals.");
                        }
                        console.log('[OpenAI] Generated affirmations:', result);
                        return JSON.stringify(result);
                    }
                } catch (e) {
                    // If JSON fails, try to extract lines that look like affirmations
                    const lines = cleanContent.split('\n')
                        .map(l => l.replace(/^[\d.\-*]\s+/, '').replace(/^["']|["']$/g, '').trim())
                        .filter(l => l.length > 10);
                    
                    if (lines.length >= 5) {
                        const result = lines.slice(0, 5);
                        console.log('[OpenAI] Generated affirmations (Extracted):', result);
                        return JSON.stringify(result);
                    }
                }
            }
            
            return generateFallbackAffirmations(goalContent, dateStr, deadline);
        } catch (error: any) {
            if (error?.status === 401 || error?.message?.includes('API key')) {
                console.warn('[OpenAI] API key is invalid (401). Using offline fallback for affirmations.');
            } else {
                console.error('[OpenAI] Failed to generate affirmation:', error?.message || error);
            }
            return generateFallbackAffirmations(goalContent, dateStr, deadline);
        }
    }
};
