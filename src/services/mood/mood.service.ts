import { MoodType } from '@prisma/client';
import { ConflictError } from '../../utils/errors';
import { moodRepository } from '../../repositories/mood.repository';

export interface CreateMoodInput {
    mood: MoodType;
    reason?: string;
}

export const moodService = {
    async createEntry(userId: string, input: CreateMoodInput) {
        const today = new Date();
        // We will keep the entryDate as today's start of day for analytics,
        // but since we removed the unique constraint, we allow multiple entries.
        today.setHours(0, 0, 0, 0);

        return moodRepository.create({
            userId,
            mood: input.mood,
            reason: input.reason,
            entryDate: today,
        });
    },

    async getAllEntries(userId: string) {
        return moodRepository.findByUserId(userId);
    },
};
