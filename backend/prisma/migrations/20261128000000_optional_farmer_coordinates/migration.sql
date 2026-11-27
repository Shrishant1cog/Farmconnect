-- FarmConnect: the farm position is only stored when it is really known.
--
-- The columns were `NOT NULL` and every account that did not share a GPS
-- position was silently stored at the fixed place `12.5218 / 76.8951`. That
-- put farms on the map where they do not exist and produced a fabricated
-- freight distance.
--
-- The migration only relaxes the constraint — no row is dropped or rewritten,
-- so every farm that really has a position keeps it.

ALTER TABLE "FarmerProfile" ALTER COLUMN "latitude" DROP NOT NULL;
ALTER TABLE "FarmerProfile" ALTER COLUMN "longitude" DROP NOT NULL;
