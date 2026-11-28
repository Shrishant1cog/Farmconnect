-- FarmConnect: make a published APMC rate identifiable by its publication key.
--
-- The rate table had no unique key, so importing the same market bulletin
-- twice would have stored every row twice and the clients would have shown
-- the same rate in several rows.
--
-- The publication key is the state, the district, the market centre, the
-- commodity and the day the market published the rate — exactly what makes a
-- published rate unique.
--
-- Before the unique index is created, rows that are **completely identical**
-- on that key are removed (only the oldest one is kept). No rate with a
-- different publication date, market centre or commodity is touched, so no
-- published information is lost.

DELETE FROM "ApmcMarketRate"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "state", "district", "marketCenter", "commodity", "updatedAt"
        ORDER BY "id"
      ) AS publication_rank
    FROM "ApmcMarketRate"
  ) ranked
  WHERE ranked.publication_rank > 1
);

CREATE UNIQUE INDEX "ApmcMarketRate_publication_key"
ON "ApmcMarketRate"("state", "district", "marketCenter", "commodity", "updatedAt");
