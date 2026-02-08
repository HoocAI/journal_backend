import { journalRepository, userRepository } from '../../repositories';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';

export interface CreateJournalInput {
    content: string;
    photoUrl?: string;
    audioUrl?: string;
}

export interface UpdateJournalInput {
    content?: string;
    photoUrl?: string;
    audioUrl?: string;
}

export const journalService = {
    async createEntry(userId: string, input: CreateJournalInput) {
        // Check if user is disabled
        const user = await userRepository.findById(userId);
        if (user && !user.isActive) {
            throw ForbiddenError.accountDisabled();
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if entry already exists for today
        const existing = await journalRepository.findByUserIdAndDate(userId, today);
        if (existing) {
            throw ConflictError.journalEntryExists(today);
        }

        return journalRepository.create({
            userId,
            content: input.content,
            photoUrl: input.photoUrl,
            audioUrl: input.audioUrl,
            entryDate: today,
        });
    },

    async updateEntry(id: string, userId: string, input: UpdateJournalInput) {
        const entry = await journalRepository.findById(id);
        if (!entry) {
            throw new NotFoundError('Journal entry not found');
        }

        if (entry.userId !== userId) {
            throw new ForbiddenError('You can only update your own entries');
        }

        // Enforce immutability: Only allow updates if the entry is from today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const entryDate = new Date(entry.entryDate);
        entryDate.setHours(0, 0, 0, 0);

        if (entryDate.getTime() !== today.getTime()) {
            throw new ValidationError('Journal entries from previous days cannot be modified');
        }

        return journalRepository.update(id, input);
    },

    async getEntryByDate(userId: string, date: Date) {
        return journalRepository.findByUserIdAndDate(userId, date);
    },

    async getAllEntries(userId: string) {
        return journalRepository.findByUserId(userId);
    },
};
