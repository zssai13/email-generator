# Email Template Generator

Generate beautiful, Gmail-safe HTML promotional emails from any product URL.

![Email Generator](https://img.shields.io/badge/Next.js-14-black) ![Claude API](https://img.shields.io/badge/Claude-API-orange)

## Features

- **Real page fetching** - Extracts actual product data, images, prices
- **Multiple design styles** - Minimal Luxury, Tropical Vibrant, Editorial, Playful Fresh
- **Gmail-safe HTML** - Inline styles, table layouts, proper fallbacks
- **Promotion support** - Add discounts, flash sales, special offers
- **One-click copy** - Copy HTML or download as file

## Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub

```bash
# Create a new repo on GitHub, then:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/email-generator.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your `email-generator` repository
4. **Add Environment Variable:**
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your API key from [console.anthropic.com](https://console.anthropic.com)
5. Click "Deploy"

**Done!** Your app will be live at `https://your-project.vercel.app`

## Local Development

### Prerequisites

- Node.js 18+
- Anthropic API key

### Setup

```bash
# Install dependencies
npm install

# Create .env.local file
echo "ANTHROPIC_API_KEY=your_key_here" > .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

1. Paste any ecommerce product URL
2. Choose number of email variations (1-4)
3. Optionally add a promotion (e.g., "20% off flash sale")
4. Click Generate
5. Preview, copy HTML, or download

## Supported Sites

Works with most ecommerce platforms:
- Shopify stores
- WooCommerce
- BigCommerce
- Squarespace
- Custom sites with standard HTML

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

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |

## How It Works

1. **Frontend** sends product URL to `/api/generate`
2. **Backend** fetches the actual product page HTML
3. **Cheerio** parses the HTML to extract:
   - Product title, price, description
   - Real image URLs from `<img>` tags
   - Brand name
4. **Claude API** receives the extracted data and generates Gmail-safe HTML emails
5. **Frontend** displays previews with copy/download options

## License

MIT
