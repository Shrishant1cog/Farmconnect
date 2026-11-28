# Importing real APMC market rates

The FarmConnect clients show an APMC benchmark **only** when the market has
really published one. Until the shared database holds a published row, the
Mandi Rates page, the home ticker, the savings calculator and the farmer
dashboard show their honest *"not published yet"* state — no price is ever
derived from the farmer's own price.

This document describes how a **real** rate bulletin is loaded into the
shared database.

> The importer never generates a rate. It copies what the market published,
> rejects what it cannot read and reports every rejection with its reason.

---

## 1. The file format

The importer reads a CSV file with a **header row**. The columns are:

| Column | Required | Meaning |
| --- | --- | --- |
| `state` | yes | The state of the market yard (for example `Karnataka`). |
| `district` | yes | The district of the market yard (for example `Mandya`). |
| `marketCenter` | yes | The name of the market yard (for example `Mandya APMC`). |
| `commodity` | yes | The crop, in the wording the market uses (`Tomato`, `Green Chilli`, `Ragi`). |
| `modalPrice` | yes | The **modal** price in ₹ **per quintal** (100 kg) — the unit the market publishes in. |
| `minPrice` | yes | The minimum price of the day, in ₹ per quintal. |
| `maxPrice` | yes | The maximum price of the day, in ₹ per quintal. |
| `updatedAt` | yes | The day the market published the rate (`YYYY-MM-DD`). |

The header names are matched case-insensitively and the usual spellings of a
market bulletin are accepted:

* `marketCenter` — also `market_center`, `Market Center`, `market`
* `modalPrice` — also `modal_price`, `Modal Price`, `price`
* `minPrice` / `maxPrice` — also `min_price` / `max_price`, `min` / `max`
* `updatedAt` — also `updated_at`, `Date`, `Publication Date`, `Published At`

A header-only template lives at
[`backend/data/apmc-rates.example.csv`](../backend/data/apmc-rates.example.csv).
It contains **no** sample row on purpose — a made-up row would be a
fabricated benchmark.

### What the importer rejects

A row is rejected — never corrected — when

* a required value is empty,
* a price is not a number,
* a price is not greater than zero,
* the prices contradict each other (`min ≤ modal ≤ max` does not hold),
* the publication date is missing or cannot be read.

Every rejection is reported with its line number and the raw line.

---

## 2. Running the import

The import is a backend utility, so it needs the database connection of the
environment it writes to.

```bash
cd backend
npm install
npm run db:apmc-rates -- path/to/rates.csv
```

### Check the file first

`--dry-run` validates the file and prints the report **without** writing
anything to the database:

```bash
npm run db:apmc-rates -- path/to/rates.csv --dry-run
```

The report answers three questions:

1. how many rows were read,
2. how many of the published commodities resolve to the shared crop catalogue
   (only those become a benchmark for a listing — a commodity that does not
   resolve is a published rate, but it is **not** a benchmark of any listing),
3. which rows were rejected and why.

### The file name

The path can also be given through the environment:

```bash
APMC_RATES_CSV=/path/to/rates.csv npm run db:apmc-rates
```

Without a path the importer reads `backend/data/apmc-rates.csv` — that file is
**not** committed to the repository (see `.gitignore`), so a rate file can
never be pushed by accident.

### Against the deployed database

The deployed instance is reached through its own connection string. On Render
the import runs as a one-off shell command inside the API service, so the
`DATABASE_URL` of that service is used:

```bash
cd backend && npm run db:apmc-rates -- /tmp/rates.csv
```

---

## 3. Repeatability

A published rate is identified by its **publication key**:

```
state + district + marketCenter + commodity + updatedAt
```

The database enforces that key with the unique index
`ApmcMarketRate_publication_key` (migration
`20261128020000_apmc_rate_publication_key`). Running the import twice
therefore **updates** the prices of the same publication instead of piling up
duplicate rows — and a newer bulletin adds a new row, because it carries a
newer publication date.

The clients pick the most useful published row themselves: a rate from the
listing's own state wins, then the one from its district, and the most
recently published row breaks the remaining tie
(`backend/src/utils/apmcBenchmark.ts`).

---

## 4. What happens in the clients

Once the table holds published rows, both clients show them without any
further change:

* **Website** — `/mandi-rates` lists the published rows, the home ticker and
  the savings calculator use them, and a listing that belongs to a published
  crop shows the benchmark in ₹ **per kg** (the market publishes per quintal;
  the backend converts it once).
* **Android app** — the mandi rates page and the logistics calculator read the
  same endpoint, so both clients always show the same benchmark.

A crop that has **no** published row keeps its honest empty state — the
backend attaches `mandiBenchmark: null` and the client says *"not published
yet"*. Nothing is derived from the farmer's own price.

---

## 5. What is **not** part of this

* The importer does not download anything. It never fetches a rate from a
  third-party service on its own — a real bulletin file is handed to it.
* The importer does not invent a rate, estimate a missing price or copy a
  price from another commodity.
* The importer does not delete published rows. It only writes the rows of the
  file it was given.
