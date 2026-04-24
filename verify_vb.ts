import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyVisionBoard() {
    console.log('Verifying vision board metadata persistence...');
    
    // Create a dummy user if not exists or use an existing one
    let user = await prisma.user.findFirst();
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: 'test@example.com',
                passwordHash: 'dummy',
            }
        });
    }

    const boardName = 'Test Vision Board ' + Date.now();
    const sections = { header: { title: 'Dream Big' } };
    const selectedGoalIds = ['goal-1', 'goal-2'];

    console.log('Creating board...');
    const board = await prisma.visionBoard.create({
        data: {
            userId: user.id,
            name: boardName,
            sections,
            selectedGoalIds
        }
    });

    console.log('Board created:', board.id);
    console.log('Sections:', JSON.stringify(board.sections));
    console.log('SelectedGoalIds:', board.selectedGoalIds);

    if (JSON.stringify(board.sections) === JSON.stringify(sections) && 
        JSON.stringify(board.selectedGoalIds) === JSON.stringify(selectedGoalIds)) {
        console.log('SUCCESS: Metadata persisted correctly!');
    } else {
        console.error('FAILURE: Metadata mismatch!');
    }

    // Cleanup
    await prisma.visionBoard.delete({ where: { id: board.id } });
    await prisma.$disconnect();
}

verifyVisionBoard().catch(console.error);
