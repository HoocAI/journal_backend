import { userRepository, type UserData } from '../../repositories/user.repository';
import { NotFoundError } from '../../utils/errors';
import { getSignedUrl } from '../../utils/s3';

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


        const updatedUser = await userRepository.update(userId, input);
        if (updatedUser.photoS3Key) {
            updatedUser.photoUrl = await getSignedUrl(updatedUser.photoS3Key);
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
