import express, { Request, Response } from 'express';
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
import { globalLimiter } from './middleware/rateLimiter';
import { errorMiddleware } from './middleware/error.middleware';
import { authenticateToken, requireRole, AuthenticatedRequest } from './middleware/auth.middleware';
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

// 1. Initialize Express App & HTTP Server FIRST
const app = express();
const server = http.createServer(app);
const PORT = env.PORT || 5000;

// CORS configuration supporting multi-origin development
const CLIENT_URLS = Array.isArray(env.CLIENT_URL)
  ? env.CLIENT_URL
  : (process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:3001')
      .split(',')
      .map((url) => url.trim());

// 2. Initialize Real-Time WebSockets
initSocket(server, CLIENT_URLS);

// 3. Security, Parsing & Rate-Limiting Middleware
app.use(helmet());
app.use(cors({ origin: CLIENT_URLS, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use('/api', globalLimiter);

// ---------------------------------------------------------------------------
// FILE UPLOADS SETUP
// ---------------------------------------------------------------------------
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

app.use('/uploads', express.static(uploadDir));

app.post('/api/upload', authenticateToken, upload.single('image'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return res.json({ success: true, imageUrl });
});

// ---------------------------------------------------------------------------
// 4. MOUNT DOMAIN ROUTERS
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

// Legacy route aliases for backward compatibility with frontend pages
app.use('/api/farmer/verify-aadhaar', (req, res, next) => {
  req.url = '/verify-aadhaar';
  return authRoutes(req, res, next);
});

app.get('/api/consumer/enquiries', authenticateToken, requireRole(['CONSUMER']), (req, res, next) => {
  req.url = '/my';
  return enquiryRoutes(req, res, next);
});

app.get('/api/farmer/enquiries', authenticateToken, requireRole(['FARMER']), (req, res, next) => {
  req.url = '/farmer';
  return enquiryRoutes(req, res, next);
});

app.get('/api/farmer/orders', authenticateToken, requireRole(['FARMER']), (req, res, next) => {
  req.url = '/farmer';
  return orderRoutes(req, res, next);
});

// ---------------------------------------------------------------------------
// 5. REGIONAL AGRI-EXCHANGE & LOGISTICS ENDPOINTS
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

    let results = farmers.map((f) => {
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
        farmerName: f.user.name,
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
      results = results.filter((f) => f.distanceKm !== null && f.distanceKm <= maxD);
      results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
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
          include: { category: true },
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
  const { cropQuantityKg, farmerPricePerKg, originLat, originLon, destLat, destLon, containerType, apmcModalPricePerQuintal } = req.body;

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
    const rates = await db.apmcMarketRate.findMany({ orderBy: { updatedAt: 'desc' }, take: 50 });
    return res.json({ success: true, data: rates });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/dashboard/farmer', authenticateToken, requireRole(['FARMER']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const farmer = await db.farmerProfile.findUnique({
      where: { userId: req.user!.id },
      include: { products: { orderBy: { createdAt: 'desc' } } },
    });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer record not found' });

    const [categories, totalEnquiries, totalFavorites, recentEnquiries] = await Promise.all([
      db.category.findMany({ orderBy: { name: 'asc' } }),
      db.enquiry.count({ where: { farmerId: farmer.id } }),
      db.favouriteFarmer.count({ where: { farmerId: farmer.id } }),
      db.enquiry.findMany({
        where: { farmerId: farmer.id },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          consumer: { select: { name: true, phone: true, email: true } },
          product: { select: { title: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        farmerName: farmer.farmName,
        stats: {
          totalProducts: farmer.products.length,
          availableProducts: farmer.products.filter((p) => p.isAvailable).length,
          totalEnquiries,
          profileViews: farmer.profileViews,
          totalFavorites,
        },
        recentEnquiries,
        products: farmer.products,
        categories,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. CENTRALIZED ERROR HANDLER
// ---------------------------------------------------------------------------
app.use(errorMiddleware);

// ---------------------------------------------------------------------------
// 7. CONDITIONAL SERVER START (PREVENTS EADDRINUSE DURING TESTS)
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`FARMCONNECT Engine live on http://localhost:${PORT} with WebSocket active.`);
  });
}

export default app;
export { app, server };