## Temp Board
 
 A temporary drawing board built with React and [Hoa](https://github.com/hoa-js/hoa), deployed on Cloudflare Pages.
 
 ## Features
 
 - ✏️ **Path-based Boards** - Open a board directly from the URL path (e.g. `/Ab12xY`)
 - 💾 **Auto-save to KV** - Persist board data in Cloudflare KV through Pages Functions
 - 🔗 **Shareable Links** - Use random board IDs for quick ad-hoc collaboration and sharing
 - ⚡ **Edge Delivered** - Serve the frontend from Cloudflare Pages with low-latency global delivery
 - 🧩 **Lightweight Backend** - Use Hoa and `@hoajs/tiny-router` for a minimal API layer

 ⚠️ **Temporary Storage Notice:** This project is designed for temporary boards. Do **not** rely on it for sensitive or permanent data.
 
 ## Tech Stack
 
 - React - Frontend UI
 - Vite - Frontend build tool
 - [Hoa](https://github.com/hoa-js/hoa) - Lightweight web framework for the API layer
 - [@hoajs/tiny-router](https://github.com/hoa-js/tiny-router) - Router middleware
 - Cloudflare Pages - Static frontend hosting
 - Cloudflare Pages Functions - Edge API handlers
 - Cloudflare KV - Board data storage
 
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
 
 ```jsonc
 {
   "name": "tempboard",
   "compatibility_date": "2026-04-12",
   "pages_build_output_dir": "dist",
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
 npm run frontend:dev
 npm run backend:dev
 ```
 
 ### Build
 
 ```bash
 npm run build
 ```
 
 ### Deploy
 
 ```bash
 npm run deploy
 ```
 
 ## License
 
 MIT
