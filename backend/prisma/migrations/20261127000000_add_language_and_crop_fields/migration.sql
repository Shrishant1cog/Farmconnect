-- FarmConnect: multilingual accounts and independent crop listings.
--
-- Additive only: no data is dropped or rewritten, so existing products,
-- orders and users keep working exactly as before.

-- Interface language shared by the website and the Android app.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT NOT NULL DEFAULT 'en';

-- One listing = one crop, with its own quantity, price and availability.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "cropName" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "variety" TEXT;

-- Index that keeps crop filtering fast on the shared catalogue.
CREATE INDEX IF NOT EXISTS "Product_cropName_idx" ON "Product" ("cropName");
