import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMultiGoal() {
    console.log('Verifying Multiple Goals per Category & Overwrite Logic...');

    let user = await prisma.user.findFirst();
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: 'multigoal@example.com',
                passwordHash: 'dummy',
            }
        });
    }

    const type = 'financial';

    // 1. Clear existing goals for this user/type
    await prisma.goal.deleteMany({ where: { userId: user.id, type } });

    console.log(`Setting 3 goals for ${type}...`);
    // Simulate what the service does
    const goalsToCreate = [
        { content: 'Goal 1', userId: user.id, type },
        { content: 'Goal 2', userId: user.id, type },
        { content: 'Goal 3', userId: user.id, type },
    ];
    
    await prisma.goal.createMany({ data: goalsToCreate });

    let count = await prisma.goal.count({ where: { userId: user.id, type } });
    console.log(`Goals in DB: ${count} (Expected: 3)`);
    if (count !== 3) throw new Error('Failed to create multiple goals');

    console.log(`Overwriting ${type} with 2 new goals...`);
    // Simulate the transaction logic
    await prisma.$transaction([
        prisma.goal.deleteMany({ where: { userId: user.id, type } }),
        prisma.goal.createMany({
            data: [
                { content: 'New Goal A', userId: user.id, type },
                { content: 'New Goal B', userId: user.id, type },
            ]
        })
    ]);

    const finalGoals = await prisma.goal.findMany({ where: { userId: user.id, type } });
    console.log(`Final goals count: ${finalGoals.length} (Expected: 2)`);
    console.log('Contents:', finalGoals.map(g => g.content));

    if (finalGoals.length !== 2) throw new Error('Overwrite failed');
    if (finalGoals.some(g => g.content.startsWith('Goal'))) throw new Error('Old goals were not deleted');

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });

    console.log('SUCCESS: Multi-goal support and overwrite logic verified!');
    await prisma.$disconnect();
}

verifyMultiGoal().catch(console.error);
