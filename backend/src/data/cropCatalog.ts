// Static crop catalogue shared by the website and the Android app.
//
// The catalogue is *search assistance*, not a restriction: a farmer may always
// type a crop that is not listed. Every entry carries English, Kannada and
// Hindi aliases so the crop picker can be searched in the language the farmer
// is currently using.
//
// The catalogue is a pure data module so it can be unit-tested without a
// database and reused by both clients through the shared API.

export interface CropCatalogEntry {
  /** English name of the crop. */
  name: string;
  /** Slug of the matching `Category` record. */
  category: string;
  /** Extra search terms (native script names, common synonyms). */
  aliases: string[];
}

export const CROP_CATALOG: CropCatalogEntry[] = [
  // Vegetables
  { name: 'Tomato', category: 'vegetables', aliases: ['tomatoes', 'ಟೊಮೇಟೊ', 'टमाटर'] },
  { name: 'Potato', category: 'vegetables', aliases: ['potatoes', 'ಆಲೂಗಡ್ಡೆ', 'आलू'] },
  { name: 'Onion', category: 'vegetables', aliases: ['onions', 'ಈರುಳ್ಳೆಕ್ಕೆ', 'प्याज़'] },
  { name: 'Brinjal', category: 'vegetables', aliases: ['eggplant', 'ಬೆರೆಕೆಮೆ', 'बैंगन'] },
  { name: 'Chilli', category: 'vegetables', aliases: ['chili', 'green chilli', 'ಮೆಣಸು', 'मिर्च'] },
  { name: 'Carrot', category: 'vegetables', aliases: ['ಕ್ಯಾರಿ', 'गाजर'] },
  { name: 'Beans', category: 'vegetables', aliases: ['green beans', 'ಬೀನ್', 'फलियाँ'] },
  { name: 'Pumpkin', category: 'vegetables', aliases: ['ಕುದುರೆಕ್ಕಿ', 'कद्दू'] },
  { name: 'Cucumber', category: 'vegetables', aliases: ['ಸೌರಾಕ್ಕಾಯಿ', 'खीरा'] },
  { name: 'Cabbage', category: 'vegetables', aliases: ['ಕ್ಯಾಬ್ಬುಜ್', 'पत्तागोभी'] },
  { name: 'Cauliflower', category: 'vegetables', aliases: ['ಹೂವಿಲಕ್ಕೆ', 'फूलगोभी'] },
  { name: 'Radish', category: 'vegetables', aliases: ['ಮೂಲಂಗಡೆ', 'मूली'] },
  { name: 'Beetroot', category: 'vegetables', aliases: ['ಬೀಟ್ರೂಟ್', 'चुकंदर'] },
  { name: 'Spinach', category: 'vegetables', aliases: ['ಸಪೂರಿಕೆ', 'पालक'] },
  { name: 'Okra', category: 'vegetables', aliases: ['lady finger', 'ಬೆಂಡಿಕಾಯಿ', 'भिंडी'] },
  { name: 'Bottle gourd', category: 'vegetables', aliases: ['ಅಡುವಿಕೆ', 'लौकी'] },
  { name: 'Ridge gourd', category: 'vegetables', aliases: ['ಹುರಿಕಾಯಿ', 'तोरिया'] },
  { name: 'Green peas', category: 'vegetables', aliases: ['ಬೇವುತುರುಕ್ಕಾಯಿ', 'मटर'] },
  { name: 'Sweet corn', category: 'vegetables', aliases: ['maize', 'ಸ್ವೀಟ್ ಕಾರ್ನ್', 'मक्का'] },

  // Fruits
  { name: 'Banana', category: 'fruits', aliases: ['plantain', 'ಬಾಳೆಹಣ್ಣು', 'केला'] },
  { name: 'Mango', category: 'fruits', aliases: ['ಮಾವಿನಹಣ್ಣು', 'आम'] },
  { name: 'Apple', category: 'fruits', aliases: ['ಸೇಬು', 'सेब'] },
  { name: 'Orange', category: 'fruits', aliases: ['citrus', 'ಕಿತ್ತಳೆ', 'संतरा'] },
  { name: 'Papaya', category: 'fruits', aliases: ['ಪಪ್ಪಾಯಿ', 'पपीता'] },
  { name: 'Guava', category: 'fruits', aliases: ['ಪೇರಳೆ', 'अमरूद'] },
  { name: 'Pomegranate', category: 'fruits', aliases: ['ದಾಡೆ', 'अनार'] },
  { name: 'Watermelon', category: 'fruits', aliases: ['ಕಲ್ಲಂಗಡಿ', 'तरबूज'] },
  { name: 'Muskmelon', category: 'fruits', aliases: ['ಕಲ್ಲಂಗಡಿ ತಿರಿಗೆ', 'खरबूज'] },
  { name: 'Grapes', category: 'fruits', aliases: ['ದ್ರಾಕ್ಷಿ', 'अंगूर'] },
  { name: 'Sapodilla', category: 'fruits', aliases: ['chikoo', 'ಸಪೋಟಾ', 'चीकू'] },
  { name: 'Coconut', category: 'fruits', aliases: ['ತೆಂಗಿನಹಣ್ಣು', 'नारियल'] },

  // Grains & millets
  { name: 'Ragi', category: 'grains-millets', aliases: ['finger millet', 'ರಾಗಿ', 'रागी'] },
  { name: 'Jowar', category: 'grains-millets', aliases: ['sorghum', 'ಜೋಳ', 'ज्वार'] },
  { name: 'Foxtail millet', category: 'grains-millets', aliases: ['ಕಾಂಗಿ', 'कांगम'] },
  { name: 'Paddy', category: 'grains-millets', aliases: ['rice', 'ಭತ್ತ', 'धान'] },
  { name: 'Maize', category: 'grains-millets', aliases: ['corn', 'ಮೆಕ್ಕೆಜೋಳ', 'मक्का'] },
  { name: 'Wheat', category: 'grains-millets', aliases: ['ಗೋಧಿ', 'गेहूं'] },
  { name: 'Bajra', category: 'grains-millets', aliases: ['pearl millet', 'ಸಜ್ಜೆ', 'बाजरा'] },
  { name: 'Barley', category: 'grains-millets', aliases: ['ಬಾರ್ಲಿ', 'जौ'] },

  // Spices & herbs
  { name: 'Turmeric', category: 'spices-herbs', aliases: ['ಹಳ್ಳಿ', 'हल्दी'] },
  { name: 'Ginger', category: 'spices-herbs', aliases: ['ಶುಂಗ್ಗು', 'अदरक'] },
  { name: 'Black pepper', category: 'spices-herbs', aliases: ['ಕಬ್ಬು', 'काली मिर्च'] },
  { name: 'Cardamom', category: 'spices-herbs', aliases: ['ಏಲಕ್ಕಿ', 'इलायची'] },
  { name: 'Clove', category: 'spices-herbs', aliases: ['ಕ್ಲೇವ್', 'लौंग'] },
  { name: 'Cinnamon', category: 'spices-herbs', aliases: ['ದಾಲ್ಚಿನ್ನಿ', 'दालचीनी'] },
  { name: 'Coriander', category: 'spices-herbs', aliases: ['ಕೊತುರೆಕೆ', 'धनिया'] },
  { name: 'Cumin', category: 'spices-herbs', aliases: ['ಜೀರ್ಕೆ', 'जीरा'] },
  { name: 'Curry leaf', category: 'spices-herbs', aliases: ['ಕರಿವೇಲಿ ಎಲೆ', 'करी पत्ता'] },
  { name: 'Dry ginger', category: 'spices-herbs', aliases: ['ಸೋರಗಂ', 'सोंठ'] },

  // Pulses & legumes
  { name: 'Toor dal', category: 'pulses-legumes', aliases: ['pigeon pea', 'ತುರ್ಗೆ ಬೇಳು', 'अरहर'] },
  { name: 'Urad dal', category: 'pulses-legumes', aliases: ['ಉದ್ದ ಬೇಳು', 'उरद'] },
  { name: 'Moong dal', category: 'pulses-legumes', aliases: ['ಮುಸೂರು ಬೇಳು', 'मूंग'] },
  { name: 'Chickpeas', category: 'pulses-legumes', aliases: ['chana', 'ಕಡಲೆ', 'चना'] },
  { name: 'Green gram', category: 'pulses-legumes', aliases: ['ಹಸಿರು ಬೇಳು', 'हरा चना'] },
  { name: 'Cowpea', category: 'pulses-legumes', aliases: ['ತೊಟ್ಟು ಬೇಳು', 'लोबिया'] },
  { name: 'Horse gram', category: 'pulses-legumes', aliases: ['ಹುಲ್ಲು ಬೇಳು', 'चौला'] },

  // Oilseeds
  { name: 'Groundnut', category: 'oilseeds', aliases: ['peanut', 'ಕಡಲೆಕಾಯಿ', 'मूंगफली'] },
  { name: 'Sunflower', category: 'oilseeds', aliases: ['ಸೂರ್ಯಕಾಂತಿ', 'सूरजमुखी'] },
  { name: 'Sesame', category: 'oilseeds', aliases: ['til', 'ಎಳೆ', 'तिल'] },
  { name: 'Mustard', category: 'oilseeds', aliases: ['ಸರಿಸೆ', 'सरसों'] },
  { name: 'Soybean', category: 'oilseeds', aliases: ['ಸೋಯಾಬೀನ್', 'सोयाबीन'] },
  { name: 'Safflower', category: 'oilseeds', aliases: ['ಕತ್ತುಕುರಿಕೆ', 'कुसुम'] },

  // Plantation crops
  { name: 'Coffee', category: 'plantation-crops', aliases: ['ಕಾಫಿ', 'कॉफी'] },
  { name: 'Arecanut', category: 'plantation-crops', aliases: ['betel nut', 'ಅಡುಕ್ಕೆ', 'सुपारी'] },
  { name: 'Rubber', category: 'plantation-crops', aliases: ['ರಬ್ಬರ್', 'रबर'] },
  { name: 'Cashew', category: 'plantation-crops', aliases: ['ಬೇವಿನಹಣ್ಣು', 'काजू'] },

  // Cash crops
  { name: 'Sugarcane', category: 'cash-crops', aliases: ['ಸಕ್ಕರಿ', 'गन्ना'] },
  { name: 'Cotton', category: 'cash-crops', aliases: ['ಹತ್ತಿ', 'कपास'] },
  { name: 'Jute', category: 'cash-crops', aliases: ['ಜೂಟ್', 'जूट'] },
  { name: 'Tobacco', category: 'cash-crops', aliases: ['ತೊಗರೆ', 'तंबाकू'] },

  // Flowers & floriculture
  { name: 'Marigold', category: 'flowers-floriculture', aliases: ['ಸಾವಳಂಗಿ', 'गेंदा'] },
  { name: 'Jasmine', category: 'flowers-floriculture', aliases: ['ಮಲ್ಲಿ', 'चमेली'] },
  { name: 'Rose', category: 'flowers-floriculture', aliases: ['ಗುಲಾಬು', 'गुलाब'] },
  { name: 'Chrysanthemum', category: 'flowers-floriculture', aliases: ['ಸಂಜಿಗೆ', 'गेंदेली'] },

  // Nuts & dry produce
  { name: 'Walnut', category: 'nuts-dry-produce', aliases: ['ಅಖರೋಟ್', 'अखरोट'] },
  { name: 'Almond', category: 'nuts-dry-produce', aliases: ['ಬಾದಾಮಿ', 'बादाम'] },
  { name: 'Raisins', category: 'nuts-dry-produce', aliases: ['ಕಿಸಿಮುಳ್ಳು', 'किशमिश'] },
  { name: 'Coconut copra', category: 'nuts-dry-produce', aliases: ['ತೆಂಗಿನಕಾಯಿ', 'नारियल गिरी'] },
];

