// Tests for the storage service — the part that decides where an uploaded
// image really ends up and which URL is stored in the database.
//
// The important property is that the **object key** and the **public URL**
// describe the same path. When they differ, the upload succeeds but every
// link that is stored in a product row leads to a 404.

describe('storage service', () => {
  const loadService = (env: Record<string, string | undefined>) => {
    jest.resetModules();
    const previous: Record<string, string | undefined> = {};
    Object.keys(env).forEach((key) => {
      previous[key] = process.env[key];
      if (env[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = env[key];
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const service = require('../services/storage.service');

    return {
      service,
      restore: () => {
        Object.keys(env).forEach((key) => {
          if (previous[key] === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = previous[key];
          }
        });
      },
    };
  };

  afterEach(() => {
    jest.resetModules();
  });

  it('keeps the object key and the public URL on the same path', () => {
    const { service, restore } = loadService({
      STORAGE_PUBLIC_URL: 'https://cdn.farmconnect.example',
      STORAGE_BUCKET: 'farmconnect-images',
      STORAGE_ACCESS_KEY_ID: 'key',
      STORAGE_SECRET_ACCESS_KEY: 'secret',
    });

    try {
      const key = service.buildStorageKey('1700000000000-123.jpg');

      expect(key).toBe('uploads/1700000000000-123.jpg');
      expect(service.buildPublicUrl(key)).toBe(
        'https://cdn.farmconnect.example/uploads/1700000000000-123.jpg'
      );
    } finally {
      restore();
    }
  });

  it('produces the same path as the local disk provider, so existing rows keep working', () => {
    const { service, restore } = loadService({
      STORAGE_PUBLIC_URL: 'https://cdn.farmconnect.example/',
    });

    try {
      // The local provider serves `https://<api>/uploads/<file>`.
      const localUrl = `https://farmconnect-api-sn98.onrender.com/uploads/photo.jpg`;
      const key = service.buildStorageKey('photo.jpg');

      // The object store serves `https://<cdn>/uploads/<file>`.
      expect(service.buildPublicUrl(key)).toBe(
        localUrl.replace('https://farmconnect-api-sn98.onrender.com', 'https://cdn.farmconnect.example')
      );
    } finally {
      restore();
    }
  });

  it('refuses to invent a public URL when STORAGE_PUBLIC_URL is missing', () => {
    const { service, restore } = loadService({
      STORAGE_PUBLIC_URL: undefined,
    });

    try {
      expect(() => service.buildPublicUrl('uploads/photo.jpg')).toThrow(
        /STORAGE_PUBLIC_URL is not set/
      );
    } finally {
      restore();
    }
  });

  it('reads the provider from STORAGE_PROVIDER and understands r2 and spaces', () => {
    const cases: Array<[string, string]> = [
      ['s3', 's3'],
      ['r2', 's3'],
      ['spaces', 's3'],
      ['local', 'local'],
    ];

    cases.forEach(([requested, expected]) => {
      const { service, restore } = loadService({
        STORAGE_PROVIDER: requested,
        STORAGE_BUCKET: 'bucket',
        STORAGE_ACCESS_KEY_ID: 'key',
        STORAGE_SECRET_ACCESS_KEY: 'secret',
      });

      try {
        expect(service.resolveStorageProvider()).toBe(expected);
      } finally {
        restore();
      }
    });
  });

  it('falls back to the local provider when the object store is not configured', () => {
    const { service, restore } = loadService({
      STORAGE_PROVIDER: undefined,
      STORAGE_BUCKET: undefined,
      STORAGE_ACCESS_KEY_ID: undefined,
      STORAGE_SECRET_ACCESS_KEY: undefined,
    });

    try {
      expect(service.resolveStorageProvider()).toBe('local');
    } finally {
      restore();
    }
  });

  it('uses the object store as soon as the credentials are present', () => {
    const { service, restore } = loadService({
      STORAGE_PROVIDER: undefined,
      STORAGE_BUCKET: 'bucket',
      STORAGE_ACCESS_KEY_ID: 'key',
      STORAGE_SECRET_ACCESS_KEY: 'secret',
    });

    try {
      expect(service.resolveStorageProvider()).toBe('s3');
    } finally {
      restore();
    }
  });

  it('knows that an object store was asked for', () => {
    const cases: Array<[string, boolean]> = [
      ['s3', true],
      ['r2', true],
      ['spaces', true],
      ['R2', true],
      ['local', false],
      ['', false],
    ];

    cases.forEach(([requested, expected]) => {
      const { service, restore } = loadService({ STORAGE_PROVIDER: requested });

      try {
        expect(service.isObjectStoreRequested()).toBe(expected);
      } finally {
        restore();
      }
    });
  });

  it('refuses to store an image on the local disk when R2 was requested but is not configured', async () => {
    const { service, restore } = loadService({
      STORAGE_PROVIDER: 'r2',
      STORAGE_BUCKET: 'farmconnect-images',
      STORAGE_ACCESS_KEY_ID: undefined,
      STORAGE_SECRET_ACCESS_KEY: undefined,
      STORAGE_PUBLIC_URL: 'https://pub-example.r2.dev',
    });

    try {
      const file = {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('not really an image'),
        size: 19,
      };

      // The image must NOT be written to the ephemeral disk.
      await expect(service.storeImage(file, 'https://api.example.com')).rejects.toThrow(
        /STORAGE_ACCESS_KEY_ID/
      );
      await expect(service.storeImage(file, 'https://api.example.com')).rejects.toThrow(
        /was NOT written to the local disk/
      );
    } finally {
      restore();
    }
  });

  it('refuses to store an image when the public URL of the bucket is unknown', async () => {
    const { service, restore } = loadService({
      STORAGE_PROVIDER: 's3',
      STORAGE_BUCKET: 'farmconnect-images',
      STORAGE_ACCESS_KEY_ID: 'key',
      STORAGE_SECRET_ACCESS_KEY: 'secret',
      STORAGE_PUBLIC_URL: undefined,
    });

    try {
      const file = {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('not really an image'),
        size: 19,
      };

      await expect(service.storeImage(file, 'https://api.example.com')).rejects.toThrow(
        /STORAGE_PUBLIC_URL is not set/
      );
    } finally {
      restore();
    }
  });
});
