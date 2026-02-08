import { userRepository, type UserData } from '../../repositories/user.repository';
import { NotFoundError } from '../../utils/errors';

export interface UpdateProfileInput {
    name?: string;
    age?: number;
    language?: string;
    timezone?: string;
    focus?: string[];
    onboardingCompleted?: boolean;
    goalsSet?: boolean;
}

export const userService = {
    async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserData> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        return userRepository.update(userId, input);
    },

    async getProfile(userId: string): Promise<UserData> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    }
};
