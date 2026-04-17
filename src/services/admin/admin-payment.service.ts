
import { premiumRequestRepository } from '../../repositories/premium-request.repository';
import { userRepository } from '../../repositories/user.repository';
import { notificationService } from '../notification.service';
import { PaymentStatus, PremiumRequest } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../utils/errors';

export const adminPaymentService = {
    async getPendingRequests(): Promise<PremiumRequest[]> {
        return premiumRequestRepository.findPending();
    },

    async getAllRequests(): Promise<PremiumRequest[]> {
        return premiumRequestRepository.findAll();
    },

    async processRequest(requestId: string, status: PaymentStatus, adminNote?: string): Promise<PremiumRequest> {
        const request = await premiumRequestRepository.findById(requestId);
        if (!request) {
            throw NotFoundError.resource('PremiumRequest', requestId);
        }

        if (request.status !== 'PENDING') {
            throw new BadRequestError('Request has already been processed', 'PAYMENT_ALREADY_PROCESSED');
        }

        // Update request status
        const updatedRequest = await premiumRequestRepository.updateStatus(requestId, status, adminNote);

        if (status === 'APPROVED') {
            const user = await userRepository.findById(request.userId);
            if (!user) {
                throw NotFoundError.resource('User', request.userId);
            }

            // Calculate new premium end date
            const now = new Date();
            let baseDate = now;

            // If user already has active premium, extend it from the current end date
            if (user.premiumEndsAt && user.premiumEndsAt > now) {
                baseDate = user.premiumEndsAt;
            }

            const newEndDate = new Date(baseDate);
            newEndDate.setMonth(newEndDate.getMonth() + request.months);

            // Update user plan and expiry
            await userRepository.update(user.id, {
                plan: 'PREMIUM',
                premiumEndsAt: newEndDate,
            });

            // Send FCM Notification
            try {
                await notificationService.sendToUser(
                    user.id,
                    'Premium Approved! 🚀',
                    `Your request for ${request.months} month(s) of Premium has been approved. Enjoy your full access!`,
                    { type: 'PREMIUM_APPROVED', requestId: request.id }
                );
            } catch (error) {
                console.error(`Failed to send notification to user ${user.id}:`, error);
                // We don't throw here to avoid rolling back the database change
            }
        } else if (status === 'REJECTED') {
            // Send FCM Notification for rejection
            try {
                await notificationService.sendToUser(
                    request.userId,
                    'Premium Request Update',
                    `Your premium request has been declined. ${adminNote ? 'Note: ' + adminNote : ''}`,
                    { type: 'PREMIUM_REJECTED', requestId: request.id }
                );
            } catch (error) {
                console.error(`Failed to send rejection notification:`, error);
            }
        }

        return updatedRequest;
    },
};
