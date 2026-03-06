import { prisma } from '../lib/prisma';

export interface GoalData {
    id: string;
    userId: string;
    type: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export const goalRepository = {
    async create(data: { userId: string; type: string; content: string }): Promise<GoalData> {
        return prisma.goal.create({ data });
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