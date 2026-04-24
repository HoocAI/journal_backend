import { firebaseAdmin, getFirebaseStatus } from '../config/firebase.config';
import { prisma } from '../lib/prisma';

export const notificationService = {
    /**
     * Send a notification to a specific user
     */
    async sendToUser(userId: string, title: string, body: string, data?: any) {
        const firebaseStatus = getFirebaseStatus();
        if (!firebaseStatus.initialized) {
            console.error('Cannot send notification: Firebase Admin SDK not initialized');
            throw new Error('Notification service is currently unavailable (Firebase not initialized)');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { fcmToken: true }
        });

        if (!user || !user.fcmToken) {
            console.error(`User ${userId} not found or has no FCM token`);
            return null;
        }

        const message = {
            notification: { title, body },
            token: user.fcmToken,
            data: data || {}
        };

        try {
            const response = await firebaseAdmin.messaging().send(message);
            return response;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    },

    /**
     * Send a notification to all users with an FCM token
     */
    async sendToAll(title: string, body: string, data?: any) {
        const firebaseStatus = getFirebaseStatus();
        if (!firebaseStatus.initialized) {
            console.error('Cannot send notification: Firebase Admin SDK not initialized');
            throw new Error('Notification service is currently unavailable (Firebase not initialized)');
        }

        const users = await prisma.user.findMany({
            where: { fcmToken: { not: null } },
            select: { fcmToken: true }
        });

        const tokens = users.map(u => u.fcmToken as string);

        if (tokens.length === 0) {
            console.log('No users with FCM tokens found');
            return null;
        }

        const message = {
            notification: { title, body },
            tokens: tokens, // Note: For sendEachForMulticast, use tokens array
            data: data || {}
        };

        try {
            // Using sendEachForMulticast for multiple recipients
            const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
            return response;
        } catch (error) {
            console.error('Error sending multicast message:', error);
            throw error;
        }
    },

    /**
     * Update user's FCM token
     */
    async updateFcmToken(userId: string, token: string) {
        return prisma.user.update({
            where: { id: userId },
            data: { fcmToken: token }
        });
    }
};
