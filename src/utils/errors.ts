/**
 * Custom error classes for the wellness backend
 * These errors map to specific HTTP status codes and error responses
 */

/**
 * Base application error class
 */
export abstract class AppError extends Error {
    abstract readonly statusCode: number;
    abstract readonly code: string;
    readonly details?: unknown;

    constructor(message: string, details?: unknown) {
        super(message);
        this.name = this.constructor.name;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON(): { error: { code: string; message: string; details?: unknown } } {
        return {
            error: {
                code: this.code,
                message: this.message,
                details: this.details,
            },
        };
    }
}

/**
 * Authentication error (401 Unauthorized)
 * Used when authentication fails or tokens are invalid/expired
 */
export class AuthError extends AppError {
    readonly statusCode = 401;
    readonly code: string;

    constructor(
        message: string = 'Authentication failed',
        code: string = 'AUTH_FAILED',
        details?: unknown
    ) {
        super(message, details);
        this.code = code;
    }

    static invalidCredentials(): AuthError {
        return new AuthError(
            'Invalid email or password',
            'AUTH_INVALID_CREDENTIALS'
        );
    }

    static tokenExpired(): AuthError {
        return new AuthError('Token has expired', 'AUTH_TOKEN_EXPIRED');
    }

    static tokenInvalid(): AuthError {
        return new AuthError(
            'Token is invalid or malformed',
            'AUTH_TOKEN_INVALID'
        );
    }

    static refreshTokenInvalid(): AuthError {
        return new AuthError(
            'Refresh token is invalid or revoked',
            'AUTH_REFRESH_TOKEN_INVALID'
        );
    }

    static sessionExpired(): AuthError {
        return new AuthError('Session has expired', 'AUTH_SESSION_EXPIRED');
    }
}

/**
 * Validation error (400 Bad Request)
 * Used when request data fails validation
 */
export class ValidationError extends AppError {
    readonly statusCode = 400;
    readonly code: string;

    constructor(
        message: string = 'Validation failed',
        code: string = 'VALIDATION_FAILED',
        details?: unknown
    ) {
        super(message, details);
        this.code = code;
    }

    static invalidInput(details: unknown): ValidationError {
        return new ValidationError(
            'Request validation failed',
            'VALIDATION_FAILED',
            details
        );
    }

    static contentTooLong(maxLength: number): ValidationError {
        return new ValidationError(
            `Content exceeds maximum length of ${String(maxLength)} characters`,
            'VALIDATION_CONTENT_TOO_LONG',
            { maxLength }
        );
    }

    static invalidMoodValue(): ValidationError {
        return new ValidationError(
            'Mood value must be between 1 and 5',
            'VALIDATION_INVALID_MOOD_VALUE',
            { validRange: { min: 1, max: 5 } }
        );
    }

    static invalidTimezone(timezone: string): ValidationError {
        return new ValidationError(
            `Invalid timezone: ${timezone}`,
            'VALIDATION_INVALID_TIMEZONE',
            { timezone }
        );
    }
}

/**
 * Conflict error (409 Conflict)
 * Used when an operation conflicts with existing data
 */
export class ConflictError extends AppError {
    readonly statusCode = 409;
    readonly code: string;

    constructor(
        message: string = 'Resource conflict',
        code: string = 'CONFLICT',
        details?: unknown
    ) {
        super(message, details);
        this.code = code;
    }

    static journalEntryExists(date: Date): ConflictError {
        return new ConflictError(
            'A journal entry already exists for this date',
            'JOURNAL_ENTRY_EXISTS',
            { date: date.toISOString() }
        );
    }

    static moodEntryExists(date: Date): ConflictError {
        return new ConflictError(
            'A mood entry already exists for this date',
            'MOOD_ENTRY_EXISTS',
            { date: date.toISOString() }
        );
    }

    static answerExists(date: Date): ConflictError {
        return new ConflictError(
            'An answer has already been submitted for today',
            'ANSWER_EXISTS',
            { date: date.toISOString() }
        );
    }
}

/**
 * Forbidden error (403 Forbidden)
 * Used when user lacks permission to access a resource
 */
export class ForbiddenError extends AppError {
    readonly statusCode = 403;
    readonly code: string;

