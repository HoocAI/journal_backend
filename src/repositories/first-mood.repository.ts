import { MoodType } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const firstMoodRepository = {
    async create(data: { userId: string; mood: MoodType; reason?: string }) {
        return prisma.firstMoodEntry.create({ data });
    },

    async findByUserId(userId: string) {
        return prisma.firstMoodEntry.findUnique({
            where: { userId },
        });
    },
};
