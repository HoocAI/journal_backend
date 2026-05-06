import { userRepository, type UserData } from '../../repositories/user.repository';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { getSignedUrl, deleteObjectFromS3 } from '../../utils/s3';
import { isValidTimezone } from '../../utils/date';

export interface UpdateProfileInput {
    name?: string;
    age?: number;
    language?: string;
    timezone?: string;
    gender?: string;
    focus?: string[];
    onboardingCompleted?: boolean;
    goalsSet?: boolean;
    photoUrl?: string;
    photoS3Key?: string;
}

export const userService = {
    async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserData> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        if (input.timezone && !isValidTimezone(input.timezone)) {
            throw ValidationError.invalidTimezone(input.timezone);
        }

        const updatedUser = await userRepository.update(userId, input);
        if (updatedUser.photoS3Key) {
            updatedUser.photoUrl = await getSignedUrl(updatedUser.photoS3Key);
        }

        if (input.photoS3Key && user.photoS3Key && user.photoS3Key !== input.photoS3Key) {
            await deleteObjectFromS3(user.photoS3Key).catch((error) => {
                console.error(`Failed to delete old profile image for user ${userId}:`, error);
            });
        }

        return updatedUser;
    },

    async getProfile(userId: string): Promise<UserData> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        if (user.photoS3Key) {
            user.photoUrl = await getSignedUrl(user.photoS3Key);
        }
        return user;
    }
};
