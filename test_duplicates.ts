import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
    console.log('Checking for duplicate goals (same userId and type)...');
    
    const goals = await prisma.goal.findMany();
    const userGroups: Record<string, Record<string, any[]>> = {};

    goals.forEach(goal => {
        if (!userGroups[goal.userId]) userGroups[goal.userId] = {};
        if (!userGroups[goal.userId][goal.type]) userGroups[goal.userId][goal.type] = [];
        userGroups[goal.userId][goal.type].push(goal);
    });

    let duplicatesCount = 0;
    for (const userId in userGroups) {
        for (const type in userGroups[userId]) {
            if (userGroups[userId][type].length > 1) {
                console.log(`User ${userId} has ${userGroups[userId][type].length} goals of type "${type}":`);
                userGroups[userId][type].forEach(g => {
                    console.log(`  - ID: ${g.id}, CreatedAt: ${g.createdAt}, Content: ${g.content.substring(0, 30)}...`);
                });
                duplicatesCount++;
            }
        }
    }

    if (duplicatesCount === 0) {
        console.log('No duplicates found! The unique constraint is holding.');
    } else {
        console.log(`Found ${duplicatesCount} sets of duplicates.`);
    }

    await prisma.$disconnect();
}

checkDuplicates().catch(console.error);
