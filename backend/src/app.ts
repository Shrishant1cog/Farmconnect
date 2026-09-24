import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

import { db } from './config/db';
import { env } from './config/env';
import { initSocket } from './socket';
import * as rateLimiterModule from './middleware/rateLimiter';
import * as errorMiddlewareModule from './middleware/error.middleware';
import * as authMiddlewareModule from './middleware/auth.middleware';
import { calculateDistanceKm } from './utils/geo';
import { computeLogisticsAndProfit } from './services/logisticsService';

// Modular Domain Routers
import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/products.routes';
import orderRoutes from './modules/orders/orders.routes';
import enquiryRoutes from './modules/enquiries/enquiries.routes';
import adminRoutes from './modules/admin/admin.routes';
import userRoutes from './modules/users/users.routes';

dotenv.config();

const rawEnv = process.env as Record<string, string | undefined>;

// ---------------------------------------------------------------------------
// 1. RESOLVE MIDDLEWARES DEFENSIVELY
// ---------------------------------------------------------------------------
export interface AuthenticatedRequest extends Request {
  user?: any;
  userId?: string;
}

const authenticate =
  (authMiddlewareModule as any).authenticate ||
  (authMiddlewareModule as any).authenticateToken ||
  (authMiddlewareModule as any).authMiddleware ||
  (authMiddlewareModule as any).verifyToken ||
  (authMiddlewareModule as any).default ||
  ((_req: Request, _res: Response, next: NextFunction) => next());

