# Email Template Generator

## Overview
A Next.js application that generates Gmail-safe HTML promotional emails from any product URL. It fetches actual product data including images and prices, then uses Claude AI to generate beautiful email templates.

## Project Structure
```
email-generator/
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
└── README.md
```

## Environment Variables
- `ANTHROPIC_API_KEY` - Required for Claude AI integration

## Development
Run the development server:
```bash
cd email-generator && npm run dev
```
The app runs on port 5000.

## Features
- Real page fetching from ecommerce URLs
- Multiple design styles (Minimal Luxury, Tropical Vibrant, etc.)
- Gmail-safe HTML output with inline styles
- Promotion support for discounts and sales
- One-click HTML copy or download
