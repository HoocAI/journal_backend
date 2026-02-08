import {
    adminAudioRepository,
    type AdminAudioData,
    type CreateAdminAudioInput,
} from '../../repositories/admin-audio.repository';
import { NotFoundError } from '../../utils/errors';

export const adminAudioService = {
    async createAudio(input: CreateAdminAudioInput): Promise<AdminAudioData> {
        return adminAudioRepository.create(input);
    },

    async getAllAudio(): Promise<AdminAudioData[]> {
        return adminAudioRepository.findAll();
    },

    async getAudioById(id: string): Promise<AdminAudioData> {
        const audio = await adminAudioRepository.findById(id);
        if (!audio) {
            throw NotFoundError.resource('Audio', id);
        }
        return audio;
    },
};
