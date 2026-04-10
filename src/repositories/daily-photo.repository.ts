import { prisma } from '../lib/prisma';

export const dailyPhotoRepository = {
    async create(data: { userId: string; url: string; s3Key: string; date: Date }) {
        return prisma.dailyPhoto.create({ data });
    },

    async findByUserId(userId: string) {
        return prisma.dailyPhoto.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
        });
    },

    async findForDate(userId: string, date: Date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return prisma.dailyPhoto.findFirst({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });
    },

    async delete(id: string) {
        return prisma.dailyPhoto.delete({
            where: { id },
        });
    },
};
