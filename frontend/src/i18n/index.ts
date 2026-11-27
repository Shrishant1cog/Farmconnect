// Merged translation tables for the website.
//
// Each feature owns its own dictionary file so the translation work can be
// split up without touching a single shared file. The English table is the
// reference: every key must exist in all three languages.

import { coreEn } from './dictionaries/core.en';
import { coreKn } from './dictionaries/core.kn';
import { coreHi } from './dictionaries/core.hi';
import { authEn } from './dictionaries/auth.en';
import { authKn } from './dictionaries/auth.kn';
import { authHi } from './dictionaries/auth.hi';
import { farmerEn } from './dictionaries/farmer.en';
import { farmerKn } from './dictionaries/farmer.kn';
import { farmerHi } from './dictionaries/farmer.hi';
import { consumerEn } from './dictionaries/consumer.en';
import { consumerKn } from './dictionaries/consumer.kn';
import { consumerHi } from './dictionaries/consumer.hi';
import { miscEn } from './dictionaries/misc.en';
import { miscKn } from './dictionaries/misc.kn';
import { miscHi } from './dictionaries/misc.hi';
import type { Locale, TranslationMap } from './types';

export const dictionaries: Record<Locale, TranslationMap> = {
  en: { ...coreEn, ...authEn, ...farmerEn, ...consumerEn, ...miscEn },
  kn: { ...coreKn, ...authKn, ...farmerKn, ...consumerKn, ...miscKn },
  hi: { ...coreHi, ...authHi, ...farmerHi, ...consumerHi, ...miscHi },
};

/** English key set — the contract every translation must satisfy. */
export const referenceKeys: string[] = Object.keys(dictionaries.en);

export * from './types';
