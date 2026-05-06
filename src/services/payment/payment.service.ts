
import { premiumRequestRepository, type CreateRequestData } from '../../repositories/premium-request.repository';
import { PremiumRequest } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../utils/errors';

export const paymentService = {
    async requestPremium(data: CreateRequestData): Promise<PremiumRequest> {
        if (data.amount !== undefined && (!Number.isFinite(data.amount) || data.amount <= 0)) {
            throw new BadRequestError('Invalid payment amount', 'PAYMENT_INVALID_AMOUNT');
        }

        if (data.months !== undefined && (!Number.isInteger(data.months) || data.months < 1 || data.months > 60)) {
            throw new BadRequestError('Invalid premium duration', 'PAYMENT_INVALID_MONTHS');
        }

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
