import { prisma } from '../lib/prisma';

export interface GoalData {
    id: string;
    userId: string;
    type: string;
    content: string;
    deadline?: Date | null;
    isAutomated: boolean;
    targetValue?: string | null;
    templateKey?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateGoalInput {
    userId: string;
    type: string;
    content: string;
    deadline?: Date;
    isAutomated?: boolean;
    targetValue?: string;
    templateKey?: string;
}

export const goalRepository = {
    async create(data: CreateGoalInput): Promise<GoalData> {
        return prisma.goal.create({ data });
    },

    /**
     * Replaces all goals of a specific type for a user with a new set of goals.
     * Uses a transaction to ensure atomicity.
     */
    async overwriteCategoryGoals(userId: string, type: string, goals: Omit<CreateGoalInput, 'userId' | 'type'>[]): Promise<GoalData[]> {
        return prisma.$transaction(async (tx) => {
            // 1. Delete all existing goals for this category
            await tx.goal.deleteMany({
                where: { userId, type },
            });

            // 2. Create the new goals
            const createdGoals = await Promise.all(
                goals.map((goal) =>
                    tx.goal.create({
                        data: {
                            ...goal,
                            userId,
                            type,
                        },
                    })
                )
            );

            return createdGoals;
        });
    },

    async findByUserId(userId: string): Promise<GoalData[]> {
        return prisma.goal.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    },

    async findAll(): Promise<GoalData[]> {
        return prisma.goal.findMany({
            orderBy: { createdAt: 'desc' }
        });
    },

    async update(id: string, content: string): Promise<GoalData> {
        return prisma.goal.update({
            where: { id },
            data: { content },
        });
    },

    async delete(id: string): Promise<GoalData> {
        return prisma.goal.delete({
            where: { id },
        });
    },
};