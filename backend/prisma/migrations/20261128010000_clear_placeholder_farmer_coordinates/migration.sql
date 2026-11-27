-- FarmConnect: remove the farm positions that the placeholder code invented.
--
-- Before the previous migration every account that did not share a GPS
-- position was stored at the fixed place `12.5218 / 76.8951`:
--
--   * the register form pre-filled its coordinate state with that pair and
--     sent it on every registration,
--   * the phone-login flow, the profile upsert and the on-the-fly listing
--     creation wrote the same pair.
--
-- Every one of those rows therefore claims that the farm sits at a place
-- the farmer never chose. The map stacked all of them on a single marker
-- and the freight quote measured a distance from an invented origin.
--
-- The cleanup only touches the rows that carry **exactly** that pair, which
-- is the constant the old code wrote. A farm whose position was really
-- shared (through GPS detection) keeps its own coordinates untouched.
--
-- The rows are not deleted — the farm, its listings and its orders stay
-- intact. The farm simply has no position until the farmer shares one, so
-- it stays off the map instead of being shown somewhere it does not exist.

UPDATE "FarmerProfile"
SET "latitude" = NULL,
    "longitude" = NULL
WHERE "latitude" IS NOT NULL
  AND "longitude" IS NOT NULL
  AND "latitude" = 12.5218
  AND "longitude" = 76.8951;
