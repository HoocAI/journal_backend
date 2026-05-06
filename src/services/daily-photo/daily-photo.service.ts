import { dailyPhotoRepository, userRepository } from '../../repositories';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { deleteObjectFromS3 } from '../../utils/s3';
import { getCurrentDateInTimezone, isSameDayInTimezone, isValidTimezone } from '../../utils/date';

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

        const timezone = isValidTimezone(user.timezone ?? '') ? user.timezone! : 'UTC';
        const today = getCurrentDateInTimezone(timezone);

        // Check if photo already exists for today
        const existingPhotos = await dailyPhotoRepository.findByUserId(userId);
        const existing = existingPhotos.find((photo) => isSameDayInTimezone(photo.date, today, timezone));
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
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        const timezone = isValidTimezone(user.timezone ?? '') ? user.timezone! : 'UTC';
        const today = getCurrentDateInTimezone(timezone);
        const photos = await dailyPhotoRepository.findByUserId(userId);
        return photos.find((photo) => isSameDayInTimezone(photo.date, today, timezone)) ?? null;
    },

    async getHistory(userId: string) {
        return dailyPhotoRepository.findByUserId(userId);
    },

    async deletePhoto(id: string, userId: string) {
        const existing = await dailyPhotoRepository.findByUserId(userId);
        const photo = existing.find((item) => item.id === id);
        if (!photo) {
            throw new NotFoundError('Photo not found');
        }

        const deletedPhoto = await dailyPhotoRepository.delete(id);
        await deleteObjectFromS3(photo.s3Key).catch((error) => {
            console.error(`Failed to delete daily photo asset ${photo.s3Key}:`, error);
        });
        return deletedPhoto;
    }
};
