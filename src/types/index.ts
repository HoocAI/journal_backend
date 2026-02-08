// ============================================================================
// Shared Types and Interfaces for Wellness Backend
// ============================================================================

// ----------------------------------------------------------------------------
// Common Types
// ----------------------------------------------------------------------------

export type AdminRole = 'super_admin' | 'content_admin' | 'support_admin';
export type ConsentType = 'terms_of_service' | 'privacy_policy' | 'recording_consent';
export type Platform = 'fcm' | 'apns';
export type NotificationPriority = 'high' | 'normal';
export type MoodTrend = 'improving' | 'stable' | 'declining';
export type AnalyticsPeriod = 'weekly' | 'monthly';

// ----------------------------------------------------------------------------
// Pagination
// ----------------------------------------------------------------------------

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

// ----------------------------------------------------------------------------
// Authentication Types
// ----------------------------------------------------------------------------

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AdminCredentials {
    email: string;
    password: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user?: any; // Add user data to the response
}

export interface AdminTokenPair extends TokenPair {
    role: AdminRole;
    admin?: any;
}

export interface TokenPayload {
    userId: string;
    sessionId: string;
    isPremium: boolean;
    exp: number;
}

export interface AdminTokenPayload extends TokenPayload {
    role: AdminRole;
    permissions: string[];
}

// ----------------------------------------------------------------------------
// Consent Types
// ----------------------------------------------------------------------------

export interface ConsentRecord {
    consentType: ConsentType;
    version: string;
    isGranted: boolean;
}

export interface ConsentStatus {
    consents: Array<{
        consentType: ConsentType;
        version: string;
        isGranted: boolean;
        grantedAt: Date | null;
        withdrawnAt: Date | null;
    }>;
}

// ----------------------------------------------------------------------------
// Subscription & Trial Types
// ----------------------------------------------------------------------------

export interface TrialInfo {
    userId: string;
    trialStartDate: Date;
    trialEndDate: Date;
    remainingDays: number;
}

export interface PremiumStatus {
    isPremium: boolean;
    source: 'trial' | 'subscription' | 'none';
    expiresAt: Date | null;
}


// ----------------------------------------------------------------------------
// Journal Types
// ----------------------------------------------------------------------------

export interface CreateJournalEntry {
    content: string;
    entryDate?: Date;
}

export interface UpdateJournalEntry {
    content?: string;
}

export interface JournalEntry {
    id: string;
    userId: string;
    content: string;
    sanitizedContent: string;
    entryDate: Date;
    mediaIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface StreakInfo {
    currentStreak: number;
    longestStreak: number;
    lastEntryDate: Date | null;
}

export interface ChallengeProgress {
    challengeId: string;
    daysCompleted: number;
    totalDays: number;
    isCompleted: boolean;
    startDate: Date;
}

export interface MediaUpload {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
}

export interface MediaInfo {
    id: string;
    entryId: string;
    storageKey: string;
    contentType: string;
    fileSize: number;
    createdAt: Date;
}

// ----------------------------------------------------------------------------
// Mood Types
// ----------------------------------------------------------------------------

export interface CreateMoodEntry {
    moodValue: number;
    reason?: string;
    timezone: string;
}

export interface MoodEntry {
    id: string;
    userId: string;
    moodValue: number;
    reason: string | null;
    entryDate: Date;
    timezone: string;
    createdAt: Date;
}

export interface MoodAnalytics {
    period: AnalyticsPeriod;
    averageMood: number;
    moodDistribution: Record<number, number>;
    trend: MoodTrend;
    totalEntries: number;
}

export interface TriggerFlags {
    lowMoodAlert: boolean;
    consecutiveLowDays: number;
    lastEvaluated: Date;
}

// ----------------------------------------------------------------------------
// Question Types
// ----------------------------------------------------------------------------

export interface DailyQuestion {
    id: string;
    text: string;
    category: string;
    rotationIndex: number;
    isActive: boolean;
}

export interface CreateAnswer {
    questionId: string;
    answerText: string;
}

export interface QuestionAnswer {
    id: string;
    userId: string;
    questionId: string;
    answerText: string;
    answerDate: Date;
    createdAt: Date;
}

// ----------------------------------------------------------------------------
// Affirmation Types
// ----------------------------------------------------------------------------

export interface AffirmationMetadata {
    id: string;
    title: string;
    description: string;
    duration: number;
    category: string;
    tags: string[];
    audioKey: string;
    isPremium: boolean;
    isActive: boolean;
}

export interface AffirmationFilters {
    category?: string;
    tags?: string[];
    isPremium?: boolean;
}


// ----------------------------------------------------------------------------
// Notification Types
// ----------------------------------------------------------------------------

export interface DeviceRegistration {
    deviceId: string;
    token: string;
    platform: Platform;
    deviceInfo?: Record<string, string>;
}

export interface NotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    priority?: NotificationPriority;
}

export interface DeliveryResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface BroadcastResult {
    totalSent: number;
    successCount: number;
    failureCount: number;
    errors: Array<{ deviceId: string; error: string }>;
}

export interface UserSegment {
    isPremium?: boolean;
    hasConsent?: ConsentType[];
    registeredAfter?: Date;
    registeredBefore?: Date;
}

export interface ScheduledNotification {
    userId?: string;
    segment?: UserSegment;
    payload: NotificationPayload;
    scheduledFor: Date;
}

// ----------------------------------------------------------------------------
// Admin Types
// ----------------------------------------------------------------------------

export interface AdminContext {
    adminId: string;
    role: AdminRole;
    permissions: string[];
}

export interface CreateQuestion {
    text: string;
    category: string;
}

export interface UpdateQuestion {
    text?: string;
    category?: string;
}

export interface CreateAffirmation {
    title: string;
    description: string;
    duration: number;
    category: string;
    tags: string[];
    audioKey: string;
    isPremium: boolean;
}

export interface UpdateAffirmation {
    title?: string;
    description?: string;
    duration?: number;
    category?: string;
    tags?: string[];
    audioKey?: string;
    isPremium?: boolean;
}

export interface Challenge {
    id: string;
    name: string;
    description: string;
    durationDays: number;
    challengeType: string;
    isActive: boolean;
    createdAt: Date;
}

export interface CreateChallenge {
    name: string;
    description: string;
    durationDays: number;
    challengeType: string;
}

export interface UpdateChallenge {
    name?: string;
    description?: string;
    durationDays?: number;
    challengeType?: string;
}

export interface AuditEntry {
    id: string;
    adminId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    changes: Record<string, unknown>;
    timestamp: Date;
}

export interface AuditFilters {
    adminId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
}

// ----------------------------------------------------------------------------
// Event Types
// ----------------------------------------------------------------------------

export interface DomainEvent<T> {
    type: string;
    payload: T;
    timestamp: Date;
    correlationId: string;
}

export type MoodLoggedEvent = DomainEvent<{
    userId: string;
    moodValue: number;
    triggerFlags: TriggerFlags;
}>;

export type JournalCreatedEvent = DomainEvent<{
    userId: string;
    entryId: string;
    streakUpdated: boolean;
}>;

export type ChallengeCompletedEvent = DomainEvent<{
    userId: string;
    challengeId: string;
}>;
