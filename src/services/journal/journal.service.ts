import { journalRepository, userRepository } from '../../repositories';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { deleteObjectFromS3 } from '../../utils/s3';
import { getCurrentDateInTimezone, isSameDayInTimezone, isValidTimezone } from '../../utils/date';

export interface CreateJournalInput {
    content: string;
    photoUrl?: string;
    photoS3Key?: string;
    audioUrl?: string;
    audioS3Key?: string;
}

export interface UpdateJournalInput {
    content?: string;
    photoUrl?: string;
    photoS3Key?: string;
    audioUrl?: string;
    audioS3Key?: string;
}

export const journalService = {
    async createEntry(userId: string, input: CreateJournalInput) {
        // Check if user is disabled
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        if (!user.isActive) {
            throw ForbiddenError.accountDisabled();
        }

        const timezone = isValidTimezone(user.timezone ?? '') ? user.timezone! : 'UTC';
        const today = getCurrentDateInTimezone(timezone);

        // Check if entry already exists for today
        const existingEntries = await journalRepository.findByUserId(userId);
        const existing = existingEntries.find((entry) => isSameDayInTimezone(entry.entryDate, today, timezone));
        if (existing) {
            throw ConflictError.journalEntryExists(today);
        }

        const entry = await journalRepository.create({
            userId,
            content: input.content,
            photoUrl: input.photoUrl,
            photoS3Key: input.photoS3Key,
            audioUrl: input.audioUrl,
            audioS3Key: input.audioS3Key,
            entryDate: today,
        });

        // Update Streak and Coins
        const lastEntryDate = user.lastEntryDate ? new Date(user.lastEntryDate) : null;
        let newStreak = user.currentStreak;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        if (!lastEntryDate) {
            newStreak = 1;
        } else {
            const lastDateOnly = new Date(lastEntryDate);
            lastDateOnly.setHours(0, 0, 0, 0);

            if (lastDateOnly.getTime() === yesterday.getTime()) {
                newStreak += 1;
            } else if (lastDateOnly.getTime() < yesterday.getTime()) {
                newStreak = 1;
            }
        }

        const longestStreak = Math.max(user.longestStreak, newStreak);
        const newCoins = user.coins + 1;

        let plan = user.plan;
        if (newStreak === 14) {
            plan = 'PREMIUM';
        }

        await userRepository.update(userId, {
            currentStreak: newStreak,
            longestStreak,
            lastEntryDate: today,
            coins: newCoins,
            plan
        });

        return entry;
    },

    async updateEntry(id: string, userId: string, input: UpdateJournalInput) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        const entry = await journalRepository.findById(id);
        if (!entry) {
            throw new NotFoundError('Journal entry not found');
        }

        if (entry.userId !== userId) {
            throw new ForbiddenError('You can only update your own entries');
        }

        // Enforce immutability: Only allow updates if the entry is from today
        const timezone = isValidTimezone(user.timezone ?? '') ? user.timezone! : 'UTC';
        const today = getCurrentDateInTimezone(timezone);

        if (!isSameDayInTimezone(entry.entryDate, today, timezone)) {
            throw new ValidationError('Journal entries from previous days cannot be modified');
        }

        const previousPhotoS3Key = entry.photoS3Key;
        const previousAudioS3Key = entry.audioS3Key;

        const updatedEntry = await journalRepository.update(id, input);

        if (previousPhotoS3Key && previousPhotoS3Key !== updatedEntry.photoS3Key) {
            await deleteObjectFromS3(previousPhotoS3Key).catch((error) => {
                console.error(`Failed to delete old journal photo for entry ${id}:`, error);
            });
        }

        if (previousAudioS3Key && previousAudioS3Key !== updatedEntry.audioS3Key) {
            await deleteObjectFromS3(previousAudioS3Key).catch((error) => {
                console.error(`Failed to delete old journal audio for entry ${id}:`, error);
            });
        }

        return updatedEntry;
    },

    async getEntryByDate(userId: string, date: Date) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        const timezone = isValidTimezone(user.timezone ?? '') ? user.timezone! : 'UTC';
        const entries = await journalRepository.findByUserId(userId);
        return entries.find((entry) => isSameDayInTimezone(entry.entryDate, date, timezone)) ?? null;
    },

    async getAllEntries(userId: string) {
        return journalRepository.findByUserId(userId);
    },
};