/**
 * Localised display name of every crop category.
 *
 * The category *slugs* stored in the database can differ between
 * installations (the seed script keeps an already existing slug), so the
 * catalogue only owns the canonical **name**. The API resolves the name
 * against the live `Category` table and returns the real id and slug.
 *
 * Every category also carries its Kannada and Hindi name so both clients can
 * show the filter chips in the language the user picked. The English name
 * stays the stored value — only the *display* name is localised.
 */
export const CROP_CATEGORY_LABELS: Record<
  string,
  { en: string; kn: string; hi: string }
> = {
  vegetables: { en: 'Vegetables', kn: 'ತರೆಕೆಕ್ಕೆಕ್ಕೆ', hi: 'सब्ज़ियाँ' },
  fruits: { en: 'Fruits', kn: 'ಹಣ್ಣುಗಳು', hi: 'फल' },
  'grains-millets': { en: 'Grains & Millets', kn: 'ಧಾನ್ಯ ಮತ್ತು ಮಿಲೆಟ್ಸ್', hi: 'अनाज और मिलेट' },
  'spices-herbs': { en: 'Spices & Herbs', kn: 'ಮಸಾಲೆ ಮತ್ತು ಗಿಡಗಿಡಿ', hi: 'मसाले और जड़ी-बूटियाँ' },
  'pulses-legumes': { en: 'Pulses & Legumes', kn: 'ಬೇಳು ಮತ್ತು ಕಾಳುಬೇಳು', hi: 'दलहन और फलीदार' },
  oilseeds: { en: 'Oilseeds', kn: 'ಎಣ್ಣೆಬಿತ್ತ ಬೆಳೆಗಳು', hi: 'तिलहन' },
  'plantation-crops': { en: 'Plantation Crops', kn: 'ತೋಟದ ಬೆಳೆಗಳು', hi: 'बागवानी फसलें' },
  'cash-crops': { en: 'Cash Crops', kn: 'ನಗದ ಬೆಳೆಗಳು', hi: 'नकदी फसलें' },
  'flowers-floriculture': { en: 'Flowers & Floriculture', kn: 'ಹೂವುಗಳು ಮತ್ತು ಹೂವಿನ ಕೃಷಿ', hi: 'फूल और फूलों की खेती' },
  'nuts-dry-produce': { en: 'Nuts & Dry Produce', kn: 'ಬೀಜಾದ ಹಣ್ಣುಗಳು ಮತ್ತು ಒಣ ಉತ್ಪನ್ನ', hi: 'मेवे और सूखा माल' },
};

