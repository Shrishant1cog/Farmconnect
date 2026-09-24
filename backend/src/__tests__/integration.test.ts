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
});