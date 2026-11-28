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
 *      STORAGE_PUBLIC_URL=<public base url of the bucket, e.g. https://cdn.example.com>
 *      STORAGE_ENDPOINT=<optional custom endpoint>
 *      STORAGE_FORCE_PATH_STYLE=<optional "true" for MinIO-like providers>
 *
 * Production deployments on Render MUST use the `s3` provider because the local
 * filesystem of a Render web service is ephemeral.
 *
 * The object key and the public URL deliberately use the **same** layout —
 * `uploads/<file name>` — so that a file stored on the local disk at
 * `https://api.example.com/uploads/photo.jpg` can be moved to the bucket and
 * served at `https://cdn.example.com/uploads/photo.jpg` without changing
 * anything else in the row that holds the URL.
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
 * The object-store providers this service understands.
 *
 * `r2` is Cloudflare R2, `spaces` is DigitalOcean Spaces — both are
 * S3-compatible and therefore use the same code path.
 */
const OBJECT_STORE_PROVIDERS = ['s3', 'r2', 'spaces'];

/**
 * Was an object store **asked for**?
 *
 * This matters on a hosted deployment: when the owner writes
 * `STORAGE_PROVIDER=r2` but one of the credentials is missing, silently
 * falling back to the local disk would put the image on an **ephemeral**
 * filesystem, where it is deleted at the next deploy. The upload would
 * answer "success" and the link would break later.
 *
 * So an explicitly requested object store that is not fully configured is
 * an **error**, never a silent fallback.
 */
export const isObjectStoreRequested = (): boolean =>
  OBJECT_STORE_PROVIDERS.includes((env.STORAGE_PROVIDER || '').toLowerCase());

/** The folder every uploaded image lives in — on the disk and in the bucket. */
export const UPLOAD_KEY_PREFIX = 'uploads';

/**
 * The key of an object inside the bucket.
 *
 * It is `uploads/<file name>`, exactly the path the file has on the local
 * disk (`/uploads/<file name>`). Keeping both the same is what allows an
 * existing row to keep working after the move to an object store.
 */
export const buildStorageKey = (fileName: string): string =>
  `${UPLOAD_KEY_PREFIX}/${fileName}`;

/**
 * The public URL of a stored object.
 *
 * `STORAGE_PUBLIC_URL` is the **root** of the public bucket, so the result
 * is `<root>/uploads/<file name>`. The root has to be given: without it the
 * API cannot know where the file can be reached, and returning a URL that
 * leads nowhere would store a broken link in the database.
 */
export const buildPublicUrl = (key: string): string => {
  const root = (env.STORAGE_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (!root) {
    throw new Error(
      'STORAGE_PUBLIC_URL is not set. The public base URL of the bucket is ' +
        'required for the s3 storage provider, because the API cannot know ' +
        'where an uploaded file can be reached without it.'
    );
  }
  return `${root}/${key.replace(/^\/+/, '')}`;
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

  if (provider === 's3') {
    // An explicitly requested object store that is not fully configured
    // must **fail loudly**. Falling back to the local disk on a hosted
    // deployment would store the image on an ephemeral filesystem, where it
    // disappears at the next deploy — with a "success" answer in between.
    if (!isS3Configured()) {
      const missing = [
        !env.STORAGE_BUCKET && 'STORAGE_BUCKET',
        !env.STORAGE_ACCESS_KEY_ID && 'STORAGE_ACCESS_KEY_ID',
        !env.STORAGE_SECRET_ACCESS_KEY && 'STORAGE_SECRET_ACCESS_KEY',
      ].filter(Boolean);

      throw new Error(
        `The storage provider "${env.STORAGE_PROVIDER}" was requested, but it is not ` +
          `configured. Missing: ${missing.join(', ')}. The upload was NOT written ` +
          `to the local disk, because that disk is ephemeral on a hosted service.`
      );
    }

    // Loaded lazily so local development does not need the AWS SDK loaded.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

    const bucket = env.STORAGE_BUCKET as string;
    const key = buildStorageKey(fileName);

    // The public URL is validated **before** the object is written. If it
    // were checked afterwards, a missing STORAGE_PUBLIC_URL would leave an
    // orphan object in the bucket that no row can ever point at.
    const publicUrl = buildPublicUrl(key);

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

    // The URL is built from the **key**, so the link that is stored in the
    // database always points at the object that was really written.
    return { url: publicUrl, key, provider: 's3' };
  }

  // Local disk fallback
  ensureUploadDirectory();
  const targetPath = path.join(uploadDirectory, fileName);
  await fs.promises.writeFile(targetPath, file.buffer);
  return { url: `${publicBaseUrl.replace(/\/+$/, '')}/uploads/${fileName}`, key: fileName, provider: 'local' };
};
