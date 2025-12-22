import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert ecommerce email marketing designer. You create stunning, production-ready, Gmail-safe HTML promotional emails.

## IMPORTANT: USE THE PROVIDED PRODUCT DATA
You will receive extracted product data including real image URLs. USE THESE EXACT URLs - do not modify or guess image URLs.

## EMAIL DESIGN AESTHETICS

When creating multiple emails, use distinctly different design directions:

### 1. Minimal Luxury
- Clean white background (#ffffff), generous white space (40-50px padding)
- Elegant serif: 'Cormorant Garamond', Georgia, serif
- Thin borders (#f0f0f0), understated accent color matching the product

### 2. Tropical Vibrant  
- Bold saturated colors that complement the product
- Rounded corners (12-24px border-radius)
- Sans-serif: 'DM Sans', Arial, sans-serif
- Gradient buttons, energetic feel

### 3. Editorial/Magazine
- Dark header sections (#1a1a1a)
- Gold accents (#D4AF37)
- 'Playfair Display', Georgia, serif for headlines
- Two-column layouts, fashion-forward storytelling

### 4. Playful Fresh
- Warm cream/peach backgrounds (#FFF9F0)
- Pill-shaped buttons (border-radius: 50px)
- 'Outfit', Arial, sans-serif
- Benefit-focused content, friendly tone

## TECHNICAL REQUIREMENTS (CRITICAL FOR GMAIL)

- ALL styles must be inline (style="...") - Gmail strips <style> blocks
- Use table-based layouts with role="presentation"
- Max width: 600px, centered with margin: 0 auto
- Always include font fallbacks
- Tables need: cellspacing="0" cellpadding="0" border="0"
- Images: set width="100%" as attribute AND in style, plus display: block
- Use the EXACT image URLs provided - they are real and will work

## EMAIL STRUCTURE

1. Header - Brand logo centered, subtle bottom border
2. Hero Image - Full width, use the first/main product image
3. Product Info - Name (large), color/variant (italic), 1-2 sentence description
4. Price - Prominent display
5. CTA Button - "Shop Now" with dark background
6. Secondary Image - Use second product image if available
7. Features - 3 columns showing key product attributes
8. Cross-sell - "Complete the Look" section if matching product provided
9. Shipping Banner - "Free Shipping on Orders Over $X"
10. Footer - Nav links, copyright

## OUTPUT FORMAT

For each email requested, output:
1. A comment with the style name: <!-- MINIMAL LUXURY --> or <!-- TROPICAL VIBRANT --> etc.
2. Complete HTML starting with <!DOCTYPE html> and ending with </html>
3. Separator between emails: <!-- EMAIL_SEPARATOR -->

Generate complete, production-ready HTML. Do not truncate or use placeholders.`;

async function fetchProductPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove scripts and styles for cleaner text extraction
    $('script, style, noscript, iframe, svg').remove();
    
    // Extract title
    const title = $('title').text().split('–')[0].split('|')[0].trim();
    
    // Extract price - look for common patterns
    let price = '';
    const priceSelectors = [
      '.product-price', '.price', '[data-price]', '.product__price',
      '.money', '.ProductPrice', '.product-single__price'
    ];
    for (const selector of priceSelectors) {
      const found = $(selector).first().text().trim();
      if (found && found.includes('$')) {
        price = found.match(/\$[\d,.]+/)?.[0] || found;
        break;
      }
    }
    // Fallback: search for price pattern in page
    if (!price) {
      const bodyText = $('body').text();
      const priceMatch = bodyText.match(/\$\d+(?:\.\d{2})?/);
      if (priceMatch) price = priceMatch[0];
    }
    
    // Extract description
    let description = '';
    const descSelectors = [
      '.product-description', '.product__description', '[data-product-description]',
      '.product-single__description', '.ProductDescription', '.product-details'
    ];
    for (const selector of descSelectors) {
      const found = $(selector).first().text().trim();
      if (found && found.length > 20) {
        description = found.substring(0, 500);
        break;
      }
    }
    
    // Extract images - focus on product images
    const images = [];
    const seenUrls = new Set();
    
    $('img').each((_, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src') || '';
      
      // Fix protocol-relative URLs
      if (src.startsWith('//')) {
        src = 'https:' + src;
      }
      
      // Skip if not absolute URL
      if (!src.startsWith('http')) return;
      
      // Skip tiny images, icons, logos
      if (src.includes('icon') || src.includes('logo') || src.includes('badge')) return;
      if (src.includes('1x1') || src.includes('pixel')) return;
      
      // Prioritize product/CDN images
      const isProductImage = 
        src.includes('cdn.shopify') || 
        src.includes('product') ||
        src.includes('/files/') ||
        src.includes('cloudinary') ||
        src.includes('imgix');
      
      if (!isProductImage) return;
      
      // Normalize URL (remove size params for Shopify, keep version)
      let normalizedSrc = src;
      if (src.includes('cdn.shopify')) {
        // Get higher resolution version
        normalizedSrc = src.replace(/_(small|compact|medium|large|grande|\d+x\d+)\./, '.');
        normalizedSrc = normalizedSrc.replace(/&width=\d+/, '');
        normalizedSrc = normalizedSrc.replace(/\?width=\d+/, '?');
      }
      
      // Avoid duplicates
      const baseUrl = normalizedSrc.split('?')[0];
      if (seenUrls.has(baseUrl)) return;
      seenUrls.add(baseUrl);
      
      images.push(normalizedSrc);
    });
    
    // Also check for JSON-LD product data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json['@type'] === 'Product') {
          if (!price && json.offers?.price) {
            price = '$' + json.offers.price;
          }
          if (!description && json.description) {
            description = json.description.substring(0, 500);
          }
          if (json.image) {
            const jsonImages = Array.isArray(json.image) ? json.image : [json.image];
            jsonImages.forEach(img => {
              if (img && !images.includes(img)) {
                images.unshift(img); // Add to front as these are usually high quality
              }
            });
          }
        }
      } catch (e) {}
    });
    
    // Extract brand/store name
    let brand = '';
    const brandSelectors = ['.brand', '.vendor', '[data-brand]', '.product-vendor'];
    for (const selector of brandSelectors) {
      const found = $(selector).first().text().trim();
      if (found) {
        brand = found;
        break;
      }
    }
    // Fallback to domain
    if (!brand) {
      try {
        brand = new URL(url).hostname.replace('www.', '').split('.')[0];
        brand = brand.charAt(0).toUpperCase() + brand.slice(1);
      } catch (e) {}
    }
    
    // Get page text for additional context
    const pageText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000);
    
    return {
      success: true,
      data: {
        url,
        title,
        price,
        description,
        brand,
        images: images.slice(0, 10), // Top 10 images
        pageText
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function POST(request) {
  try {
    const { productUrl, emailCount, promotion } = await request.json();
    
    if (!productUrl) {
      return Response.json({ error: 'Product URL is required' }, { status: 400 });
    }
    
    // Fetch the actual product page
    const fetchResult = await fetchProductPage(productUrl);
    
    if (!fetchResult.success) {
      return Response.json({ error: `Failed to fetch product page: ${fetchResult.error}` }, { status: 400 });
    }
    
    const product = fetchResult.data;
    
    // Build the prompt with real product data
    let userPrompt = `Create ${emailCount} different beautiful promotional ecommerce emails for this product.

## PRODUCT DATA (extracted from actual page - use these exact values):

**Product URL:** ${product.url}
**Product Name:** ${product.title}
**Brand:** ${product.brand}
**Price:** ${product.price || 'Not found - use $99 as placeholder'}
**Description:** ${product.description || 'Use the product name and create a compelling 1-2 sentence description'}

**REAL IMAGE URLs (use these exact URLs):**
${product.images.map((img, i) => `${i + 1}. ${img}`).join('\n')}

**Additional page context:**
${product.pageText.substring(0, 1000)}
`;

    if (promotion) {
      userPrompt += `\n\n## PROMOTION TO INCLUDE:\n${promotion}`;
      
      // If it's a percentage discount, help with the math
      const percentMatch = promotion.match(/(\d+)%/);
      if (percentMatch && product.price) {
        const percent = parseInt(percentMatch[1]);
        const priceNum = parseFloat(product.price.replace(/[^0-9.]/g, ''));
        if (!isNaN(priceNum)) {
          const discounted = (priceNum * (1 - percent / 100)).toFixed(2);
          const savings = (priceNum - parseFloat(discounted)).toFixed(2);
          userPrompt += `\nOriginal price: ${product.price}, Discounted price: $${discounted}, Savings: $${savings}`;
        }
      }
    }

    userPrompt += `\n\nGenerate ${emailCount} complete HTML email(s) with different design aesthetics. Use the EXACT image URLs provided above.`;

    // Call Claude API
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    // Extract text content
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return Response.json({ 
      success: true, 
      content: textContent,
      productData: {
        title: product.title,
        price: product.price,
        brand: product.brand,
        imageCount: product.images.length
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate emails' 
    }, { status: 500 });
  }
}
