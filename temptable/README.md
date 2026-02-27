## Temp Table

An online temporary spreadsheet built with [Hoa](https://github.com/hoa-js/hoa), deployed on Cloudflare Workers.

Frontend uses [jspreadsheet/ce](https://github.com/jspreadsheet/ce).

## Features

- **Instant Use** - Open a URL and start editing immediately
- **Edit & Paste** - Supports editing cells and pasting from Excel/Google Sheets
- **Auto-save** - Saved to Cloudflare KV automatically
- **Shareable Links** - Each table has a unique URL path
- **Export** - Supports JSON/CSV export via query string

⚠️ **Security Notice:** Do **not** input any sensitive information.

Live Demo:
- [TempTable](https://temptable.hoa-js.com)

## Tech Stack

- [Hoa](https://github.com/hoa-js/hoa)
- [@hoajs/tiny-router](https://github.com/hoa-js/tiny-router)
- Cloudflare Workers
- Cloudflare KV
- [jspreadsheet/ce](https://github.com/jspreadsheet/ce)

## Getting Started

### Prerequisites

- Node.js >= 20
- Cloudflare account

### Install

```bash
pnpm install
```

### Configuration

1. Rename the configuration template:

```bash
mv wrangler.example.jsonc wrangler.jsonc
```

2. Edit `wrangler.jsonc` and fill in your configuration:

```json
{
  "account_id": "your-account-id",
  "name": "temptable",
  "main": "temptable.js",
  "compatibility_date": "2026-02-27",
  "routes": [
    {
      "pattern": "your-domain.com/*",
      "zone_name": "your-domain.com"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "your-kv-namespace-id"
    }
  ]
}
```

### Local Development

```bash
pnpm run dev
```

### Deploy

```bash
pnpm run deploy
```

## License

MIT