/** Canonical (English) display name of every crop category. */
export const CROP_CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(CROP_CATEGORY_LABELS).map(([key, labels]) => [key, labels.en]),
);

/** Kannada and Hindi characters used to detect the native alias of a crop. */
const KANNADA_PATTERN = /[\u0C80-\u0CFF]/;
const DEVANAGARI_PATTERN = /[\u0900-\u097F]/;

/**
 * Returns the native Kannada / Hindi name of a catalogue entry.
 *
 * Every crop already carries its native name as an alias (the aliases are
 * used for searching in the farmer's language), so the localised display name
 * can be derived from the data instead of duplicating it. The English name is
 * returned when no native alias exists.
 */
export function localizedCropNames(entry: CropCatalogEntry): {
  nameKn: string;
  nameHi: string;
} {
  const nameKn =
    entry.aliases.find((alias) => KANNADA_PATTERN.test(alias)) ?? entry.name;
  const nameHi =
    entry.aliases.find((alias) => DEVANAGARI_PATTERN.test(alias)) ?? entry.name;

  return { nameKn, nameHi };
}

/**
 * Finds the catalogue entry that belongs to a commodity name.
 *
 * The APMC rates store the commodity as it is published by the market
 * ("Tomato", "Tomato (Hybrid)", "Ragi"), so the lookup is tolerant: the
 * catalogue entry whose name is contained in the commodity wins.
 */
