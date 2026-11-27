// Load `backend/.env` so this utility can be executed directly with ts-node.
import 'dotenv/config';
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

    // `Category.name` and `Category.slug` are both unique. The seed script
    // intentionally uses short, stable slugs (e.g. "grains" for
    // "Grains & Millets"), so a category can already exist under a different
    // slug. Look it up by name first and only fall back to a slug based
    // upsert, otherwise the unique constraint on `name` is violated.
    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: cat.name }, { slug }] },
    });

    const record = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: {
            name: cat.name,
            slug: existing.slug === slug ? slug : existing.slug,
            description: cat.description,
          },
        })
      : await prisma.category.create({
          data: {
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