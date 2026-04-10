import { dailyPhotoRepository, userRepository } from '../../repositories';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';

export const dailyPhotoService = {
    async uploadPhoto(userId: string, photoData: { url: string; s3Key: string }) {
        // Check if user is disabled
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        if (!user.isActive) {
            throw ForbiddenError.accountDisabled();
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if photo already exists for today
        const existing = await dailyPhotoRepository.findForDate(userId, today);
        if (existing) {
            // Options: overwrite or throw error. 
            // The prompt says "allows users to upload a new 'best picture of the day', distinct from any previously uploaded images"
            // Usually "distinct from previously uploaded" means history.
            // "only one per day" means if they upload again today, it's a conflict or overwrite.
            // I'll throw ConflictError as I proposed in the plan.
            throw new ConflictError('A photo of the day already exists for today. Please update or delete the existing one first.', 'DAILY_PHOTO_EXISTS');
        }

        return dailyPhotoRepository.create({
            userId,
            url: photoData.url,
            s3Key: photoData.s3Key,
            date: today,
        });
    },

    async getTodayPhoto(userId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dailyPhotoRepository.findForDate(userId, today);
    },

    async getHistory(userId: string) {
        return dailyPhotoRepository.findByUserId(userId);
    },

    async deletePhoto(id: string, userId: string) {
        // Implementation for deleting a photo could be added here
        return dailyPhotoRepository.delete(id);
    }
};
