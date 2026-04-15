
import { goalService } from './src/services/goal/goal.service';
import { prisma } from './src/lib/prisma';

async function main() {
    const testUserId = '7a989ba3-4ff4-4dea-91f5-49e45cfc379f'; // From my earlier check_users.ts results
    
    console.log('Testing creation of a new goal...');
    const newGoal = await goalService.createGoal(testUserId, {
        type: 'HEALTH',
        content: 'I want to achieve a promotion to "abc" post',
        deadline: '2026-04-15'
    });

    console.log('Created Goal:', JSON.stringify(newGoal, null, 2));
    
    if (newGoal.affirmation && newGoal.affirmation.includes('I have achieved a promotion')) {
        console.log('Verification SUCCESS: Affirmation generated correctly.');
    } else {
        console.log('Verification FAILED: Affirmation might be missing or incorrect.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
