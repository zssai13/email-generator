# Manual Extract + Mini Refine + Generate Strategy Guide

## Overview

This strategy combines **free server-side HTML parsing** with **cost-effective AI refinement** to extract product data and generate emails at the lowest possible cost (~60-70% cheaper than full AI extraction).

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REQUEST                                  │
│  Product URL + Email Template + Custom Prompt                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 1: MANUAL HTML EXTRACTION                    │
│                    (Server-Side, FREE)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Fetch HTML from Product URL                                │
│     └─> GET https://example.com/product                         │
│                                                                 │
│  2. Parse HTML with Cheerio                                     │
│     └─> Load HTML into queryable DOM structure                  │
│                                                                 │
│  3. Extract Data with Priority-Based Selectors:                │
│                                                                 │
│     Priority 1 (Hero/Main Images):                             │
│     ├─> .hero img                                              │
│     ├─> .product-hero img                                      │
│     ├─> .main-image                                            │
│     ├─> img[data-main-image]                                   │
│     └─> Platform-specific (Shopify, WooCommerce)               │
│                                                                 │
│     Priority 2 (Product Images):                               │
│     ├─> .product-image                                         │
│     ├─> .product-gallery img                                   │
│     └─> img[data-product-image]                                │
│                                                                 │
│     Priority 3 (Fallback):                                     │
│     └─> img (general images)                                   │
│                                                                 │
│  4. Track Context for Each Image:                              │
│     ├─> Selector used                                          │
│     ├─> Position in HTML                                       │
│     ├─> Dimensions (if available)                              │
│     ├─> Section (hero/product/general)                         │
│     └─> Priority level                                         │
│                                                                 │
│  5. Filter & Sort:                                              │
│     ├─> Exclude logos/icons/thumbnails                         │
│     ├─> Sort by priority (1 > 2 > 3)                          │
│     └─> Sort by position (earlier = better)                    │
│                                                                 │
│  Output: Raw Product Data with Image Context                    │
│  ┌─────────────────────────────────────────┐                   │
│  │ {                                        │                   │
│  │   title: "Product Name",                │                   │
│  │   price: "149.00",                      │                   │
│  │   description: "...",                   │                   │
│  │   images: [                              │                   │
│  │     { url: "...", priority: 1,          │                   │
│  │       context: "hero-section", ... },   │                   │
│  │     { url: "...", priority: 2, ... }    │                   │
│  │   ]                                      │                   │
│  │ }                                        │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│          STEP 2: AI REFINEMENT (GPT-4o Mini)                     │
│              (Small Cost: ~$0.0005-0.001)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input: Raw Product Data + Image Context                        │
│                                                                 │
│  Prompt Structure:                                              │
│  ┌─────────────────────────────────────────┐                   │
│  │ Product Data:                            │                   │
│  │ - Title: ...                             │                   │
│  │ - Price: ...                             │                   │
│  │ - Description: ...                      │                   │
│  │                                          │                   │
│  │ Images Found (15 total):                 │                   │
│  │ [0] https://.../hero.jpg                │                   │
│  │     Context: HIGH PRIORITY, in hero      │                   │
│  │     section, large (800px wide)          │                   │
│  │                                          │                   │
│  │ [1] https://.../thumb.jpg               │                   │
│  │     Context: product-gallery, small      │                   │
│  │                                          │                   │
│  │ CRITICAL INSTRUCTIONS:                   │                   │
│  │ 1. Prioritize HIGH PRIORITY images       │                   │
│  │ 2. Look for "in hero section"            │                   │
│  │ 3. Prioritize large images (>500px)       │                   │
│  │ 4. Keep top 5 images                     │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  AI Processing:                                                 │
│  ├─> Analyzes image context                                    │
│  ├─> Identifies main hero image                                │
│  ├─> Validates and cleans data                                 │
│  ├─> Converts relative URLs to absolute                        │
│  └─> Returns prioritized image list                            │
│                                                                 │
│  Output: Refined Product Data                                   │
│  ┌─────────────────────────────────────────┐                   │
│  │ {                                        │                   │
│  │   title: "Clean Product Name",          │                   │
│  │   price: "$149.00",                     │                   │
│  │   description: "Improved...",           │                   │
│  │   images: [                              │                   │
│  │     "https://.../hero.jpg",  // MAIN    │                   │
│  │     "https://.../img2.jpg",             │                   │
│  │     "https://.../img3.jpg",             │                   │
│  │     "https://.../img4.jpg",             │                   │
│  │     "https://.../img5.jpg"              │                   │
│  │   ]                                      │                   │
│  │ }                                        │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│        STEP 3: EMAIL GENERATION (GPT-4o Mini)                   │
│              (Cost: ~$0.002-0.004)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input: Refined Product Data + Email Template                   │
│                                                                 │
│  Prompt:                                                        │
│  ┌─────────────────────────────────────────┐                   │
│  │ Create email using template:             │                   │
│  │ [Email Template HTML]                    │                   │
│  │                                          │                   │
│  │ Product Data:                            │                   │
│  │ { title, price, images, description }    │                   │
│  │                                          │                   │
│  │ Fill in template with product data       │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  Output: Complete HTML Email                                    │
│  ┌─────────────────────────────────────────┐                   │
│  │ <!DOCTYPE html>                          │                   │
│  │ <html>                                   │                   │
│  │   ...                                    │                   │
│  │   <img src="hero.jpg" />  // MAIN IMAGE  │                   │
│  │   <h1>Product Name</h1>                 │                   │
│  │   <p>$149.00</p>                        │                   │
│  │   ...                                    │                   │
│  │ </html>                                  │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cost Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│                    COST COMPARISON                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Manual Extract + Mini Refine + Generate:                  │
│  ├─> Manual Extraction:     $0.0000  (FREE)                │
│  ├─> AI Refinement:         $0.0005-0.001                  │
│  ├─> Email Generation:      $0.002-0.004                   │
│  └─> TOTAL:                 ~$0.0035-0.005                 │
│                                                             │
│  vs.                                                        │
│                                                             │
│  Full AI Extraction (GPT-4o + Mini):                       │
│  ├─> AI Extraction:         $0.007-0.015                   │
│  ├─> Email Generation:      $0.002-0.004                   │
│  └─> TOTAL:                 ~$0.009-0.019                  │
│                                                             │
│  SAVINGS: ~60-70% reduction                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Image Extraction Strategy

