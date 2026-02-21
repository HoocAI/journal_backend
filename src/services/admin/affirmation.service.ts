
import { prisma } from '../../lib/prisma';
import { MoodType } from '@prisma/client';

export interface CreateAffirmationDto {
    text: string;
    author?: string;
    mood: MoodType;
}

export const affirmationService = {
    /**
     * Create a new affirmation linked to a specific mood
     */
    async createAffirmation(data: CreateAffirmationDto) {
        return prisma.affirmation.create({
            data: {
                text: data.text,
                author: data.author,
                mood: data.mood,
            },
        });
    },

    /**
     * Get all affirmations, optionally filtered by mood
     */
    async getAffirmations(mood?: MoodType) {
        if (mood) {
            return prisma.affirmation.findMany({
                where: { mood },
                orderBy: { createdAt: 'desc' },
            });
        }
        return prisma.affirmation.findMany({
            orderBy: { createdAt: 'desc' },
        });
    },

    /**
     * Delete an affirmation by ID
     */
    async deleteAffirmation(id: string) {
        return prisma.affirmation.delete({
            where: { id },
        });
    },

    /**
     * Get a random affirmation for a specific mood
     */
    async getRandomAffirmation(mood: MoodType) {
        const affirmations = await prisma.affirmation.findMany({
            where: { mood },
        });

        if (affirmations.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * affirmations.length);
        return affirmations[randomIndex];
    },
};
