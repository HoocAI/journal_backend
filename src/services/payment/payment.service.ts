
import { premiumRequestRepository, type CreateRequestData } from '../../repositories/premium-request.repository';
import { PremiumRequest } from '@prisma/client';
import { NotFoundError } from '../../utils/errors';

export const paymentService = {
    async requestPremium(data: CreateRequestData): Promise<PremiumRequest> {
        return premiumRequestRepository.create(data);
    },

    async getMyRequests(userId: string): Promise<PremiumRequest[]> {
        return premiumRequestRepository.findByUserId(userId);
    },

    async getRequestById(requestId: string): Promise<PremiumRequest> {
        const request = await premiumRequestRepository.findById(requestId);
        if (!request) {
            throw NotFoundError.resource('PremiumRequest', requestId);
        }
        return request;
    },
};