### Priority System

```
Priority 1: Hero/Main Images (Highest)
├─> Found in hero sections
├─> Main product image selectors
├─> Platform-specific main image patterns
└─> Typically: Large, early in HTML, in hero sections

Priority 2: Product Images
├─> Product gallery images
├─> Product-specific selectors
└─> Typically: Medium size, in product sections

Priority 3: General Images (Fallback)
└─> Any remaining images (filtered)
```

### Context Tracking

For each image, we track:
- **Priority**: 1 (hero), 2 (product), 3 (general)
- **Context**: Which selector found it
- **Position**: Where in HTML (earlier = better)
- **Dimensions**: Width/height if available
- **Section**: Hero, product, or general
- **Early in page**: First 30% of HTML = better

### Filtering Rules

**EXCLUDE:**
- Images with "logo" in URL/class/alt
- Images with "icon" in URL/class/alt
- Images with "avatar" in URL
- Images with "thumbnail" in URL
- Images with "badge" in URL
- Small images (<300px width)

**INCLUDE:**
- Images in hero sections
- Images in product sections
- Large images (>500px width)
- Images found via product selectors

---

## API Blueprint

### Endpoint: POST `/api/generate-template`

#### Request

```json
{
  "productUrl": "https://www.beachbunnyswimwear.com/products/cyrus-maxi-skirt",
  "emailTemplate": "<!DOCTYPE html>...",
  "customPrompt": "mention 5% discount",
  "model": "manual-extract-mini-refine-generate"
}
```

#### Response (Success)

```json
{
  "success": true,
  "content": "<!DOCTYPE html><html>...generated email HTML...</html>",
  "usage": {
    "input_tokens": 8500,
    "output_tokens": 1200,
    "total_tokens": 9700,
    "estimated_cost_usd": 0.0042,
    "breakdown": {
      "refinement": {
        "input_tokens": 450,
        "output_tokens": 200,
        "total_tokens": 650,
        "estimated_cost_usd": 0.0006
      },
      "generation": {
        "input_tokens": 8050,
        "output_tokens": 1000,
        "total_tokens": 9050,
        "estimated_cost_usd": 0.0036
      }
    }
  }
}
```

#### Response (Error)

```json
{
  "error": "Manual extraction failed: HTTP 404 Not Found"
}
```

---

## Step-by-Step Flow

### Step 1: Manual Extraction

**Input:** Product URL  
**Process:**
1. Fetch HTML from URL
2. Parse with Cheerio
3. Extract title (try multiple selectors)
4. Extract price (try multiple selectors)
5. Extract images with priority and context
6. Extract description
7. Convert relative URLs to absolute
8. Sort images by priority and position

**Output:** Raw product data with image context

**Example Raw Data:**
```json
{
  "title": "Cyrus Maxi Skirt",
  "price": "149.00",
  "description": "Meet the skirt that turns every moment...",
  "images": [
    {
      "url": "https://example.com/hero.jpg",
      "priority": 1,
      "context": "hero-section",
      "width": 800,
      "height": 1000,
      "isInHero": true,
      "isInProductSection": true,
      "isEarlyInPage": true
    },
    {
      "url": "https://example.com/gallery-1.jpg",
      "priority": 2,
      "context": "product-gallery",
      "width": 600,
      "height": 750,
      "isInHero": false,
      "isInProductSection": true,
      "isEarlyInPage": false
    }
  ],
  "url": "https://example.com/product"
}
```

