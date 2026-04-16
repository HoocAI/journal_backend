
import dotenv from 'dotenv';
dotenv.config();

import { openaiService } from './src/services/ai/openai.service';

async function testAffirmation() {
    const goals = [
        { content: "achieve a promotion to 'abc' post", deadline: new Date('2026-04-15') },
        { content: "save 1,000,000 in my bank account", deadline: null },
        { content: "earn 150,000 per month", deadline: null }
    ];

    console.log('--- Testing New AI Affirmation Prompt ---\n');

    for (const goal of goals) {
        console.log(`Goal: "${goal.content}"`);
        const affirmation = await openaiService.generateGoalAffirmation(goal.content, goal.deadline || undefined);
        console.log(`Affirmation: "${affirmation}"\n`);
    }
}

testAffirmation();
