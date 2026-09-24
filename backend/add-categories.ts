import { PrismaClient } from '@prisma/client';
import process from 'process';

const prisma = new PrismaClient();

interface CategorySeed {
  name: string;
  description: string;
}

const CATEGORIES: CategorySeed[] = [
  {
    name: 'Vegetables',
    description: 'Fresh leafy greens, root vegetables, gourds, and organic field crops.',
  },
  {
    name: 'Fruits',
    description: 'Seasonal orchard fruits, tropical harvests, and fresh farm produce.',
  },
  {
    name: 'Grains & Millets',
    description: 'Ragi, jowar, foxtail millets, paddy, and indigenous grains.',
  },
  {
    name: 'Spices & Herbs',
    description: 'Cardamom, black pepper, turmeric, ginger, and fresh culinary herbs.',
  },
  {
    name: 'Pulses & Legumes',
    description: 'Toor dal, urad dal, moong dal, chickpeas, and green gram.',
  },
  {
    name: 'Oilseeds',
    description: 'Groundnut, sunflower, sesame, and mustard seed crops.',
  },
  {
    name: 'Plantation Crops',
    description: 'Coffee, arecanut, coconut, and plantation harvest lots.',
  },
  {
    name: 'Cash Crops',
    description: 'Sugarcane, raw cotton, and commercial agricultural produce.',
  },
  {
    name: 'Flowers & Floriculture',
    description: 'Marigold, jasmine, roses, and commercial festival floriculture.',
  },
  {
    name: 'Nuts & Dry Produce',
    description: 'Cashew nuts, dried areca, walnuts, and sun-dried harvest goods.',
  },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main() {
  console.log('🌱 Syncing agricultural harvest categories into FarmConnect DB...\n');

  for (const cat of CATEGORIES) {
    const slug = generateSlug(cat.name);

    const record = await prisma.category.upsert({
      where: { slug },
      update: {
        name: cat.name,
        description: cat.description,
      },
      create: {
        name: cat.name,
        slug,
        description: cat.description,
      },
    });

    console.log(`✔️ [${record.slug}] ${record.name}`);
  }

  const total = await prisma.category.count();
  console.log(`\n✅ Category sync complete! Total active categories in database: ${total}`);
}

main()
  .catch((err) => {
    console.error('❌ Error seeding categories:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });