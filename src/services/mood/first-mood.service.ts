import { MoodType } from '@prisma/client';
import { ConflictError } from '../../utils/errors';
import { firstMoodRepository } from '../../repositories/first-mood.repository';

export interface CreateFirstMoodInput {
    mood: MoodType;
    reason?: string;
}

export const firstMoodService = {
    async createEntry(userId: string, input: CreateFirstMoodInput) {
        const existing = await firstMoodRepository.findByUserId(userId);
        if (existing) {
            throw new ConflictError('First mood has already been recorded for this user.');
        }

        return firstMoodRepository.create({
            userId,
            mood: input.mood,
            reason: input.reason,
        });
    },

    async getEntry(userId: string) {
        return firstMoodRepository.findByUserId(userId);
    },
};
