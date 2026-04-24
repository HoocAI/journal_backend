
import { prisma } from './src/lib/prisma';
import { openaiService } from './src/services/ai/openai.service';

async function main() {
    console.log('Fetching all goals...');
    const goals = await prisma.goal.findMany();
    console.log(`Found ${goals.length} goals to process.`);

    for (const goal of goals) {
        if (goal.affirmation) {
            console.log(`Skipping goal ${goal.id} (already has affirmation).`);
            continue;
        }

        console.log(`Processing goal ${goal.id}: "${goal.content.substring(0, 30)}..."`);
        try {
            const affirmation = await openaiService.generateGoalAffirmation(goal.content, goal.deadline || undefined);
            await prisma.goal.update({
                where: { id: goal.id },
                data: { affirmation },
            });
            console.log(`Successfully generated affirmation: "${affirmation}"`);
        } catch (error) {
            console.error(`Failed to process goal ${goal.id}:`, error);
        }
    }

    console.log('All goals processed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
