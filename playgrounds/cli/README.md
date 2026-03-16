# @bitrix24/b24jssdk-cli

CLI tool for generating test data and load testing in Bitrix24 via REST API.

## Overview

This CLI utility is designed for developers and QA engineers who need to:

- Generate realistic test entities (tasks, contacts, companies, products) in Bitrix24
- Perform load testing of Bitrix24 REST API integrations
- Quickly populate a Bitrix24 instance with demo data

The tool uses [@bitrix24/b24jssdk](https://bitrix24.github.io/b24jssdk/) for API communication and [citty](https://github.com/unjs/citty) for command-line interface.

## Requirements

- **Node.js** v22.0.0 or higher
- **pnpm** package manager
- **Bitrix24 webhook** with the following permissions:
  - `tasks` and `task` — for creating tasks
  - `crm` — for creating contacts, companies, invoices
  - `catalog` — for creating products

## Installation

1. Clone the repository and install dependencies from the monorepo root:

```bash
pnpm install
```

2. Navigate to the CLI playground directory and create your environment file:

```bash
cd playgrounds/cli
cp .env.example .env
```

3. Edit `.env` and set your Bitrix24 webhook URL:

```bash
B24_HOOK=https://your-domain.bitrix24.com/rest/your-user-id/your-webhook-code/
```

### Getting a Webhook URL

1. Go to your Bitrix24 portal
2. Navigate to **Applications** → **Developer resources** → **Other** → **Inbound webhook**
3. Create a new webhook with required permissions
4. Copy the webhook URL (format: `https://your-domain.bitrix24.com/rest/1/abc123xyz/`)

> **Important:** The `.env` file must be located in `playgrounds/cli/`, not in the workspace root.

## Commands

### Make Tasks

Creates random tasks in Bitrix24.

**Syntax:**

```bash
pnpm run dev make tasks --total=<number> [--creatorId=<id>] [--responsibleId=<id>]
```

**Arguments:**

| Argument          | Required | Default | Description                       |
| ----------------- | -------- | ------- | --------------------------------- |
| `--total`         | Yes      | —       | Number of tasks to create         |
| `--creatorId`     | No       | `1`     | User ID of the task creator       |
| `--responsibleId` | No       | `1`     | User ID of the responsible person |

**Generated data:**

- **Title**: Realistic task names in 4 languages (Chinese, English, Russian, Spanish) using verb + object patterns (e.g., "Prepare quarterly report", "Протестировать API-эндпоинты")
- **Priority**: Random (`low`, `average`, `high`)
- **Status**: `pending` (initial)
- **Deadline**: Random time within 1-36 hours from now
- **Description**: Contains a tag in the selected language
- **Checklist**: ~40% of tasks include 2-6 checklist items

**Examples:**

```bash
# Create 10 tasks with default settings
pnpm run dev make tasks --total=10

# Create 50 tasks with specific creator and responsible
pnpm run dev make tasks --total=50 --creatorId=1 --responsibleId=2

# Create 100 tasks for load testing
pnpm run dev make tasks --total=100
```

### Make Products (with SKU)

Creates random products with stock keeping units (SKUs) in Bitrix24 catalog.

**Syntax:**

```bash
pnpm run dev make products-sku --total=<number> [--theme=<industrial|fashion>] [--vatIncluded=<Y|N>] [--currency=<code>]
```

**Arguments:**

| Argument        | Required | Default      | Description                                          |
| --------------- | -------- | ------------ | ---------------------------------------------------- |
| `--total`       | Yes      | —            | Number of parent products to create                  |
| `--theme`       | No       | `industrial` | Theme for product names (`industrial` or `fashion`)  |
| `--vatIncluded` | No       | `N`          | Whether VAT is included in price (`Y` or `N`)        |
| `--currency`    | No       | `USD`        | Currency code for prices (e.g., `USD`, `EUR`, `RUB`) |

**Generated data:**

- **Parent product**: Created in the main product catalog with a unique name based on the selected theme (e.g., "Hydraulic Pump 8421" for industrial, "Leather Jacket 3572" for fashion).
- **SKU (offer)**: A variation linked to the parent product. Includes:
  - Random values for available SKU properties (e.g., color, size) discovered from the catalog.
  - Random physical parameters: height, length, width, weight (1‑1000 units).
  - Random quantity in stock (1‑1000).
  - Random purchase price (200‑10200 in the specified currency).
  - Random VAT rate (selected from existing VAT rates in Bitrix24).
  - Random measure unit (from existing measures, e.g., pieces, kg).
- **Prices**: For each active price type (e.g., retail, wholesale), a random selling price (500‑20500) is added, linked to the SKU.
- **Images**: Currently placeholder (no actual image data is sent; this can be extended).

**Discovery phase**:

Before creation, the script automatically detects:

- Product and SKU information block IDs
- Available price types
- Available measures and VAT rates
- SKU properties of type "list" (e.g., Color, Size) and their possible values
- Existing product names to avoid duplicates (names are generated uniquely)

**Examples:**

```bash
# Create 10 industrial-themed products with default settings
pnpm run dev make products-sku --total=10

# Create 20 fashion products with VAT included in prices, in EUR
pnpm run dev make products-sku --total=20 --theme=fashion --vatIncluded=Y --currency=EUR

# Create 5 products with custom currency
pnpm run dev make products-sku --total=5 --theme=industrial --currency=RUB
```

### Make Contacts

Creates random contacts in Bitrix24 CRM.

**Syntax:**

```bash
pnpm run dev make contacts --total=<number> [--assignedById=<id>]
```

**Arguments:**

| Argument         | Required | Default | Description                    |
| ---------------- | -------- | ------- | ------------------------------ |
| `--total`        | Yes      | —       | Number of contacts to create   |
| `--assignedById` | No       | `1`     | User ID of the assigned person |

**Generated data:**

- **Name**: Realistic first and last names in 4 languages (Chinese, English, Russian, Spanish)
- **Email**: Generated from name (e.g., `john.smith@gmail.com`, `王伟@outlook.com`)
- **Phone**: Country-specific format (+86 for China, +1 for US, +7 for Russia, +34 for Spain)
- **Source**: Random (`WEBFORM`, `CALL`, `OTHER`, `RC_GENERATOR`)
- **Position**: Random (`Manager`, `Developer`, `Director`, `Analyst`, `Specialist`)
- **Type**: `CLIENT`

**Examples:**

```bash
# Create 10 contacts
pnpm run dev make contacts --total=10

# Create 25 contacts assigned to user ID 5
pnpm run dev make contacts --total=25 --assignedById=5
```

### Make Companies

Creates random companies in Bitrix24 CRM.

**Syntax:**

```bash
pnpm run dev make companies --total=<number> [--assignedById=<id>]
```

**Arguments:**

| Argument         | Required | Default | Description                    |
| ---------------- | -------- | ------- | ------------------------------ |
| `--total`        | Yes      | —       | Number of companies to create  |
| `--assignedById` | No       | `1`     | User ID of the assigned person |

**Generated data:**

- **Title**: Business-style names combining prefix + industry + suffix (e.g., "Global Tech Solutions", "NextGen Finance Corp", "Digital Media Partners")
- **Email**: Generated from company name
- **Phone**: Country-specific format
- **Source**: `OTHER`
- **Type**: `CLIENT`

**Examples:**

```bash
# Create 10 companies
pnpm run dev make companies --total=10

# Create 30 companies assigned to user ID 3
pnpm run dev make companies --total=30 --assignedById=3
```

### Make Deals

Creates random deals in Bitrix24 CRM with products, counterparties, and stages.

**Syntax:**

```bash
pnpm run dev make deals --total=<number> [--assignedById=<id>] [--categoryId=<id>] [--maxProducts=<number>]
```

**Arguments:**

| Argument         | Required | Default | Description                                   |
| ---------------- | -------- | ------- | --------------------------------------------- |
| `--total`        | Yes      | —       | Number of deals to create                     |
| `--assignedById` | No       | `1`     | User ID of the responsible person             |
| `--categoryId`   | No       | `0`     | Sales funnel ID (`0` for default funnel)      |
| `--maxProducts`  | No       | `4`     | Maximum number of SKU products per deal (1‑5) |

**Generated data:**

- **Counterparty**: Randomly selects either a **company** (legal entity) or a **contact** (individual) from existing CRM records (50/50 chance).
- **Currency**: Random currency from available CRM currencies.
- **Source**: Random source ID from CRM sources (if any).
- **Stage**: Distributed according to a realistic pipeline:
  - 30% — first stage (e.g., `NEW`)
  - 40% — successful stage (`WON`)
  - 30% — unsuccessful stage (`LOSE`)
- **Dates**:
  - **Start date**: Random within the last 2 years.
  - **Close date**: Random 5‑120 days after start.
- **Title**: English‑language deal names generated from product‑related themes (e.g., "Steel Fabrication Deal").
- **Products**: 1 to `--maxProducts` random SKU products from the catalog. For each product:
  - Quantity: random 1‑10.
  - Price: random 500‑20,000 (in the selected currency).
  - VAT handling: tax included if counterparty is a contact (individual), excluded if company.
  - VAT rate: random from existing VAT rates.
- **Batch processing**: Commands are grouped into batches of up to 50 for maximum performance.

**Examples:**

```bash
# Create 10 deals in the default funnel
pnpm run dev make deals --total=10

# Create 50 deals in funnel ID 3 with up to 5 products each, assigned to user 5
pnpm run dev make deals --total=50 --categoryId=3 --maxProducts=5 --assignedById=5

# Create 150 deals for load testing
pnpm run dev make deals --total=150
```

### Recalculate Deals

Recalculates deal amounts into a target currency using exchange rates from:

- **NBRB** (`BY`) — National Bank of the Republic of Belarus
- **CBR** (`RU`) — Central Bank of Russia
- **open.er-api.com** (`OPEN`) — universal aggregator (30+ central banks & commercial sources, 161 currencies)

The exchange rate source is auto-detected from the target currency: BYN → NBRB, RUB → CBR, everything else → open.er-api.com. Results are stored in auto-created deal userfields.

Exchange rates are cached to a local file (`.cache/exchange-rates.json`) with a 24-hour TTL, so repeated runs don't hit external APIs.

**Syntax:**

```bash
pnpm run dev make recalculate-deals --targetCurrency=<code> [--bank=<BY|RU|OPEN>] [--rateDate=<current|closedate|begindate>] [--categoryId=<id>] [--forceRecalculate=<true|false>]
```

**Arguments:**

| Argument             | Required | Default          | Description                                                             |
| -------------------- | -------- | ---------------- | ----------------------------------------------------------------------- |
| `--targetCurrency`   | Yes      | —                | Target currency code (e.g. `USD`, `EUR`, `RUB`, `BYN`)                  |
| `--bank`             | No       | auto by currency | Exchange rate source: `BY` (NBRB), `RU` (CBR), `OPEN` (open.er-api.com) |
| `--rateDate`         | No       | `current`        | Date source for rate: `current` (today), `closedate`, `begindate`       |
| `--categoryId`       | No       | `0`              | Sales funnel ID (`0` = all funnels)                                     |
| `--forceRecalculate` | No       | `false`          | If `true`, recalculates all deals including closed ones                 |

**How it works:**

1. **Exchange rates**: Fetches rates from the selected source. The source is auto-detected from `--targetCurrency` if `--bank` is not specified: BYN → NBRB, RUB → CBR, everything else → open.er-api.com.
2. **Caching**: Rates are cached to `.cache/exchange-rates.json` (24h TTL). Repeated runs reuse cached rates without extra API calls.
3. **Userfields**: For each target currency, two deal userfields are created (if they don't exist):
   - `UF_CRM_CNV_{CURRENCY}` — converted amount (double)
   - `UF_CRM_CNV_{CURRENCY}_DT` — conversion date
4. **Filtering**: By default, only open deals (not WON/LOSE) or deals without a prior conversion are processed. Use `--forceRecalculate=true` to process all deals.
5. **Conversion**: Each deal's `opportunity` is converted from its `currencyId` to the target currency at the appropriate exchange rate, then written back via batch updates.
6. **Multiple currencies**: Running the script with different `--targetCurrency` values creates separate userfield pairs for each currency (e.g., 3 runs with USD, EUR, BYN → 6 userfields).

**Examples:**

```bash
# Recalculate all open deals to USD (auto → open.er-api.com)
pnpm run dev make recalculate-deals --targetCurrency=USD

# Recalculate to BYN at deal close date (auto → NBRB)
pnpm run dev make recalculate-deals --targetCurrency=BYN --rateDate=closedate

# Force recalculate ALL deals (including closed) to EUR (auto → open.er-api.com)
pnpm run dev make recalculate-deals --targetCurrency=EUR --forceRecalculate=true

# Recalculate deals in funnel #3 to RUB (auto → CBR)
pnpm run dev make recalculate-deals --targetCurrency=RUB --categoryId=3

# Explicit bank override
pnpm run dev make recalculate-deals --targetCurrency=USD --bank=RU
```

## Running from Different Directories

### From the monorepo root:

```bash
pnpm --filter @bitrix24/b24jssdk-cli dev make tasks --total=10
pnpm --filter @bitrix24/b24jssdk-cli dev make products-sku --total=10
pnpm --filter @bitrix24/b24jssdk-cli dev make contacts --total=10
pnpm --filter @bitrix24/b24jssdk-cli dev make companies --total=10
pnpm --filter @bitrix24/b24jssdk-cli dev make deals --total=10
pnpm --filter @bitrix24/b24jssdk-cli dev make recalculate-deals --targetCurrency=USD
```

### From `playgrounds/cli/`:

```bash
pnpm run dev make tasks --total=10
pnpm run dev make products-sku --total=10
pnpm run dev make contacts --total=10
pnpm run dev make companies --total=10
pnpm run dev make deals --total=10
pnpm run dev make recalculate-deals --targetCurrency=USD
```

> **Note:** Regardless of where you run the command, the `.env` file must be in `playgrounds/cli/`.

## Project Structure

```
playgrounds/cli/
├── .env.example          # Environment template
├── .env                  # Your local environment (gitignored)
├── package.json          # Package configuration
├── README.md             # This file
└── src/
    ├── index.ts          # CLI entry point
    ├── commands/
    │   └── make/
    │       ├── index.ts              # make command group
    │       ├── tasks.ts              # tasks subcommand
    │       ├── contacts.ts           # contacts subcommand
    │       ├── companies.ts          # companies subcommand
    │       ├── deals.ts              # deals subcommand
    │       ├── products-sku.ts       # products with SKU subcommand
    │       └── recalculate-deals.ts  # deal currency recalculation
    ├── constants/
    │   └── index.ts      # Shared constants (languages, priorities, product themes, etc.)
    ├── services/
    │   └── exchange-rates/
    │       ├── index.ts             # Exchange rate service exports
    │       ├── types.ts             # Provider interfaces
    │       ├── base-provider.ts     # Base class with retry & file cache
    │       ├── file-cache.ts        # File-based rate cache (24h TTL)
    │       ├── nbrb-provider.ts     # National Bank of Belarus
    │       ├── cbr-provider.ts      # Central Bank of Russia
    │       ├── open-er-provider.ts  # open.er-api.com universal aggregator
    │       └── provider-factory.ts  # Provider factory
    ├── types/
    │   ├── index.ts      # Type exports
    │   ├── language.ts   # Language types
    │   ├── crm.ts        # CRM entity types
    │   └── task.ts       # Task types
    └── utils/
        ├── index.ts      # Utility exports
        ├── random.ts     # Random value generators
        ├── phone.ts      # Phone number generators
        ├── progress.ts   # Progress bar utility
        └── locale.ts     # Bank detection by target currency
```

## Troubleshooting

### "B24_HOOK environment variable is not set"

- Ensure `.env` file exists in `playgrounds/cli/` directory
- Verify the file contains `B24_HOOK=https://...` with your webhook URL
- Check that the URL ends with a trailing slash

### API errors (403, 401)

- Verify your webhook has the required permissions
- Check if the webhook is active and not expired
- Ensure the Bitrix24 portal is accessible

### "No task/contact/company/product ID returned from API"

- The entity was likely not created due to validation errors
- Check Bitrix24 logs for more details
- Verify required fields are being sent correctly

### Connection timeout

- Check your network connection
- Verify the Bitrix24 portal URL is correct
- The portal might be under heavy load — try again later
