import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, AuthError } from '../utils/errors';
import { prisma } from '../lib/prisma';

export function requireAdmin() {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw AuthError.tokenInvalid();
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user.userId },
                select: { role: true },
            });

            if (!user) {
                throw AuthError.tokenInvalid();
            }

            if (user.role !== 'ADMIN') {
                throw ForbiddenError.insufficientRole('ADMIN');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}
