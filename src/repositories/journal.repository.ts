import { prisma } from '../lib/prisma';

export const journalRepository = {
    async create(data: { userId: string; content: string; photoUrl?: string; audioUrl?: string; entryDate: Date }) {
        return prisma.journalEntry.create({ data });
    },

    async findByUserId(userId: string) {
        return prisma.journalEntry.findMany({
            where: { userId },
            orderBy: { entryDate: 'desc' },
        });
    },

    async findById(id: string) {
        return prisma.journalEntry.findUnique({
            where: { id },
        });
    },

    async findByUserIdAndDate(userId: string, entryDate: Date) {
        const startOfDay = new Date(entryDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(entryDate);
        endOfDay.setHours(23, 59, 59, 999);

        return prisma.journalEntry.findFirst({
            where: {
                userId,
                entryDate: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });
    },

    async update(id: string, data: { content?: string; photoUrl?: string; audioUrl?: string }) {
        return prisma.journalEntry.update({
            where: { id },
            data,
        });
    },
};