### Step 2: AI Refinement

**Input:** Raw product data with image context  
**Process:**
1. Format image context for AI
2. Send to GPT-4o Mini with detailed prompt
3. AI analyzes context and prioritizes images
4. AI validates and cleans data
5. AI returns refined JSON

**Output:** Clean, prioritized product data

**Example Refined Data:**
```json
{
  "title": "Cyrus Maxi Skirt - White",
  "price": "$149.00",
  "description": "Meet the skirt that turns every moment into a sun-drenched daydream. The Cyrus Maxi Skirt is a breezy, hand-crocheted statement piece...",
  "images": [
    "https://example.com/hero.jpg",
    "https://example.com/gallery-1.jpg",
    "https://example.com/gallery-2.jpg",
    "https://example.com/gallery-3.jpg",
    "https://example.com/gallery-4.jpg"
  ],
  "url": "https://example.com/product"
}
```

### Step 3: Email Generation

**Input:** Refined product data + email template  
**Process:**
1. Combine template + product data
2. Send to GPT-4o Mini
3. AI fills template with product data
4. AI preserves template structure
5. Returns complete HTML email

**Output:** Complete HTML email ready to send

---

## Selector Priority List

### Title Selectors (in order)
1. `h1.product-title`
2. `h1[data-product-title]`
3. `.product-title h1`
4. `h1` (first one)
5. `meta[property="og:title"]`
6. `meta[name="twitter:title"]`
7. `title` tag

### Price Selectors (in order)
1. `.price`
2. `.product-price`
3. `[data-price]`
4. `.price-current`
5. `.sale-price`
6. `[itemprop="price"]`
7. `.cost`
8. `.amount`

### Image Selectors (Priority 1 - Hero/Main)
1. `.hero img`
2. `.product-hero img`
3. `.main-image`
4. `img[data-main-image]`
5. `img[data-product-image="main"]`
6. `.product__media img:first-child` (Shopify)
7. `.product-single__media img:first-child` (Shopify)
8. `.woocommerce-product-gallery img:first-child` (WooCommerce)

### Image Selectors (Priority 2 - Product)
1. `img.product-image`
2. `img[data-product-image]`
3. `.product-images img`
4. `.product-gallery img`
5. `img[src*="product"]`
6. `img[alt*="product" i]`
7. `img.main-image`
8. `img.primary-image`
9. `.product__media img` (Shopify)
10. `.product-single__media img` (Shopify)

### Description Selectors (in order)
1. `.product-description`
2. `.description`
3. `[data-product-description]`
4. `.product-details`
5. `.product-info`
6. `meta[property="og:description"]`
7. `meta[name="description"]`
8. `[itemprop="description"]`

---

## Error Handling

### Manual Extraction Failures
- **HTTP Error**: Return error, suggest trying AI extraction
- **No Images Found**: Return error, suggest trying AI extraction
- **Parsing Error**: Return error with details

### AI Refinement Failures
- **JSON Parse Error**: Fallback to raw data
- **API Error**: Return error, suggest retry
- **Empty Response**: Fallback to raw data

### Generation Failures
- **API Error**: Return error with details
- **Empty Response**: Return error
- **Invalid HTML**: Return error

---

## Best Practices

1. **Always try manual extraction first** (free, fast)
2. **Provide rich context to AI** (better decisions)
3. **Filter aggressively** (exclude logos/icons early)
4. **Prioritize by context** (hero > product > general)
5. **Limit image count** (top 5-10, AI will refine to 5)
6. **Handle edge cases** (fallback to AI extraction if needed)

---

## Example API Request/Response

### Request
```bash
curl -X POST https://yourapp.com/api/generate-template \
  -H "Content-Type: application/json" \
  -d '{
    "productUrl": "https://www.beachbunnyswimwear.com/products/cyrus-maxi-skirt",
    "emailTemplate": "<!DOCTYPE html>...",
    "customPrompt": "mention 5% discount",
    "model": "manual-extract-mini-refine-generate"
  }'
```

### Response
```json
{
  "success": true,
  "content": "<!DOCTYPE html><html>...",
  "usage": {
    "total_tokens": 9700,
    "estimated_cost_usd": 0.0042,
    "breakdown": {
      "refinement": { "total_tokens": 650, "estimated_cost_usd": 0.0006 },
      "generation": { "total_tokens": 9050, "estimated_cost_usd": 0.0036 }
    }
  }
}
```

---

## Summary

This strategy achieves **60-70% cost reduction** by:
1. Using free server-side HTML parsing for extraction
2. Using cheap AI (GPT-4o Mini) for refinement (~$0.0005-0.001)
3. Using cheap AI (GPT-4o Mini) for generation (~$0.002-0.004)
4. Total cost: ~$0.0035-0.005 per email

The key innovation is **context-rich image extraction** that helps AI make better decisions about which images to prioritize, resulting in accurate hero image identification while keeping costs low.

