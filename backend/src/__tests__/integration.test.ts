// Load `backend/.env` so the integration suite can run against the local
// PostgreSQL instance exactly like the Prisma CLI does.
import 'dotenv/config';
import request from 'supertest';
import jwt from 'jsonwebtoken';
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
  let adminUserId: string;
  let adminToken: string;
  /** The hash of the test password — shared by every test account. */
  let passwordHash: string;

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
    passwordHash = await bcrypt.hash('Password@123', 10);
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
    if (adminUserId) {
      await prisma.user.deleteMany({ where: { id: adminUserId } }).catch(() => {});
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

    // Step 2: Farmer Confirms the Lot (CONFIRMED)
    const confirmRes = await agent
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ status: 'CONFIRMED' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('CONFIRMED');

    // Step 3: Farmer Packs the Harvest (PACKED)
    //
    // The backend used to rewrite `PACKED` into `CONFIRMED`, so the
    // dispatch dashboard of the cultivator showed "packed in crates"
    // while the shared database still said "confirmed" — and the step
    // "harvest packed" of the timeline of the buyer could never be
    // reached. The state that is asked for is the state that is stored.
    const packRes = await agent
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ status: 'PACKED' });

    expect(packRes.status).toBe(200);
    expect(packRes.body.data.status).toBe('PACKED');

    // The row of the shared database really carries the new state.
    const storedOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(storedOrder?.status).toBe('PACKED');

    // A state that does not exist is refused — it is not silently stored
    // as something else.
    const unknownStatusRes = await agent
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ status: 'TELEPORTED' });

    expect(unknownStatusRes.status).toBe(400);
    expect(unknownStatusRes.body.success).toBe(false);

    // Step 4: Farmer Dispatches Produce with Logistics (DISPATCHED)
    const dispatchRes = await agent
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ status: 'DISPATCHED' });

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.data.status).toBe('DISPATCHED');

    // Step 5: Consumer Confirms Delivery Receipt (DELIVERED)
    const deliveryRes = await agent
      .patch(`/api/orders/${testOrderId}/received`)
      .set('Authorization', `Bearer ${consumerToken}`);

    expect(deliveryRes.status).toBe(200);
    expect(deliveryRes.body.data.status).toBe('DELIVERED');
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

  it('AUTHORISATION: a listing can only be changed by the cultivator who published it', async () => {
    // The consumer account must not be able to edit the farmer's listing.
    const foreignUpdate = await agent
      .patch(`/api/products/${thirdProductId}`)
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({ farmerPrice: 999 });

    expect(foreignUpdate.status).toBe(403);

    // ... and the price in the database is untouched.
    const untouched = await prisma.product.findUnique({ where: { id: thirdProductId } });
    expect(Number(untouched!.farmerPrice)).toBe(48.0);

    // The consumer must not be able to delete it either.
    const foreignDelete = await agent
      .delete(`/api/products/${thirdProductId}`)
      .set('Authorization', `Bearer ${consumerToken}`);

    expect(foreignDelete.status).toBe(403);
    const stillThere = await prisma.product.findUnique({ where: { id: thirdProductId } });
    expect(stillThere).not.toBeNull();
  });

  it('DELETE: a listing with orders is not deleted and the failure is reported', async () => {
    // `createdProductId` already carries an order (see the order lifecycle
    // test), so the delete has to refuse and say why. It must never answer
    // with a success that did not happen.
    const res = await agent
      .delete(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    const stillThere = await prisma.product.findUnique({ where: { id: createdProductId } });
    expect(stillThere).not.toBeNull();
  });

  it('DELETE: a listing without orders is removed by its owner', async () => {
    const createRes = await agent
      .post('/api/products')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        title: 'Integration Disposable Lot',
        description: 'A lot that may be deleted.',
        categoryId: testCategoryId,
        cropName: 'Tomato',
        farmerPrice: 10,
        quantityAvailable: 10,
        quantityUnit: 'KG',
        priceUnit: 'PER_KG',
        isOrganic: false,
      });

    expect(createRes.status).toBe(201);
    const disposableId = createRes.body.data.id;

    const deleteRes = await agent
      .delete(`/api/products/${disposableId}`)
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    const gone = await prisma.product.findUnique({ where: { id: disposableId } });
    expect(gone).toBeNull();
  });

  it('NOTIFICATIONS: order and enquiry events reach the shared inbox', async () => {
    // The farmer received the order above, so the inbox must contain a
    // `NEW_ORDER` entry that both clients list.
    const farmerInbox = await agent
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(farmerInbox.status).toBe(200);
    const farmerNotifications = farmerInbox.body.data || [];
    expect(
      farmerNotifications.some((n: any) => n.type === 'NEW_ORDER'),
    ).toBe(true);

    // The consumer saw the order status change, so their inbox has the
    // matching `ORDER_STATUS` entry.
    const consumerInbox = await agent
      .get('/api/notifications')
      .set('Authorization', `Bearer ${consumerToken}`);

    expect(consumerInbox.status).toBe(200);
    const consumerNotifications = consumerInbox.body.data || [];
    expect(
      consumerNotifications.some((n: any) => n.type === 'ORDER_STATUS'),
    ).toBe(true);

    // One notification can be marked as read, and then all of them.
    const notificationId = farmerNotifications[0].id;
    const markRead = await agent
      .patch(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(markRead.status).toBe(200);
    expect(markRead.body.data.isRead).toBe(true);

    const markAllRead = await agent
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(markAllRead.status).toBe(200);
  });

  // ==========================================================================
  // 8. THE AUTHENTICATION JOURNEY
  // ==========================================================================

  it('AUTH: a wrong password is refused', async () => {
    const res = await agent
      .post('/api/auth/login')
      .send({ email: 'ramesh.mandya@farmconnect.org', password: 'not-the-password' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.token).toBeUndefined();
  });

  it('AUTH: an unknown account is refused', async () => {
    const res = await agent
      .post('/api/auth/login')
      .send({ email: 'nobody.at.all@farmconnect.test', password: 'Password@123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('AUTH: the hard-coded demo credential does not open a session', async () => {
    // The login screen used to offer a quick sign-in. That shortcut issued a
    // JWT for an account id (`usr_farmer_demo`) that never existed in the
    // shared database — a fabricated session that still passed the role
    // guards. There is no shortcut any more: a session is only issued for an
    // account that really exists and whose password really matches.
    const res = await agent
      .post('/api/auth/login')
      .send({ identifier: 'farmer@farmconnect.com', password: 'password123' });

    // Either the account does not exist at all, or it exists and the real
    // password check applies. What must never happen is a session for an
    // account that is not in the database.
    if (res.status === 200) {
      expect(res.body.data.user.id).not.toBe('usr_farmer_demo');

      const account = await prisma.user.findUnique({
        where: { id: res.body.data.user.id },
      });
      expect(account).not.toBeNull();

      const me = await agent
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${res.body.data.token}`);
      expect(me.status).toBe(200);
      expect(me.body.data.user.id).toBe(res.body.data.user.id);
      // The profile comes from the database, not from the decoded token.
      expect(me.body.data.user.iat).toBeUndefined();
    } else {
      expect(res.status).toBe(401);
    }
  });

  it('AUTH: an e-mail address that contains digits is not matched as a phone number', async () => {
    // The identifier was reduced to its digits, so
    // `someone.9448123456@example.com` opened the account whose phone number
    // ends in those digits. An identifier is only a phone number when it
    // really is one.
    const res = await agent
      .post('/api/auth/login')
      .send({ identifier: 'someone.9448123456@example.com', password: 'Password@123' });

    expect(res.status).toBe(401);
  });

  it('AUTH: the session keeps working after the sign-in', async () => {
    const me = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(farmerUserId);
    expect(me.body.data.user.role).toBe('FARMER');

    // A second request with the same token still works — the session is
    // persistent, not one-shot.
    const again = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(again.status).toBe(200);
  });

  it('AUTH: a forged token is refused', async () => {
    const res = await agent
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });

  // ==========================================================================
  // 9. THE ADMINISTRATOR WORKFLOWS
  //
  // The deployed database has no administrator account, so these routes are
  // exercised here against a real PostgreSQL with a real administrator that
  // the suite creates for itself.
  // ==========================================================================

  it('ADMIN: an administrator account can sign in and sees the platform metrics', async () => {
    const adminUser = await prisma.user.upsert({
      where: { email: 'audit.admin@farmconnect.test' },
      update: { passwordHash, isActive: true, role: 'ADMIN' },
      create: {
        email: 'audit.admin@farmconnect.test',
        passwordHash,
        name: 'Integration Administrator',
        phone: '+919000000001',
        role: 'ADMIN',
        isActive: true,
      },
    });
    adminUserId = adminUser.id;

    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: 'audit.admin@farmconnect.test', password: 'Password@123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('ADMIN');
    adminToken = loginRes.body.data.token;

    const metrics = await agent
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(metrics.status).toBe(200);
    expect(metrics.body.success).toBe(true);
    expect(typeof metrics.body.data.totalUsers).toBe('number');
    expect(typeof metrics.body.data.activeProducts).toBe('number');
    expect(metrics.body.data.totalUsers).toBeGreaterThan(0);
  });

  it('ADMIN: every figure of the command center is really counted', async () => {
    // The command center shows a "Total Enquiries" figure. The backend
    // never sent that field, so the card showed a permanent zero — a
    // number that was never measured. Every figure must now be the real
    // count of the shared database.
    const metrics = await agent
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(metrics.status).toBe(200);

    const data = metrics.body.data;

    for (const field of [
      'totalUsers',
      'totalFarmers',
      'totalConsumers',
      'activeProducts',
      'activeOrders',
      'pendingComplaints',
      'totalEnquiries',
    ]) {
      expect(typeof data[field]).toBe('number');
      expect(Number.isFinite(data[field])).toBe(true);
      expect(data[field]).toBeGreaterThanOrEqual(0);
    }

    // The figures must agree with the database itself.
    const users = await prisma.user.count();
    const farmers = await prisma.user.count({ where: { role: 'FARMER' as any } });
    const consumers = await prisma.user.count({ where: { role: 'CONSUMER' as any } });
    const products = await prisma.product.count({ where: { isAvailable: true } });
    const enquiries = await prisma.enquiry.count();

    expect(data.totalUsers).toBe(users);
    expect(data.totalFarmers).toBe(farmers);
    expect(data.totalConsumers).toBe(consumers);
    expect(data.activeProducts).toBe(products);
    expect(data.totalEnquiries).toBe(enquiries);
  });

  it('ADMIN: the administrator sees the user list and can filter it', async () => {
    const res = await agent
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const farmers = await agent
      .get('/api/admin/users?role=FARMER')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(farmers.status).toBe(200);
    expect(farmers.body.data.every((u: any) => u.role === 'FARMER')).toBe(true);

    const searched = await agent
      .get('/api/admin/users?search=Integration')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(searched.status).toBe(200);
    expect(searched.body.data.length).toBeGreaterThan(0);
  });

  it('ADMIN: the administrator can suspend and reactivate an account', async () => {
    const suspend = await agent
      .patch(`/api/admin/users/${consumerUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.isActive).toBe(false);

    const stored = await prisma.user.findUnique({
      where: { id: consumerUserId },
      select: { isActive: true },
    });
    expect(stored?.isActive).toBe(false);

    const reactivate = await agent
      .patch(`/api/admin/users/${consumerUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.data.isActive).toBe(true);
  });

  it('ADMIN: an administrator cannot suspend its own account', async () => {
    const res = await agent
      .patch(`/api/admin/users/${adminUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('ADMIN: the administrator sees the complaint queue and can resolve a complaint', async () => {
    const complaintRes = await agent
      .post('/api/complaints')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({
        entityType: 'PRODUCT',
        entityId: thirdProductId,
        reason: 'Integration complaint',
        details: 'A complaint that the administrator resolves.',
      });
    expect(complaintRes.status).toBe(201);
    const complaintId = complaintRes.body.data.id;

    const queue = await agent
      .get('/api/admin/complaints')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(queue.status).toBe(200);
    expect(queue.body.data.some((c: any) => c.id === complaintId)).toBe(true);

    const resolved = await agent
      .patch(`/api/admin/complaints/${complaintId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminNotes: 'Reviewed by the administrator.', status: 'RESOLVED' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe('RESOLVED');

    const stored = await prisma.complaint.findUnique({ where: { id: complaintId } });
    expect(stored?.status).toBe('RESOLVED');

    await prisma.complaint.deleteMany({ where: { id: complaintId } });
  });

  it('ADMIN: a farmer and a consumer are both refused by every admin route', async () => {
    for (const token of [farmerToken, consumerToken]) {
      const metrics = await agent
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${token}`);
      expect(metrics.status).toBe(403);

      const users = await agent
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);
      expect(users.status).toBe(403);

      const complaints = await agent
        .get('/api/admin/complaints')
        .set('Authorization', `Bearer ${token}`);
      expect(complaints.status).toBe(403);
    }

    const guest = await agent.get('/api/admin/metrics');
    expect(guest.status).toBe(401);
  });

  // ==========================================================================
  // 10. THE POSITION OF A FARM THAT DID NOT SHARE ONE
  // ==========================================================================

  it('POSITION: a farm without a shared position carries no distance', async () => {
    // The farmer profile of the suite farmer is cleared, so the map must
    // report `null` for its distance — never the distance to the point
    // 0 / 0, which would be a fabricated number.
    await prisma.farmerProfile.update({
      where: { id: farmerProfileId },
      data: { latitude: null, longitude: null },
    });

    const res = await agent.get('/api/farmers/map?lat=12.9716&lon=77.5946');
    expect(res.status).toBe(200);

    const farm = res.body.data.find((f: any) => f.id === farmerProfileId);
    expect(farm).toBeDefined();
    expect(farm.latitude).toBeNull();
    expect(farm.distanceKm).toBeNull();
  });

  it('POSITION: a farm that shares a position carries its real distance', async () => {
    await prisma.farmerProfile.update({
      where: { id: farmerProfileId },
      data: { latitude: 12.5218, longitude: 76.8951 },
    });

    const res = await agent.get('/api/farmers/map?lat=12.9716&lon=77.5946');
    expect(res.status).toBe(200);

    const farm = res.body.data.find((f: any) => f.id === farmerProfileId);
    expect(farm).toBeDefined();
    expect(typeof farm.distanceKm).toBe('number');
    expect(farm.distanceKm).toBeGreaterThan(50);
    expect(farm.distanceKm).toBeLessThan(150);

    // The suite leaves the account without a position again.
    await prisma.farmerProfile.update({
      where: { id: farmerProfileId },
      data: { latitude: null, longitude: null },
    });
  });

  it('POSITION: a listing that creates the missing farm profile stores no point 0 / 0', async () => {
    // `Number(null)` is 0. A profile that is created without a position must
    // not end up on the point 0 / 0 in the Gulf of Guinea.
    const throwaway = await prisma.user.create({
      data: {
        email: `audit.noprofile.${Date.now()}@farmconnect.test`,
        phone: `7${String(Date.now()).slice(-9)}`,
        name: 'Audit Account Without A Farm Profile',
        passwordHash,
        // The account is a farmer **from the start**: the role is written
        // into the token when the session is issued, so promoting it later
        // would not change what the role guard sees.
        role: 'FARMER',
      },
    });

    const tokenRes = await agent
      .post('/api/auth/login')
      .send({ email: throwaway.email, password: 'Password@123' });
    const throwawayToken = tokenRes.body.data.token;
    expect(tokenRes.body.data.user.role).toBe('FARMER');

    // The account has no farm profile at all, so the listing has to create
    // the profile itself.
    await prisma.farmerProfile.deleteMany({ where: { userId: throwaway.id } });
    await prisma.consumerProfile.deleteMany({ where: { userId: throwaway.id } });

    const createRes = await agent
      .post('/api/products')
      .set('Authorization', `Bearer ${throwawayToken}`)
      .send({
        title: 'Audit Lot Without A Position',
        description: 'A lot that creates the farm profile.',
        categoryId: testCategoryId,
        cropName: 'Tomato',
        farmerPrice: 15,
        quantityAvailable: 40,
        quantityUnit: 'KG',
        priceUnit: 'PER_KG',
        isOrganic: false,
        latitude: null,
        longitude: null,
      });

    expect(createRes.status).toBe(201);

    const profile = await prisma.farmerProfile.findUnique({
      where: { userId: throwaway.id },
    });
    expect(profile).not.toBeNull();
    expect(profile!.latitude).toBeNull();
    expect(profile!.longitude).toBeNull();

    await prisma.priceHistory.deleteMany({ where: { productId: createRes.body.data.id } });
    await prisma.product.deleteMany({ where: { id: createRes.body.data.id } });
    await prisma.farmerProfile.deleteMany({ where: { userId: throwaway.id } });
    await prisma.user.deleteMany({ where: { id: throwaway.id } });
  });

  // ==========================================================================
  // 11. THE SESSION MUST RESOLVE TO A REAL, ACTIVE ACCOUNT
  // ==========================================================================

  it('SESSION: a token of an account that does not exist is refused', async () => {
    // The token is signed with the **real** secret, so only the database
    // can tell that the account is gone. The session must not be accepted.
    const orphanToken = jwt.sign(
      { id: '00000000-0000-0000-0000-000000000000', role: 'FARMER' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    const me = await agent
      .get('/api/users/me')
      .set('Authorization', `Bearer ${orphanToken}`);
    expect(me.status).toBe(401);

    const authMe = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${orphanToken}`);
    expect(authMe.status).toBe(401);
    // The endpoint must never answer with the decoded token payload.
    expect(authMe.body?.data?.user?.iat).toBeUndefined();

    const mine = await agent
      .get('/api/products/my-products')
      .set('Authorization', `Bearer ${orphanToken}`);
    expect(mine.status).toBe(401);

    const orders = await agent
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${orphanToken}`);
    expect(orders.status).toBe(401);
  });

  it('SESSION: a token of a suspended account is refused', async () => {
    // The administrator's "suspend account" action has to **end** the
    // session of that account. Before the fix the token stayed valid for
    // its whole lifetime, so the action was ineffective.
    const suspended = await prisma.user.create({
      data: {
        email: `audit.suspended.${Date.now()}@farmconnect.test`,
        phone: `6${String(Date.now()).slice(-9)}`,
        name: 'Audit Suspended Account',
        passwordHash,
        role: 'CONSUMER',
        isActive: true,
      },
    });

    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: suspended.email, password: 'Password@123' });
    expect(loginRes.status).toBe(200);
    const suspendedToken = loginRes.body.data.token;

    // While the account is active, the session works.
    const active = await agent
      .get('/api/users/me')
      .set('Authorization', `Bearer ${suspendedToken}`);
    expect(active.status).toBe(200);
    expect(active.body.data.id).toBe(suspended.id);

    // The administrator suspends the account.
    await prisma.user.update({ where: { id: suspended.id }, data: { isActive: false } });

    const refused = await agent
      .get('/api/users/me')
      .set('Authorization', `Bearer ${suspendedToken}`);
    expect(refused.status).toBe(401);

    const refusedOrders = await agent
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${suspendedToken}`);
    expect(refusedOrders.status).toBe(401);

    // A suspended account cannot sign in again either.
    const secondLogin = await agent
      .post('/api/auth/login')
      .send({ email: suspended.email, password: 'Password@123' });
    expect(secondLogin.status).toBe(401);

    await prisma.user.deleteMany({ where: { id: suspended.id } });
  });

  it('SESSION: a token signed with a published secret is refused', async () => {
    // The two hard-coded secrets are part of the public repository. A token
    // signed with them must never open a session — not even with the role
    // of an administrator.
    for (const publishedSecret of [
      'farmconnect-secret-key',
      'farmconnect-secret-key-development',
    ]) {
      const forged = jwt.sign(
        { id: farmerUserId, role: 'ADMIN', email: 'ramesh.mandya@farmconnect.org' },
        publishedSecret,
        { expiresIn: '1h' }
      );

      const me = await agent
        .get('/api/users/me')
        .set('Authorization', `Bearer ${forged}`);
      expect(me.status).toBe(401);

      const admin = await agent
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${forged}`);
      expect(admin.status).toBe(401);

      const adminUsers = await agent
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${forged}`);
      expect(adminUsers.status).toBe(401);
    }
  });

  it('SESSION: the role of the live account decides, not the role of the token', async () => {
    // A token that claims the role `ADMIN` for an ordinary farmer must not
    // open the administrator endpoints. The role is read from the database.
    const escalated = jwt.sign(
      { id: farmerUserId, role: 'ADMIN' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    const metrics = await agent
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${escalated}`);
    expect(metrics.status).toBe(403);

    // The very same account still works with its real role.
    const mine = await agent
      .get('/api/products/my-products')
      .set('Authorization', `Bearer ${escalated}`);
    expect(mine.status).toBe(200);
  });

  // ==========================================================================
  // 12. THE PHONE NUMBER IS AN IDENTIFIER, NEVER A PROOF
  // ==========================================================================

  it('PHONE: a sign-in without the password is refused', async () => {
    // The endpoint used to answer a session for **any** phone number. The
    // phone numbers of the cultivators are published by the public
    // directory, so knowing a number was enough to take the account over.
    const res = await agent
      .post('/api/auth/login-phone')
      .send({ phone: '9448123456', role: 'FARMER' });

    expect(res.status).toBe(400);
    expect(res.body?.data?.token).toBeUndefined();
    expect(res.body?.token).toBeUndefined();
  });

  it('PHONE: a sign-in with a wrong password is refused', async () => {
    const res = await agent
      .post('/api/auth/login-phone')
      .send({ phone: '9448123456', password: 'not-the-password', role: 'FARMER' });

    expect(res.status).toBe(401);
    expect(res.body?.data?.token).toBeUndefined();
    expect(res.body?.token).toBeUndefined();
  });

  it('PHONE: a sign-in never creates an account', async () => {
    // A sign-in cannot bring an account into existence. Before the fix the
    // endpoint created the account and signed it in — the account then had
    // the guessable password `otp_auth_<phone>`.
    const phone = `5${String(Date.now()).slice(-9)}`;

    const res = await agent
      .post('/api/auth/login-phone')
      .send({ phone, password: 'AnyPassword@123', role: 'CONSUMER' });

    expect(res.status).toBe(401);

    const created = await prisma.user.count({ where: { phone } });
    expect(created).toBe(0);

    const withPrefix = await prisma.user.count({ where: { phone: `+91${phone}` } });
    expect(withPrefix).toBe(0);
  });

  it('PHONE: the correct password opens the account of that number', async () => {
    // The happy path still works — the phone number identifies the
    // account, the password proves it.
    const res = await agent
      .post('/api/auth/login-phone')
      .send({ phone: '9448123456', password: 'Password@123', role: 'CONSUMER' });

    expect(res.status).toBe(200);
    expect(res.body?.data?.token).toBeTruthy();
    // The role of the **account** wins — the requested role is only a hint.
    expect(res.body?.data?.user?.role).toBe('FARMER');
    expect(res.body?.data?.user?.id).toBe(farmerUserId);
  });

  it('PHONE: the derived password of a phone account does not open it', async () => {
    // Accounts that were created by the old phone flow carried the password
    // `otp_auth_<phone>` — derived from the phone number, which is public.
    // A new account no longer has such a password.
    const phone = `6${String(Date.now()).slice(-9)}`;
    const email = `${phone}@phone.farmconnect.test`;

    await prisma.user.create({
      data: {
        phone,
        email,
        name: 'Audit Phone Account',
        passwordHash: await bcrypt.hash('ARealRandomPassword@2026', 10),
        role: 'CONSUMER',
        isActive: true,
      },
    });

    const derived = await agent
      .post('/api/auth/login')
      .send({ identifier: phone, password: `otp_auth_${phone}` });
    expect(derived.status).toBe(401);

    const real = await agent
      .post('/api/auth/login')
      .send({ identifier: phone, password: 'ARealRandomPassword@2026' });
    expect(real.status).toBe(200);

    await prisma.user.deleteMany({ where: { email } });
  });

  it('PHONE: a suspended account is refused on every sign-in path', async () => {
    const phone = `7${String(Date.now()).slice(-9)}`;
    const email = `${phone}@phone.farmconnect.test`;

    const suspended = await prisma.user.create({
      data: {
        phone,
        email,
        name: 'Audit Suspended Phone Account',
        passwordHash,
        role: 'CONSUMER',
        isActive: true,
      },
    });

    // The account works while it is active.
    const active = await agent
      .post('/api/auth/login-phone')
      .send({ phone, password: 'Password@123', role: 'CONSUMER' });
    expect(active.status).toBe(200);

    await prisma.user.update({ where: { id: suspended.id }, data: { isActive: false } });

    // Every sign-in path has to refuse it.
    const viaPhone = await agent
      .post('/api/auth/login-phone')
      .send({ phone, password: 'Password@123', role: 'CONSUMER' });
    expect(viaPhone.status).toBe(401);

    const viaEmail = await agent
      .post('/api/auth/login')
      .send({ email, password: 'Password@123' });
    expect(viaEmail.status).toBe(401);

    await prisma.user.deleteMany({ where: { id: suspended.id } });
  });

  // ==========================================================================
  // 13. THE FAVOURITES BELONG TO A BUYER
  // ==========================================================================

  it('FAVOURITES: a cultivator is refused and never receives a buyer profile', async () => {
    // The suite farmer must not own a buyer profile for this test. The
    // endpoint used to create one for every signed-in account, so a
    // cultivator that called it got a row of the wrong kind for an
    // account of the wrong role.
    await prisma.consumerProfile.deleteMany({ where: { userId: farmerUserId } });

    const before = await prisma.consumerProfile.count({ where: { userId: farmerUserId } });
    expect(before).toBe(0);

    // The list of the favourites is refused.
    const list = await agent
      .get('/api/favorites')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(list.status).toBe(403);
    expect(list.body.success).toBe(false);

    // So is the heart on a lot.
    const toggle = await agent
      .post(`/api/favorites/products/${createdProductId}`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(toggle.status).toBe(403);
    expect(toggle.body.success).toBe(false);

    // And no row of the wrong kind may be created on the way.
    const after = await prisma.consumerProfile.count({ where: { userId: farmerUserId } });
    expect(after).toBe(0);

    // The buyer may really use the favourites.
    const buyer = await agent
      .get('/api/favorites')
      .set('Authorization', `Bearer ${consumerToken}`);
    expect(buyer.status).toBe(200);
    expect(buyer.body.success).toBe(true);
    expect(Array.isArray(buyer.body.data.products)).toBe(true);
    expect(Array.isArray(buyer.body.data.farmers)).toBe(true);

    // A guest is not signed in at all.
    const guest = await agent.get('/api/favorites');
    expect(guest.status).toBe(401);
  });

  it('FAVOURITES: the heart of the buyer really stores the lot', async () => {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: consumerUserId },
    });
    expect(consumerProfile).not.toBeNull();

    const add = await agent
      .post(`/api/favorites/products/${createdProductId}`)
      .set('Authorization', `Bearer ${consumerToken}`);
    expect(add.status).toBe(201);
    expect(add.body.isFavorite).toBe(true);

    const stored = await prisma.favouriteProduct.findUnique({
      where: {
        consumerId_productId: {
          consumerId: consumerProfile!.id,
          productId: createdProductId,
        },
      },
    });
    expect(stored).not.toBeNull();

    const remove = await agent
      .delete(`/api/favorites/products/${createdProductId}`)
      .set('Authorization', `Bearer ${consumerToken}`);
    expect(remove.status).toBe(200);
    expect(remove.body.isFavorite).toBe(false);

    const gone = await prisma.favouriteProduct.findUnique({
      where: {
        consumerId_productId: {
          consumerId: consumerProfile!.id,
          productId: createdProductId,
        },
      },
    });
    expect(gone).toBeNull();
  });
});