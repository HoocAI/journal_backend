import multer, { StorageEngine, FileFilterCallback } from 'multer';
import { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadConfig {
    destination: string;
    maxFileSize: number;
    allowedMimeTypes: string[];
}

export const ALLOWED_IMAGE_TYPES: string[] = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
];

export const ALLOWED_AUDIO_TYPES: string[] = [
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/ogg',
    'audio/x-m4a',
];

export function generateFilename(
    userId: string | undefined,
    originalFilename: string
): string {
    const userPrefix = userId ?? 'unknown';
    const timestamp = Date.now();
    const extension = path.extname(originalFilename);
    return `${userPrefix}-${timestamp}${extension}`;
}

function createFileFilter(allowedMimeTypes: string[]) {
    return (
        _req: Request,
        file: Express.Multer.File,
        callback: FileFilterCallback
    ): void => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    };
}

export function createUploadConfig(config: Omit<UploadConfig, 'destination'>): multer.Multer {
    const { maxFileSize, allowedMimeTypes } = config;

    const storage: StorageEngine = multer.memoryStorage();

    return multer({
        storage,
        limits: {
            fileSize: maxFileSize,
        },
        fileFilter: createFileFilter(allowedMimeTypes),
    });
}

// Pre-configured upload handlers
export const journalPhotoUpload = createUploadConfig({
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ALLOWED_IMAGE_TYPES,
});

export const journalAudioUpload = createUploadConfig({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ALLOWED_AUDIO_TYPES,
});

export const adminAudioUpload = createUploadConfig({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ALLOWED_AUDIO_TYPES,
});


// multer middleware for journal entries that accepts both photo and audio uploads.

export function createJournalUpload(): ReturnType<typeof multer> {
    const storage: StorageEngine = multer.memoryStorage();

    const fileFilter = (
        _req: Request,
        file: Express.Multer.File,
        callback: FileFilterCallback
    ): void => {
        if (file.fieldname === 'photo' && ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            callback(null, true);
        } else if (file.fieldname === 'audio' && ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    };

    return multer({
        storage,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB (max of photo 5MB and audio 10MB)
        },
        fileFilter,
    });
}

/** Pre-configured journal upload middleware for use with multer.fields() */
export const journalUpload = createJournalUpload();