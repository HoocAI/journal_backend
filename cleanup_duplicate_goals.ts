import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
    console.log('Starting goal cleanup...');
    
    // Find all goals
    const allGoals = await prisma.goal.findMany({
        orderBy: { createdAt: 'desc' }
    });

    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const goal of allGoals) {
        const key = `${goal.userId}_${goal.type}`;
        if (seen.has(key)) {
            // This is a duplicate (older, because we ordered by createdAt desc)
            toDelete.push(goal.id);
        } else {
            seen.add(key);
        }
    }

    if (toDelete.length > 0) {
        console.log(`Found ${toDelete.length} duplicate goals to delete.`);
        const result = await prisma.goal.deleteMany({
            where: {
                id: { in: toDelete }
            }
        });
        console.log(`Successfully deleted ${result.count} duplicates.`);
    } else {
        console.log('No duplicate goals found.');
    }

    await prisma.$disconnect();
}

cleanupDuplicates().catch(console.error);
