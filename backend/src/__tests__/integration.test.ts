// Load `backend/.env` so the integration suite can run against the local
// PostgreSQL instance exactly like the Prisma CLI does.
import 'dotenv/config';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '../app';

const prisma = new PrismaClient();
const agent = request(app);

describe('FarmConnect Core Functional & Integration Suite', () => {
  let farmerToken: string;
  let consumerToken: string;
  let farmerUserId: string;
  let consumerUserId: string;
  let farmerProfileId: string;
  let testCategoryId: string;
  let createdProductId: string;
  let secondProductId: string;
  let thirdProductId: string;
  let testOrderId: string;
  let testEnquiryId: string;

  beforeAll(async () => {
    // 1. Ensure test categories exist
    const category = await prisma.category.upsert({
      where: { slug: 'vegetables' },
      update: {},
      create: {
        name: 'Vegetables',
        slug: 'vegetables',
        description: 'Fresh farm vegetables directly from growers',
      },
    });
    testCategoryId = category.id;

    // 2. Ensure test farmer exists with verified credentials
    const passwordHash = await bcrypt.hash('Password@123', 10);
    const farmerUser = await prisma.user.upsert({
      where: { email: 'ramesh.mandya@farmconnect.org' },
      update: { passwordHash, isActive: true },
      create: {
        email: 'ramesh.mandya@farmconnect.org',
        passwordHash,
        name: 'Ramesh Gowda',
        phone: '+919448123456',
        role: 'FARMER',
        isActive: true,
      },
    });
    farmerUserId = farmerUser.id;

    const farmerProfile = await prisma.farmerProfile.upsert({
      where: { userId: farmerUser.id },
      update: { isVerified: true },
      create: {
        userId: farmerUser.id,
        farmName: 'Ramesh Organic Fields',
        district: 'Mandya',
        state: 'Karnataka',
        latitude: 12.5218,
        longitude: 76.8951,
        isVerified: true,
      },
    });
    farmerProfileId = farmerProfile.id;

    // 3. Ensure test consumer exists
    const consumerUser = await prisma.user.upsert({
      where: { email: 'priya.bengaluru@gmail.com' },
      update: { passwordHash, isActive: true },
      create: {
        email: 'priya.bengaluru@gmail.com',
        passwordHash,
        name: 'Priya Narayanan',
        phone: '+919900456789',
        role: 'CONSUMER',
        isActive: true,
      },
    });
    consumerUserId = consumerUser.id;

    await prisma.consumerProfile.upsert({
      where: { userId: consumerUser.id },
      update: {},
      create: {
        userId: consumerUser.id,
        district: 'Bengaluru Urban',
        deliveryAddress: '100 Feet Road, Indiranagar, Bengaluru',
        latitude: 12.9716,
        longitude: 77.5946,
      },
    });

    // 4. Authenticate Farmer & Consumer
    const farmerRes = await agent
      .post('/api/auth/login')
      .send({ email: 'ramesh.mandya@farmconnect.org', password: 'Password@123' });
    
    expect(farmerRes.status).toBe(200);
    expect(farmerRes.body.success).toBe(true);
    farmerToken = farmerRes.body.data.token;

    const consumerRes = await agent
      .post('/api/auth/login')
      .send({ email: 'priya.bengaluru@gmail.com', password: 'Password@123' });
    
    expect(consumerRes.status).toBe(200);
    expect(consumerRes.body.success).toBe(true);
    consumerToken = consumerRes.body.data.token;
  });

  afterAll(async () => {
    // Teardown: Clean up in reverse relation dependency order
    if (testOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } }).catch(() => {});
      await prisma.order.deleteMany({ where: { id: testOrderId } }).catch(() => {});
    }
    if (testEnquiryId) {
      await prisma.message.deleteMany({ where: { enquiryId: testEnquiryId } }).catch(() => {});
      await prisma.enquiry.deleteMany({ where: { id: testEnquiryId } }).catch(() => {});
    }
    if (createdProductId) {
      await prisma.priceHistory.deleteMany({ where: { productId: createdProductId } }).catch(() => {});
      await prisma.product.deleteMany({ where: { id: createdProductId } }).catch(() => {});
    }
    for (const productId of [secondProductId, thirdProductId]) {
      if (!productId) continue;
      await prisma.priceHistory.deleteMany({ where: { productId } }).catch(() => {});
      await prisma.product.deleteMany({ where: { id: productId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // ==========================================================================
  // 1. PRODUCT LISTING & PRICE AUDITING
  // ==========================================================================

  it('FARMER: creates a new harvest listing with explicit unit and price', async () => {
    const res = await agent
      .post('/api/products')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Fresh Organic Carrots',
        description: 'Crisp, sweet winter carrots directly harvested from Mandya soil.',
        categoryId: testCategoryId,
        farmerPrice: 35.0,
        priceUnit: 'PER_KG',
        quantityAvailable: 150.0,
        quantityUnit: 'KG',
        isOrganic: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Fresh Organic Carrots');
    expect(Number(res.body.data.farmerPrice)).toBe(35.0);
    createdProductId = res.body.data.id;
  });

  it('FARMER: updates price and triggers historical audit trail record', async () => {
    const res = await agent
      .patch(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        farmerPrice: 32.0,
        quantityAvailable: 120.0,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.farmerPrice)).toBe(32.0);

    // Verify audit entry in database
    const history = await prisma.priceHistory.findFirst({
      where: { productId: createdProductId },
      orderBy: { changedAt: 'desc' },
    });
    expect(history).not.toBeNull();
    expect(Number(history!.oldPrice)).toBe(35.0);
    expect(Number(history!.newPrice)).toBe(32.0);
  });

  it('CONSUMER: searches catalog and receives explicit "Farmer Listed Price" notice', async () => {
    const res = await agent.get('/api/products?search=Carrots');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const carrot = res.body.data.find((p: any) => p.id === createdProductId);
    expect(carrot).toBeDefined();
    expect(carrot.farmerPriceNotice).toBe('Farmer Listed Price');
  });

  // ==========================================================================
  // 2. SECURITY & AUTHORIZATION GUARDS
  // ==========================================================================

  it('SECURITY: denies unauthenticated product modification (401)', async () => {
    const res = await agent
      .patch(`/api/products/${createdProductId}`)
      .send({ farmerPrice: 10.0 });
    expect(res.status).toBe(401);
  });

  it('SECURITY: denies unauthorized consumer attempting to modify farmer harvest (403)', async () => {
    const res = await agent
      .patch(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({ farmerPrice: 10.0 });
    expect(res.status).toBe(403);
  });

  // ==========================================================================
  // 3. WHATSAPP NEGOTIATION THREADS
  // ==========================================================================

  it('NEGOTIATION: consumer initiates price inquiry and farmer responds', async () => {
    // 1. Consumer initiates inquiry
    const inqRes = await agent
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({
        productId: createdProductId,
        subject: 'Wholesale Purchase Negotiation',
        message: 'Namaskara, can you deliver 100kg to Indiranagar at ₹30/kg?',
      });

    expect(inqRes.status).toBe(201);
    expect(inqRes.body.success).toBe(true);
    testEnquiryId = inqRes.body.data.id;

    // 2. Farmer replies to inquiry
    const replyRes = await agent
      .post(`/api/enquiries/${testEnquiryId}/messages`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        content: 'Agreed. Please place the order through the portal and I will pack it today.',
      });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.success).toBe(true);
    expect(replyRes.body.data.content).toContain('Agreed');
  });

  // ==========================================================================
  // 4. WHOLESALE ORDER & 4-STAGE LOGISTICS TRACKING
  // ==========================================================================

  it('ORDER LIFECYCLE: executes checkout, packing, dispatch, and delivery confirmation', async () => {
    // Step 1: Consumer Places Order
    const orderRes = await agent
      .post('/api/orders')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({
        farmerId: farmerProfileId,
        items: [{ productId: createdProductId, quantity: 100, unitPrice: 32.0 }],
        deliveryAddress: '100 Feet Road, Indiranagar, Bengaluru, Karnataka',
        transportCost: 150.0,
        containerCost: 45.0,
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.success).toBe(true);
    expect(orderRes.body.data.status).toBe('PENDING');
    testOrderId = orderRes.body.data.id;

    // Step 2: Farmer Marks Produce Packed (CONFIRMED)
    const packRes = await agent
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ status: 'CONFIRMED' });

    expect(packRes.status).toBe(200);
    expect(packRes.body.data.status).toBe('CONFIRMED');

    // Step 3: Farmer Dispatches Produce with Logistics (DISPATCHED)
    const dispatchRes = await agent
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ status: 'DISPATCHED' });

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.data.status).toBe('DISPATCHED');

    // Step 4: Consumer Confirms Delivery Receipt (DELIVERED)
    const confirmRes = await agent
      .patch(`/api/orders/${testOrderId}/received`)
      .set('Authorization', `Bearer ${consumerToken}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('DELIVERED');
  });

  // ==========================================================================
  // 6. MULTILINGUAL ACCOUNT PREFERENCE (Feature A)
  // ==========================================================================

  it('LANGUAGE: the account preference is stored and returned to both clients', async () => {
    const updateRes = await agent
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ preferredLanguage: 'kn' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.preferredLanguage).toBe('kn');

    // The profile endpoint returns the same value (the website reads it here).
    const profileRes = await agent
      .get('/api/users/me')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.preferredLanguage).toBe('kn');

    // The database really holds the value.
    const stored = await prisma.user.findUnique({
      where: { id: farmerUserId },
      select: { preferredLanguage: true },
    });
    expect(stored?.preferredLanguage).toBe('kn');

    // Switch back to English so the suite leaves the account unchanged.
    const resetRes = await agent
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ preferredLanguage: 'en' });
    expect(resetRes.body.data.preferredLanguage).toBe('en');
  });

  it('LANGUAGE: an unsupported language code is rejected', async () => {
    const res = await agent
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ preferredLanguage: 'ta' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('LANGUAGE: a regional language code is normalised to the supported code', async () => {
    // `kn-IN` / `hi_IN` are what an Android device reports, so the account
    // has to store the canonical code instead of rejecting the request.
    const regional = await agent
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ preferredLanguage: 'kn-IN' });

    expect(regional.status).toBe(200);
    expect(regional.body.data.preferredLanguage).toBe('kn');

    const stored = await prisma.user.findUnique({
      where: { id: farmerUserId },
      select: { preferredLanguage: true },
    });
    expect(stored?.preferredLanguage).toBe('kn');

    const unsupported = await agent
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ preferredLanguage: 'de-DE' });
    expect(unsupported.status).toBeGreaterThanOrEqual(400);

    await agent
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ preferredLanguage: 'en' });
  });

  it('LANGUAGE: the language preference is included in the login response', async () => {
    await agent
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ preferredLanguage: 'hi' });

    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: 'ramesh.mandya@farmconnect.org', password: 'Password@123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.preferredLanguage).toBe('hi');
    // The value is also exposed at the top level of `data` so a client can
    // read it without walking into the nested user object.
    expect(loginRes.body.data.preferredLanguage).toBe('hi');

    await agent
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ preferredLanguage: 'en' });
  });

  // ==========================================================================
  // 7. INDEPENDENT CROP LISTINGS (Feature B)
  // ==========================================================================

  it('CATALOGUE: the shared crop catalogue and categories are available', async () => {
    const categoriesRes = await agent.get('/api/catalog/categories');
    expect(categoriesRes.status).toBe(200);
    expect(Array.isArray(categoriesRes.body.data)).toBe(true);
    expect(categoriesRes.body.data.length).toBeGreaterThan(0);
    expect(categoriesRes.body.data[0]).toHaveProperty('slug');

    const cropsRes = await agent.get('/api/catalog/crops?search=Tomato');
    expect(cropsRes.status).toBe(200);
    expect(cropsRes.body.data.length).toBeGreaterThan(0);
    expect(cropsRes.body.data.some((c: any) => c.name === 'Tomato')).toBe(true);

    // The catalogue is searchable in Kannada and Hindi too.
    const kannadaRes = await agent.get('/api/catalog/crops?search=ಟೊಮೇಟೊ');
    expect(kannadaRes.body.data.some((c: any) => c.name === 'Tomato')).toBe(true);

    const hindiRes = await agent.get('/api/catalog/crops?search=टमाटर');
    expect(hindiRes.body.data.some((c: any) => c.name === 'Tomato')).toBe(true);
  });

  it('FARMER: publishes two independent crop lots for the same farmer', async () => {
    const tomatoRes = await agent
      .post('/api/products')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Integration Tomato Lot',
        description: 'First independent crop lot.',
        categoryId: testCategoryId,
        cropName: 'Tomato',
        variety: 'Hybrid',
        farmerPrice: 22.5,
        quantityAvailable: 180,
        quantityUnit: 'KG',
        priceUnit: 'PER_KG',
        isOrganic: false,
      });

    expect(tomatoRes.status).toBe(201);
    expect(tomatoRes.body.data.cropName).toBe('Tomato');
    expect(tomatoRes.body.data.variety).toBe('Hybrid');
    secondProductId = tomatoRes.body.data.id;

    const ragiRes = await agent
      .post('/api/products')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Integration Ragi Lot',
        description: 'Second independent crop lot.',
        categoryId: testCategoryId,
        cropName: 'Ragi',
        variety: 'Local',
        farmerPrice: 48.0,
        quantityAvailable: 90,
        quantityUnit: 'KG',
        priceUnit: 'PER_KG',
        isOrganic: false,
      });

    expect(ragiRes.status).toBe(201);
    expect(ragiRes.body.data.cropName).toBe('Ragi');
    expect(ragiRes.body.data.variety).toBe('Local');
    thirdProductId = ragiRes.body.data.id;

    expect(secondProductId).not.toBe(thirdProductId);
  });

  it('FARMER: editing one crop lot never overwrites the other', async () => {
    const updateRes = await agent
      .patch(`/api/products/${secondProductId}`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ farmerPrice: 27.5, quantityAvailable: 150, isAvailable: false });

    expect(updateRes.status).toBe(200);
    expect(Number(updateRes.body.data.farmerPrice)).toBe(27.5);
    expect(Number(updateRes.body.data.quantityAvailable)).toBe(150);
    expect(updateRes.body.data.isAvailable).toBe(false);

    const untouched = await prisma.product.findUnique({ where: { id: thirdProductId } });
    expect(Number(untouched!.farmerPrice)).toBe(48.0);
    expect(Number(untouched!.quantityAvailable)).toBe(90);
    expect(untouched!.isAvailable).toBe(true);
    expect(untouched!.cropName).toBe('Ragi');
  });

  it('CONSUMER: filters the shared catalogue by crop type', async () => {
    // The public catalogue only lists available lots, and the previous test
    // deliberately took the tomato lot off the market to prove that an edit
    // never touches the second lot. It is put back on the market here so the
    // crop filter can be exercised on both lots.
    const reactivate = await agent
      .patch(`/api/products/${secondProductId}`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ isAvailable: true });
    expect(reactivate.status).toBe(200);

    const tomatoRes = await agent.get('/api/products?crop=Tomato');
    expect(tomatoRes.status).toBe(200);
    const tomatoIds = tomatoRes.body.data.map((p: any) => p.id);
    expect(tomatoIds).toContain(secondProductId);
    expect(tomatoIds).not.toContain(thirdProductId);

    const ragiRes = await agent.get('/api/products?crop=Ragi');
    const ragiIds = ragiRes.body.data.map((p: any) => p.id);
    expect(ragiIds).toContain(thirdProductId);
    expect(ragiIds).not.toContain(secondProductId);

    // A sold-out lot must not appear in the public catalogue any more.
    const soldOut = await agent
      .patch(`/api/products/${secondProductId}`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ isAvailable: false });
    expect(soldOut.status).toBe(200);

    const afterSoldOut = await agent.get('/api/products?crop=Tomato');
    const afterSoldOutIds = afterSoldOut.body.data.map((p: any) => p.id);
    expect(afterSoldOutIds).not.toContain(secondProductId);
    expect(afterSoldOutIds).not.toContain(thirdProductId);
  });

  it('FARMER: the inventory lists every crop lot separately', async () => {
    const res = await agent
      .get('/api/products/my-products')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    const mine = res.body.data.filter(
      (p: any) => p.id === secondProductId || p.id === thirdProductId
    );
    expect(mine.length).toBe(2);

    const tomato = mine.find((p: any) => p.id === secondProductId);
    const ragi = mine.find((p: any) => p.id === thirdProductId);
    expect(tomato.cropName).toBe('Tomato');
    expect(ragi.cropName).toBe('Ragi');
    expect(Number(tomato.farmerPrice)).not.toBe(Number(ragi.farmerPrice));
  });
});