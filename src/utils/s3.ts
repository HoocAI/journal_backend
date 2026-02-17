
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { UploadError } from './errors';

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

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
    }); // Removed ACL: 'public-read' as it's often blocked primarily. Assuming bucket policy handles access or using signed URLs (but returning direct URL for now as per plan).

    try {
        await s3Client.send(command);
        // Construct the URL. This assumes public access or a CloudFront distribution.
        // For standard S3 public access:
        return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new UploadError('Failed to upload file to S3');
    }
}