export function findCatalogueEntry(commodity: string | null | undefined): CropCatalogEntry | null {
  const normalized = normalize(commodity || '');
  if (!normalized) return null;

  // An exact match wins.
  const exact = CROP_CATALOG.find((entry) => normalize(entry.name) === normalized);
  if (exact) return exact;

  // Otherwise the longest matching catalogue name wins, so "Green Chilli"
  // resolves to "Chilli" and not to a shorter, unrelated entry.
  let best: CropCatalogEntry | null = null;
  for (const entry of CROP_CATALOG) {
    const name = normalize(entry.name);
    if (!name || !normalized.includes(name)) continue;
    if (!best || name.length > normalize(best.name).length) {
      best = entry;
    }
  }

  return best;
}

/** Localised labels of a category key (falls back to the English name). */
export function localizedCategoryLabels(key: string | null | undefined): {
  nameKn: string;
  nameHi: string;
} {
  const labels = key ? CROP_CATEGORY_LABELS[key] : undefined;
  return {
    nameKn: labels?.kn ?? key ?? '',
    nameHi: labels?.hi ?? key ?? '',
  };
}

/**
 * Expands a search term into every name the catalogue knows for that crop.
 *
 * A listing stores the canonical crop name (`Tomato`), but the farmer may
 * search for it in their own script (`ಟೊಮೇಟೊ` / `टमाटर`). The expansion
 * makes the catalogue searchable in **all** three languages: a term that
 * matches one catalogue entry also matches every alias of that entry.
 *
 * Very short terms are not expanded — they would match half of the
 * catalogue and destroy the result list.
 */
export function expandCropSearchTerms(term: string): string[] {
  const normalized = normalize(term);
  if (normalized.length < 3) return [];

  const terms = new Set<string>();

  for (const entry of CROP_CATALOG) {
    const candidates = [entry.name, ...entry.aliases];
    const matches = candidates.some((candidate) =>
      normalize(candidate).includes(normalized),
    );

    if (!matches) continue;

    for (const candidate of candidates) {
      const value = candidate.trim();
      if (value) terms.add(value);
    }
  }

  return Array.from(terms);
}

/** Slug generated from a canonical category name (same rule as the seed). */
export const slugifyCategoryName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Searches the crop catalogue by name or alias (any language).
 * When `category` is given only crops of that category are returned.
 */
export function searchCrops(search?: string, category?: string, limit = 60): CropCatalogEntry[] {
  const term = normalize(typeof search === 'string' ? search : '');
  const categoryFilter = normalize(typeof category === 'string' ? category : '');

  const matches = CROP_CATALOG.filter((entry) => {
    if (categoryFilter && entry.category !== categoryFilter) {
      return false;
    }
    if (!term) {
      return true;
    }
    const haystack = [entry.name, ...entry.aliases].map(normalize);
    return haystack.some((value) => value.includes(term));
  });

  return matches.slice(0, limit);
}

/** The distinct category slugs used by the catalogue, in display order. */
export const CROP_CATEGORIES: string[] = Array.from(new Set(CROP_CATALOG.map((entry) => entry.category)));
