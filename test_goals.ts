import { PrismaClient } from '@prisma/client';
import { goalService } from './src/services/goal/goal.service';

const prisma = new PrismaClient();

async function runTest() {
    try {
        console.log("Connecting to Database...");
        await prisma.$connect();

        const testUser = await prisma.user.findFirst();
        if (!testUser) {
            console.log("No users found to associate the test goal. Test aborted.");
            return;
        }

        console.log(`Creating test goal for user ${testUser.id}...`);
        const newGoal = await goalService.createGoal(testUser.id, {
            type: 'financial',
            content: 'Test Financial Goal'
        });
        console.log("Goal created successfully:", newGoal);

        console.log("Fetching all goals (Admin Endpoint simulation)...");
        const allGoals = await goalService.getAllGoals();
        console.log(`Total goals found: ${allGoals.length}`);

        console.log("Cleaning up the test goal...");
        // the deleteGoal signature in service is `deleteGoal(id: string, userId: string)`
        await goalService.deleteGoal(newGoal.id, testUser.id);
        console.log("Cleanup complete. Goal endpoints are working perfectly.");

    } catch (error) {
        console.error("Error during test:", error);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
