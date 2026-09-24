import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning existing SQLite records...');

  // 1. Delete dependent child records first to satisfy foreign key constraints
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.message.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.favouriteProduct.deleteMany();
  await prisma.favouriteFarmer.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.complaint.deleteMany();

  // 2. Delete parent records
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.farmerProfile.deleteMany();
  await prisma.consumerProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Vegetables',
        slug: 'vegetables',
        description: 'Fresh vegetables harvested from local fields',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Fruits',
        slug: 'fruits',
        description: 'Orchard fresh seasonal fruits',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Grains & Millets',
        slug: 'grains',
        description: 'Native ragi, jowar, organic rice and millets',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Spices & Herbs',
        slug: 'spices',
        description: 'Dry spices, turmeric, cardamom, and fresh greens',
      },
    }),
  ]);

  // 2. Admin User
  await prisma.user.create({
    data: {
      email: 'admin@farmconnect.org',
      passwordHash,
      name: 'Dr. Anita Rao (System Administrator)',
      phone: '+91 9880011223',
      role: 'ADMIN',
    },
  });

  // 3. Farmers
  const farmer1User = await prisma.user.create({
    data: {
      email: 'ramesh.mandya@farmconnect.org',
      passwordHash,
      name: 'Ramesh Kumar',
      phone: '+91 9448123456',
      role: 'FARMER',
      farmerProfile: {
        create: {
          farmName: 'Ramesh Organic Plantation & Fields',
          bio: 'Cultivating natural heirloom vegetables without synthetic pesticides.',
          district: 'Mandya',
          addressLine: 'Srirangapatna Road, Baburayanakoppal',
          latitude: 12.4218,
          longitude: 76.6932,
          isVerified: true,
        },
      },
    },
    include: { farmerProfile: true },
  });

  const farmer2User = await prisma.user.create({
    data: {
      email: 'suresh.mysuru@farmconnect.org',
      passwordHash,
      name: 'Suresh Gowda',
      phone: '+91 9845234567',
      role: 'FARMER',
      farmerProfile: {
        create: {
          farmName: 'Chamundi Natural Agri Farm',
          bio: 'Drip-irrigated greens and fresh Yelakki bananas.',
          district: 'Mysuru',
          addressLine: 'Nanjangud Highway, Kadakola',
          latitude: 12.2039,
          longitude: 76.6711,
          isVerified: true,
        },
      },
    },
    include: { farmerProfile: true },
  });

  // 4. Consumer
  const consumerUser = await prisma.user.create({
    data: {
      email: 'priya.bengaluru@gmail.com',
      passwordHash,
      name: 'Priya Narayanan',
      phone: '+91 9900456789',
      role: 'CONSUMER',
      consumerProfile: {
        create: {
          district: 'Bengaluru',
          deliveryAddress: '4th Block, Koramangala, Bengaluru',
          latitude: 12.9352,
          longitude: 77.6245,
        },
      },
    },
  });

  // 5. Products
  const tomato = await prisma.product.create({
    data: {
      farmerId: farmer1User.farmerProfile!.id,
      categoryId: categories[0].id,
      title: 'Vine-Ripened Native Tomatoes (Nati Tomato)',
      description: 'Plump, chemical-free red tomatoes harvested fresh at sunrise.',
      farmerPrice: 28.0,
      priceUnit: 'PER_KG',
      quantityAvailable: 250.0,
      quantityUnit: 'KG',
      isAvailable: true,
      isOrganic: true,
      harvestDate: new Date(),
      imageUrl:
        'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
    },
  });

  await prisma.product.create({
    data: {
      farmerId: farmer1User.farmerProfile!.id,
      categoryId: categories[2].id,
      title: 'Desi Brown Finger Millet (Mandya Ragi)',
      description: 'Traditional cleaned organic ragi grains.',
      farmerPrice: 42.0,
      priceUnit: 'PER_KG',
      quantityAvailable: 600.0,
      quantityUnit: 'KG',
      isAvailable: true,
      isOrganic: true,
      imageUrl:
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
    },
  });

  await prisma.product.create({
    data: {
      farmerId: farmer2User.farmerProfile!.id,
      categoryId: categories[1].id,
      title: 'Elakki Banana (Mysuru Yelakki Bale)',
      description: 'Sweet aromatic small bananas naturally ripened with zero carbide.',
      farmerPrice: 65.0,
      priceUnit: 'PER_DOZEN',
      quantityAvailable: 80.0,
      quantityUnit: 'DOZEN',
      isAvailable: true,
      isOrganic: true,
      imageUrl:
        'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&auto=format&fit=crop&q=80',
    },
  });

  // 6. Enquiry & Conversation
  const enquiry = await prisma.enquiry.create({
    data: {
      productId: tomato.id,
      consumerId: consumerUser.id,
      farmerId: farmer1User.farmerProfile!.id,
      subject: 'Bulk requirement of 50 kg tomatoes for family event',
      status: 'OPEN',
      messages: {
        create: [
          {
            senderId: consumerUser.id,
            content:
              'Hello Ramesh Ji, do you have 50 kg of tomatoes ready for pick-up this Saturday morning?',
          },
          {
            senderId: farmer1User.id,
            content:
              'Namaskara Priya avare! Yes, fresh batch will be harvested Friday evening. 50 kg is available at ₹28/kg.',
          },
        ],
      },
    },
  });

  // 7. Notification
  await prisma.notification.create({
    data: {
      userId: consumerUser.id,
      title: 'New Reply Received',
      message: 'Farmer Ramesh Kumar replied to your enquiry regarding Native Tomatoes.',
      type: 'ENQUIRY_MSG',
      link: `/consumer/enquiries/${enquiry.id}`,
    },
  });

  console.log('✅ SQLite database initialized and seeded successfully with realistic data!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });