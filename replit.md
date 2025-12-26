# Email Template Generator

## Overview
A Next.js application that generates Gmail-safe HTML promotional emails from ecommerce product URLs using Claude AI. Fetches real product data including images and prices, then generates beautiful email templates in multiple styles.

## Project Structure
```
.
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.js    # Backend: fetches pages, calls Claude
│   ├── globals.css
│   ├── layout.jsx
│   └── page.jsx            # Frontend: React UI
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Requirements
- Node.js 18+
- Anthropic API key

## Development
```bash
npm install
npm run dev
```
The app runs on port 5000.

## Production Deployment
```bash
npm install
npm run build
npm run start
```

## Environment Variables
- `ANTHROPIC_API_KEY` - Required for Claude AI integration (configured as a secret)

## Features
- Real page fetching from ecommerce URLs
- Multiple design styles (Minimal Luxury, Tropical Vibrant, Editorial, Playful Fresh)
- Gmail-safe HTML output with inline styles
- Promotion support for discounts and sales
- One-click HTML copy or download
