## MyIP

A minimal example service built with [Hoa](https://github.com/hoa-js/hoa) and deployed on Cloudflare Workers. It returns IP information for the caller or a specified IP, powered by ipinfo.io.

## Features

- Returns caller IP info when requesting `/`
- Returns info for a specific IP via `/:ip`
- Robust IP detection across common proxy/CDN headers
- Lightweight, Web‑standards based code

Live Demo:
- [https://myip.hoa-js.com](https://myip.hoa-js.com)
- [https://myip.hoa-js.com/8.8.8.8](https://myip.hoa-js.com/8.8.8.8)

## Tech Stack

- [Hoa](https://github.com/hoa-js/hoa) – lightweight web framework
- [@hoajs/tiny-router](https://github.com/hoa-js/tinyRouter) – router middleware
- Cloudflare Workers – edge runtime
- ipinfo.io – IP data source

## Getting Started

### Prerequisites

- Node.js `>=20`
- Cloudflare account
- ipinfo.io token (optional; without it you may hit public rate limits)

### Install Dependencies

```bash
npm install
```

### Configuration

1. Copy the config template:

```bash
mv wrangler.example.jsonc wrangler.jsonc
```

2. Edit `wrangler.jsonc`:

```jsonc
{
  "account_id": "your-account-id",
  "name": "myip",
  "main": "myip.js",
  "compatibility_date": "2025-11-18",
  "no_bundle": false,
  "minify": true,
  "routes": [
    {
      "pattern": "your-domain.com/*",
      "zone_name": "your-domain.com"
    }
  ],
  "vars": {
    "IPINFO_HOST": "https://ipinfo.io",
    "IPINFO_TOKEN": "your-ipinfo-token"
  }
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

### Examples

```bash
# Get the caller IP info
curl http://localhost:8787/

# Get info for a specific IP
curl http://localhost:8787/1.2.3.4
```

## License

MIT
