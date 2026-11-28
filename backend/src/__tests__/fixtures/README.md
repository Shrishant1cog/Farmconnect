# APMC test fixture — **not market data**

This file is a **test fixture**, not a bulletin.

* Every row uses the placeholders `TEST STATE`, `TEST DISTRICT` and
  `TEST CENTRE FIXTURE`. No real market centre appears in it.
* The prices are round numbers that exist only to exercise the importer.
* **Never import this file into the production database.** It exists so that
  the import path — parsing, validation, catalogue mapping, the upsert and
  the duplicate detection — can be tested without publishing a real rate and
  without inventing a mandi price.

It also contains rows that have to be **rejected**, so that the rejection
reporting is tested as well:

| Row | Why it is rejected |
|---|---|
| `Not A Crop` | parses fine, but the commodity does not resolve to the crop catalogue — it is published, yet it does not become a benchmark |
| `not-a-price` | the modal price is not a number |
| empty `updatedAt` | the publication date is missing |
| empty `marketCenter` | the market centre is missing |

The first two rows are usable. Run the importer against them with:

```bash
cd backend
npm run db:apmc-rates -- src/__tests__/fixtures/apmc-rates.fixture.csv --dry-run
```

A **real** bulletin is a file published by the market. See
`docs/APMC_RATE_IMPORT.md` for the format and for where to obtain one.