const requireRole = (...allowedRoles: (string | string[])[]) => {
  const flattened = allowedRoles.flat().map((r) => String(r).toUpperCase());

  if (typeof (authMiddlewareModule as any).requireRole === 'function') {
    return (authMiddlewareModule as any).requireRole(flattened);
  }
  if (typeof (authMiddlewareModule as any).authorize === 'function') {
    return (authMiddlewareModule as any).authorize(flattened);
  }

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = (req.user?.role || '').toUpperCase();
    if (req.user && !flattened.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${flattened.join(', ')}] role(s).`,
      });
    }
    next();
  };
};

const globalLimiter =
  (rateLimiterModule as any).globalLimiter ||
  (rateLimiterModule as any).limiter ||
  (rateLimiterModule as any).default?.globalLimiter ||
  ((_req: Request, _res: Response, next: NextFunction) => next());

// ---------------------------------------------------------------------------
// 2. INITIALIZE EXPRESS & HTTP SERVER
// ---------------------------------------------------------------------------
const app = express();
const server = http.createServer(app);
const PORT = Number(rawEnv.PORT) || Number(env?.PORT) || 5000;

const ALLOWED_ORIGINS: string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  ...(Array.isArray(env?.CLIENT_URL) ? env.CLIENT_URL : []),
  ...(rawEnv.CLIENT_URL ? rawEnv.CLIENT_URL.split(',').map((s: string): string => s.trim()) : []),
];

// Initialize WebSockets
if (typeof initSocket === 'function') {
  try {
    initSocket(server, ALLOWED_ORIGINS);
  } catch (socketErr) {
    console.warn('[Socket.IO Initialization Warning]:', socketErr);
  }
}

// ---------------------------------------------------------------------------
// 3. SECURITY, PARSING & RATE-LIMITING MIDDLEWARES
// ---------------------------------------------------------------------------
app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

if (typeof globalLimiter === 'function') {
  app.use('/api', globalLimiter);
}

// ---------------------------------------------------------------------------
// 4. FILE UPLOADS SETUP
// ---------------------------------------------------------------------------
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

app.use('/uploads', express.static(uploadDir));

app.post('/api/upload', authenticate, upload.single('image'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return res.json({ success: true, imageUrl });
});

// ---------------------------------------------------------------------------
// 5. DEFENSIVE ROUTER MOUNTING
// ---------------------------------------------------------------------------
const mountRouter = (basePath: string, routerModule: any, moduleName: string) => {
  const router = routerModule?.default || routerModule;
  if (typeof router === 'function') {
    app.use(basePath, router);
  } else {
    console.warn(`[Route Notice] Module '${moduleName}' for '${basePath}' is not a function. Skipping.`);
  }
};

mountRouter('/api/auth', authRoutes, 'authRoutes');
mountRouter('/api/products', productRoutes, 'productRoutes');
mountRouter('/api/orders', orderRoutes, 'orderRoutes');
mountRouter('/api/enquiries', enquiryRoutes, 'enquiryRoutes');
mountRouter('/api/admin', adminRoutes, 'adminRoutes');
mountRouter('/api/users', userRoutes, 'userRoutes');

// Root Health & Probe Endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'UP',
    service: 'FarmConnect Engine',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'UP',
    message: 'FarmConnect API Server Online',
  });
});

// Backward-compatible Route Aliases
app.use('/api/farmer/verify-aadhaar', (req: Request, res: Response, next: NextFunction) => {
  req.url = '/verify-aadhaar';
  const authRouter = (authRoutes as any)?.default || authRoutes;
  if (typeof authRouter === 'function') {
    return authRouter(req, res, next);
  }
  next();
});

app.get('/api/consumer/enquiries', authenticate, requireRole(['CONSUMER', 'FARMER']), (req: Request, res: Response, next: NextFunction) => {
  req.url = '/my';
  const enquiryRouter = (enquiryRoutes as any)?.default || enquiryRoutes;
  if (typeof enquiryRouter === 'function') {
    return enquiryRouter(req, res, next);
  }
  next();
});

app.get('/api/farmer/enquiries', authenticate, requireRole(['FARMER']), (req: Request, res: Response, next: NextFunction) => {
  req.url = '/farmer';
  const enquiryRouter = (enquiryRoutes as any)?.default || enquiryRoutes;
  if (typeof enquiryRouter === 'function') {
    return enquiryRouter(req, res, next);
  }
  next();
});

app.get('/api/farmer/orders', authenticate, requireRole(['FARMER']), (req: Request, res: Response, next: NextFunction) => {
  req.url = '/farmer';
  const orderRouter = (orderRoutes as any)?.default || orderRoutes;
  if (typeof orderRouter === 'function') {
    return orderRouter(req, res, next);
  }
  next();
});

// ---------------------------------------------------------------------------
// 6. REGIONAL AGRI-EXCHANGE & LOGISTICS ENDPOINTS
// ---------------------------------------------------------------------------
app.get('/api/farmers/map', async (req: Request, res: Response) => {
  try {
    const { lat, lon, maxDistanceKm } = req.query;

    const farmers = await db.farmerProfile.findMany({
      where: { isVerified: true },
      include: {
        user: { select: { name: true, phone: true } },
        products: {
          where: { isAvailable: true },
          select: { id: true, title: true, farmerPrice: true, priceUnit: true, isOrganic: true },
        },
      },
    });

    let results = farmers.map((f: any) => {
      let distanceKm: number | null = null;
      if (lat && lon) {
        distanceKm = calculateDistanceKm(
          parseFloat(String(lat)),
          parseFloat(String(lon)),
          f.latitude,
          f.longitude
        );
      }
      return {
        id: f.id,
        farmName: f.farmName,
        farmerName: f.user?.name,
        district: f.district,
        address: f.addressLine,
        latitude: f.latitude,
        longitude: f.longitude,
        distanceKm,
        isVerified: f.isVerified,
        availableProducts: f.products,
      };
    });

    if (lat && lon && maxDistanceKm) {
      const maxD = parseFloat(String(maxDistanceKm));
      results = results.filter((f: any) => f.distanceKm !== null && f.distanceKm <= maxD);
      results.sort((a: any, b: any) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    return res.json({ success: true, data: results });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/farmers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const farmer = await db.farmerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        products: {
          where: { isAvailable: true },
        },
      },
    });

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    }

    await db.farmerProfile.update({
      where: { id },
      data: { profileViews: { increment: 1 } },
    });

    return res.json({ success: true, data: farmer });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/logistics/quote', (req: Request, res: Response) => {
  const {
    cropQuantityKg,
    farmerPricePerKg,
    originLat,
    originLon,
    destLat,
    destLon,
    containerType,
    apmcModalPricePerQuintal,
  } = req.body;

  const quote = computeLogisticsAndProfit({
    cropQuantityKg: parseFloat(cropQuantityKg) || 100,
    farmerPricePerKg: parseFloat(farmerPricePerKg) || 20,
    originLat: parseFloat(originLat) || 12.5218,
    originLon: parseFloat(originLon) || 76.8951,
    destLat: parseFloat(destLat) || 12.9716,
    destLon: parseFloat(destLon) || 77.5946,
    containerType: containerType || 'STANDARD_CRATE',
    apmcModalPricePerQuintal: parseFloat(apmcModalPricePerQuintal) || 3200,
  });

  return res.json({ success: true, data: quote });
});

app.get('/api/apmc/rates', async (_req: Request, res: Response) => {
  try {
    if (!(db as any).apmcMarketRate) {
      return res.json({ success: true, data: [] });
    }
    const rates = await (db as any).apmcMarketRate.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return res.json({ success: true, data: rates });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/dashboard/farmer', authenticate, requireRole(['FARMER']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const farmer = await db.farmerProfile.findFirst({
      where: { OR: [{ userId }, { id: userId }] },
      include: { products: { orderBy: { createdAt: 'desc' } } },
    });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer record not found' });
    }

    const [totalEnquiries, totalFavorites, recentEnquiries] = await Promise.all([
      db.enquiry.count({ where: { farmerId: farmer.id } }).catch(() => 0),
      (db as any).favouriteFarmer
        ? (db as any).favouriteFarmer.count({ where: { farmerId: farmer.id } }).catch(() => 0)
        : 0,
      db.enquiry
        .findMany({
          where: { farmerId: farmer.id },
          take: 5,
          orderBy: { updatedAt: 'desc' },
          include: {
            consumer: { select: { name: true, phone: true, email: true } },
            product: { select: { title: true } },
          },
        })
        .catch(() => []),
    ]);

    return res.json({
      success: true,
      data: {
        farmerName: farmer.farmName,
        stats: {
          totalProducts: farmer.products.length,
          availableProducts: farmer.products.filter((p: any) => p.isAvailable).length,
          totalEnquiries,
          profileViews: farmer.profileViews,
          totalFavorites,
        },
        recentEnquiries,
        products: farmer.products,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 7. BULLETPROOF CENTRALIZED ERROR HANDLER
// ---------------------------------------------------------------------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const handler =
    (errorMiddlewareModule as any).errorMiddleware ||
    (errorMiddlewareModule as any).errorHandler ||
    (errorMiddlewareModule as any).default;

  if (typeof handler === 'function') {
    return handler(err, req, res, next);
  }

  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ---------------------------------------------------------------------------
// 8. SERVER START
// ---------------------------------------------------------------------------
if (rawEnv.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`FARMCONNECT Engine live on http://localhost:${PORT} with WebSocket active.`);
  });
}

export default app;
export { app, server };