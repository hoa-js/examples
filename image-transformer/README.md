## Image Transformer

A minimal image transformer demo built with [Hoa](https://github.com/hoa-js/hoa) and deployed on Cloudflare Workers. It lets you upload an image to R2 and view a resized/optimized version using Cloudflare Image Resizing via the `cdn-cgi/image` URL parameters.

## Features

- Upload a single image from a web page
- Store original images in a Cloudflare R2 bucket
- Generate a resized URL using Cloudflare Image Resizing:
  - `https://your-domain.com/cdn-cgi/image/<options>/<path>`
- Simple UI:
  - Drag & drop or click to choose a file
  - Input for resizing options (e.g. `width=800,fit=cover`)
  - Preview of the transformed image and its final URL
- Basic server-side validation:
  - Required file
  - Maximum size check (default: 1MB in `index.js`)

## Tech Stack

- [Hoa](https://github.com/hoa-js/hoa) – lightweight web framework
- [@hoajs/tiny-router](https://github.com/hoa-js/tinyRouter) – router middleware
- Cloudflare Workers – edge runtime
- Cloudflare R2 – object storage for original images
- Cloudflare Image Resizing – on-the-fly image transforms via URL

## Getting Started

### Prerequisites

- Node.js `>=20`
- Cloudflare account & Workers enabled
- A Cloudflare zone (domain) with **Image Resizing** enabled
- A Cloudflare R2 bucket for image storage

### Install Dependencies

```bash
npm install
```

### Configuration

1. Copy the configuration template:

```bash
mv wrangler.example.jsonc wrangler.jsonc
```

2. Edit `wrangler.jsonc` and make sure it looks roughly like this:

```jsonc
{
  "account_id": "your-account-id", // Replace with your Cloudflare Account ID
  "name": "image-transformer",
  "main": "index.js",
  "compatibility_date": "2025-11-18",
  "no_bundle": false,
  "minify": true,
  "routes": [
    {
      "pattern": "your-domain.com/*",   // Replace with your domain
      "zone_name": "your-domain.com"   // Replace with your domain
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",                  // Binding name used in Workers to access R2
      "bucket_name": "image-transformer" // Your R2 bucket name
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
