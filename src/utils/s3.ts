
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadError } from './errors';

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

/**
 * Uploads a file to S3.
 * @param file The file buffer or stream to upload.
 * @param key The key (filename) to use in S3.
 * @param mimetype The MIME type of the file.
 * @returns The URL of the uploaded file.
 */
export async function uploadFileToS3(
    file: Buffer,
    key: string,
    mimetype: string
): Promise<string> {
    const bucketName = process.env.AWS_BUCKET_NAME;

    if (!bucketName) {
        throw new Error('AWS_BUCKET_NAME is not defined in environment variables');
    }

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file,
        ContentType: mimetype,
    });

    try {
        await s3Client.send(command);
        // Return the S3 key — we'll generate pre-signed URLs when serving
        return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error: any) {
        console.error('Error uploading to S3:', error);
        throw new UploadError(`Failed to upload file to S3: ${error.message || error.Code || 'Unknown error'}`);
    }
}

/**
 * Generate a pre-signed URL for securely viewing an S3 object.
 * @param s3Key The S3 object key.
 * @param expiresIn Expiry in seconds (default: 1 hour).
 * @returns A temporary pre-signed URL.
 */
export async function getSignedUrl(
    s3Key: string,
    expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string> {
    const bucketName = process.env.AWS_BUCKET_NAME;

    if (!bucketName) {
        throw new Error('AWS_BUCKET_NAME is not defined in environment variables');
    }

    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
    });

    return awsGetSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate pre-signed URLs for multiple S3 keys in parallel.
 * @param s3Keys Array of S3 object keys.
 * @returns Array of pre-signed URLs (same order as input keys).
 */
export async function getSignedUrls(s3Keys: string[]): Promise<string[]> {
    return Promise.all(s3Keys.map((key) => getSignedUrl(key)));
}

