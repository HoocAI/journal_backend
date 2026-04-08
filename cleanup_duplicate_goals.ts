import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicateGoals() {
    console.log('Finding duplicate goals (same userId + type)...');

    // Find all goals grouped by userId and type
    const allGoals = await prisma.goal.findMany({
        orderBy: { updatedAt: 'desc' },
    });

    // Group by userId + type
    const groups = new Map<string, typeof allGoals>();
    for (const goal of allGoals) {
        const key = `${goal.userId}__${goal.type}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(goal);
    }

    let deletedCount = 0;

    for (const [key, goals] of groups) {
        if (goals.length > 1) {
            // Keep the first one (most recently updated), delete the rest
            const [keep, ...duplicates] = goals;
            console.log(`\nGroup: ${key}`);
            console.log(`  Keeping: id=${keep.id}, content="${keep.content.substring(0, 50)}...", updatedAt=${keep.updatedAt}`);

            for (const dup of duplicates) {
                console.log(`  Deleting: id=${dup.id}, content="${dup.content.substring(0, 50)}...", updatedAt=${dup.updatedAt}`);
                
                // Check if this goal has any AssessmentResults linked to it
                const assessmentCount = await prisma.assessmentResult.count({ where: { goalId: dup.id } });
                if (assessmentCount > 0) {
                    // Reassign assessments to the kept goal
                    console.log(`    -> Reassigning ${assessmentCount} assessment results to kept goal`);
                    await prisma.assessmentResult.updateMany({
                        where: { goalId: dup.id },
                        data: { goalId: keep.id },
                    });
                }

                await prisma.goal.delete({ where: { id: dup.id } });
                deletedCount++;
            }
        }
    }

    console.log(`\nDone! Deleted ${deletedCount} duplicate goals.`);
}

cleanupDuplicateGoals()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
