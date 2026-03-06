## Temp File

A temporary file management website built with the [Hoa](https://github.com/hoa-js/hoa) framework, deployed on Cloudflare Workers.

## Features

- 📁 **Path-based File Spaces** - Manage files by URL path (e.g. `/team-a`, `/project-docs`)
- 📤 **Batch Upload** - Upload multiple files in one request with progress feedback
- 🗑️ **Delete Support** - Remove files directly from the list
- ⚡ **Edge Powered** - Hosted on Cloudflare Workers for low-latency global access
- 🧩 **Lightweight** - Built with Hoa for efficient, maintainable code

⚠️ **Security Notice:** Do **not** upload sensitive files, such as API keys, account credentials, or private documents.

## Tech Stack

- [Hoa](https://github.com/hoa-js/hoa) - Lightweight web framework
- [@hoajs/router](https://github.com/hoa-js/router) - Router middleware
- Cloudflare Workers - Edge runtime
- Cloudflare R2 - File object storage
- Cloudflare KV - Metadata/index storage

## Getting Started

### Prerequisites

- Node.js >= 20
- Cloudflare account

### Install Dependencies

```bash
npm install
```

### Configuration

1. Rename the configuration template:

```bash
mv wrangler.example.jsonc wrangler.jsonc
```

2. Edit `wrangler.jsonc` and fill in your configuration:

```json
{
  "account_id": "your-account-id", // Change to your Cloudflare Account ID
  "name": "tempfile",
  "main": "tempfile.js",
  "compatibility_date": "2026-03-05",
  "no_bundle": false,
  "minify": true,
  "routes": [
    {
      "pattern": "your-domain.com/*", // Change to your domain
      "zone_name": "your-domain.com" // Change to your domain
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "your-R2-namespace-id"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "your-kv-namespace-id" // Change to your KV Namespace ID
    }
  ]
}
```

### Local Development

```bash
npm run dev
```

### Deploy

```bash
npm run deploy
```

## License

MIT