    constructor(
        message: string = 'Access forbidden',
        code: string = 'FORBIDDEN',
        details?: unknown
    ) {
        super(message, details);
        this.code = code;
    }

    static insufficientRole(requiredRole: string): ForbiddenError {
        return new ForbiddenError(
            'Insufficient role permissions',
            'AUTHZ_INSUFFICIENT_ROLE',
            { requiredRole }
        );
    }

    static premiumRequired(): ForbiddenError {
        return new ForbiddenError(
            'This feature requires a premium subscription',
            'AUTHZ_PREMIUM_REQUIRED',
            { upgradeUrl: '/subscription/upgrade' }
        );
    }

    static consentRequired(consentTypes: string[]): ForbiddenError {
        return new ForbiddenError(
            'Required consent not provided',
            'AUTHZ_CONSENT_REQUIRED',
            { requiredConsents: consentTypes }
        );
    }

    static resourceForbidden(): ForbiddenError {
        return new ForbiddenError(
            'You do not have permission to access this resource',
            'AUTHZ_RESOURCE_FORBIDDEN'
        );
    }

    static cannotDisableAdmin(): ForbiddenError {
        return new ForbiddenError(
            'Cannot disable an admin user',
            'AUTHZ_CANNOT_DISABLE_ADMIN'
        );
    }

    static accountDisabled(): ForbiddenError {
        return new ForbiddenError(
            'Your account has been disabled',
            'AUTHZ_ACCOUNT_DISABLED'
        );
    }
}

/**
 * Not found error (404 Not Found)
 * Used when a requested resource does not exist
 */
export class NotFoundError extends AppError {
    readonly statusCode = 404;
    readonly code: string;

    constructor(
        message: string = 'Resource not found',
        code: string = 'NOT_FOUND',
        details?: unknown
    ) {
        super(message, details);
        this.code = code;
    }

    static resource(resourceType: string, resourceId: string): NotFoundError {
        return new NotFoundError(
            `${resourceType} not found`,
            'NOT_FOUND',
            { resourceType, resourceId }
        );
    }
}

/**
 * Rate limit error (429 Too Many Requests)
 * Used when rate limits or upload limits are exceeded
 */
export class RateLimitError extends AppError {
    readonly statusCode = 429;
    readonly code: string;

    constructor(
        message: string = 'Rate limit exceeded',
        code: string = 'RATE_LIMIT_EXCEEDED',
        details?: unknown
    ) {
        super(message, details);
        this.code = code;
    }

    static uploadLimitExceeded(limit: number, resetDate: Date): RateLimitError {
        return new RateLimitError(
            'Monthly upload limit exceeded',
            'UPLOAD_LIMIT_EXCEEDED',
            { limit, resetDate: resetDate.toISOString() }
        );
    }

    static tooManyRequests(retryAfter: number): RateLimitError {
        return new RateLimitError(
            'Too many requests, please try again later',
            'RATE_LIMIT_EXCEEDED',
            { retryAfterSeconds: retryAfter }
        );
    }
}

/**
 * Upload error (400 Bad Request)
 * Used when file uploads fail due to size limits, invalid types, or other issues
 */
export class UploadError extends AppError {
    readonly statusCode = 400;
    readonly code: string;

    constructor(
        message: string = 'Upload failed',
        code: string = 'UPLOAD_FAILED',
        details?: unknown
    ) {
        super(message, details);
        this.code = code;
    }

    static fileTooLarge(maxSize: number): UploadError {
        const maxSizeMB = maxSize / (1024 * 1024);
        return new UploadError(
            `File size exceeds limit of ${String(maxSizeMB)}MB`,
            'UPLOAD_FILE_TOO_LARGE',
            { maxSize, maxSizeMB }
        );
    }

    static invalidFileType(allowedTypes: string[]): UploadError {
        return new UploadError(
            `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
            'UPLOAD_INVALID_FILE_TYPE',
            { allowedTypes }
        );
    }

    static uploadFailed(reason: string): UploadError {
        return new UploadError(
            `File upload failed: ${reason}`,
            'UPLOAD_FAILED',
            { reason }
        );
    }
}
