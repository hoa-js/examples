## 2FA

A lightweight Two-Factor Authentication (2FA) web application built with Hoa.js. This application provides TOTP (Time-based One-Time Password) generation and verification functionality.

## Features

- Generate TOTP codes from a secret key
- Simple and responsive web interface
- Built with modern web standards
- Easy to deploy with Cloudflare Workers

Live Demo: [2fa.hoa-js.com](https://2fa.hoa-js.com)

## Tech Stack

- [Hoa](https://github.com/hoa-js/hoa) - Lightweight web framework
- [@hoajs/tiny-router](https://github.com/hoa-js/tiny-router) - Router middleware
- Cloudflare Workers - Edge computing platform

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
  "name": "2fa",
  "main": "index.js",
  "compatibility_date": "2025-10-30",
  "no_bundle": false,
  "minify": true,
  "routes": [
    {
      "pattern": "your-domain.com/*", // Change to your domain
      "zone_name": "your-domain.com" // Change to your domain
    }
  ]
}
```

You can configure the TOTP settings in the `totp.js` file:

- `digits`: Number of digits in the OTP (default: 6)
- `step`: Time step in seconds (default: 30)
- `window`: Verification window (default: 1)

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
