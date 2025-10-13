## Temp Note

A temporary note website built with [Hoa](https://github.com/hoa-js/hoa) framework, deployed on Cloudflare Workers.

## Features

- 🚀 **Instant Use** - Create notes instantly without registration or login
- 💾 **Auto-save** - Notes are automatically stored in the cloud
- 🔗 **Shareable Links** - Each note has a unique URL for easy sharing
- ⚡ **Edge Powered** - Hosted on Cloudflare Workers for low-latency global access
- 🎨 **Minimal Design** - Clean interface focused on content
- 📝 **Lightweight** - Built with the Hoa framework for efficient, maintainable code

Live Demo:
- [TempNote](https://tempnote.hoa-js.com)
- [TempNote with password](https://tempnote_password.hoa-js.com)

⚠️ **Security Notice:** Do **not** input any sensitive information, such as API keys, account credentials, or secrets.

## Tech Stack

- [Hoa](https://github.com/hoa-js/hoa) - Lightweight web framework
- [@hoajs/router](https://github.com/hoa-js/router) - Router middleware
- Cloudflare Workers - Edge computing platform
- Cloudflare KV - Key-value storage

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
  "name": "tempnote",
  "main": "tempnote.js",
  "compatibility_date": "2025-09-30",
  "no_bundle": false,
  "minify": true,
  "routes": [
    {
      "pattern": "your-domain.com/*", // Change to your domain
      "zone_name": "your-domain.com" // Change to your domain
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
