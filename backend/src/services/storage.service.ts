import fs from 'fs';
import path from 'path';

const env = process.env as Record<string, string | undefined>;

export type StorageProvider = 'local' | 's3';

export interface StoredFile {
  url: string;
  key: string;
  provider: StorageProvider;
}

/**
 * Pluggable image storage.
 *
 * - `local` (default): files are written to `UPLOAD_DIR` and served by the API from `/uploads`.
 *   This is convenient for local development.
 * - `s3`: files are pushed to any S3-compatible object store (AWS S3, Cloudflare R2,
 *   DigitalOcean Spaces, MinIO...). Required variables:
 *      STORAGE_PROVIDER=s3
 *      STORAGE_BUCKET=<bucket>
 *      STORAGE_REGION=<region>
 *      STORAGE_ACCESS_KEY_ID=<key>
 *      STORAGE_SECRET_ACCESS_KEY=<secret>
 *      STORAGE_ENDPOINT=<optional custom endpoint>
 *      STORAGE_PUBLIC_URL=<optional public base url, e.g. https://cdn.example.com>
 *
 * Production deployments on Render MUST use the `s3` provider because the local
 * filesystem of a Render web service is ephemeral.
 */

export const resolveStorageProvider = (): StorageProvider => {
  const requested = (env.STORAGE_PROVIDER || '').toLowerCase();
  if (requested === 's3' || requested === 'r2' || requested === 'spaces') {
    return 's3';
  }
  if (requested === 'local' || requested === 'disk') {
    return 'local';
  }
  return env.STORAGE_BUCKET && env.STORAGE_ACCESS_KEY_ID && env.STORAGE_SECRET_ACCESS_KEY
    ? 's3'
    : 'local';
};

export const uploadDirectory = path.resolve(
  process.cwd(),
  env.UPLOAD_DIR || path.join(__dirname, '../../uploads')
);

export const ensureUploadDirectory = (): string => {
  if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
  }
  return uploadDirectory;
};

export const buildFileName = (originalName: string): string => {
  const extension = path.extname(originalName || '').toLowerCase() || '.jpg';
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${uniqueSuffix}${extension}`;
};

const isS3Configured = (): boolean => {
  return Boolean(env.STORAGE_BUCKET && env.STORAGE_ACCESS_KEY_ID && env.STORAGE_SECRET_ACCESS_KEY);
};

/**
 * Persist an uploaded image and return its publicly reachable URL.
 * `publicBaseUrl` is the externally visible origin of this API (e.g. https://api.farmconnect.app).
 */
export const storeImage = async (
  file: Express.Multer.File,
  publicBaseUrl: string
): Promise<StoredFile> => {
  const provider = resolveStorageProvider();
  const fileName = buildFileName(file.originalname);

  if (provider === 's3' && isS3Configured()) {
    // Loaded lazily so local development does not need the AWS SDK loaded.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

    const bucket = env.STORAGE_BUCKET as string;
    const key = `uploads/${fileName}`;

    const client = new S3Client({
      region: env.STORAGE_REGION || 'auto',
      endpoint: env.STORAGE_ENDPOINT || undefined,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY_ID as string,
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY as string,
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'image/jpeg',
      })
    );

    const publicBase = (env.STORAGE_PUBLIC_URL || `${publicBaseUrl}/uploads`).replace(/\/+$/, '');
    return { url: `${publicBase}/${fileName}`, key, provider: 's3' };
  }

  // Local disk fallback
  ensureUploadDirectory();
  const targetPath = path.join(uploadDirectory, fileName);
  await fs.promises.writeFile(targetPath, file.buffer);
  return { url: `${publicBaseUrl.replace(/\/+$/, '')}/uploads/${fileName}`, key: fileName, provider: 'local' };
};
