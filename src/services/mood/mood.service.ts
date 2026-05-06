import { MoodType } from '@prisma/client';
import { NotFoundError } from '../../utils/errors';
import { moodRepository } from '../../repositories/mood.repository';
import { userRepository } from '../../repositories';
import { getCurrentDateInTimezone, isValidTimezone } from '../../utils/date';

export interface CreateMoodInput {
    mood: MoodType;
    reason?: string;
    whySuchMood?: string;
    whyThisMood?: string;
}

export const moodService = {
    async createEntry(userId: string, input: CreateMoodInput) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        const timezone = isValidTimezone(user.timezone ?? '') ? user.timezone! : 'UTC';
        const today = getCurrentDateInTimezone(timezone);

        return moodRepository.create({
            userId,
            mood: input.mood,
            reason: input.reason,
            whySuchMood: input.whySuchMood,
            whyThisMood: input.whyThisMood,
            entryDate: today,
        });
    },

    async getAllEntries(userId: string) {
        return moodRepository.findByUserId(userId);
    },
};
