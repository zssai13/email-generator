import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

const client = new Anthropic();

// ============================================================================
// CALL 1: DATA EXTRACTION + DESIGN DECISION PROMPT
// Purpose: Parse HTML into structured data AND determine brand-appropriate design
// ALL design decisions happen here based on brand analysis
// ============================================================================
const DATA_AND_DESIGN_EXTRACTION_PROMPT = `You are a brand analyst and creative director. Your job is to:
1. Extract all product and brand data from the page
2. Analyze the brand's visual identity, voice, and positioning
3. Make specific design decisions for an email that perfectly matches THIS brand

## CRITICAL RULES
- Every design decision must be derived from analyzing THIS specific brand
- Do not use generic defaults - study the brand's aesthetic carefully
- The email should feel like it came from the brand's own marketing team

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no explanation). Use this exact structure:

{
  "product": {
    "name": "Product Name",
    "variant": "Color/Size/Style if applicable",
    "full_name": "Complete product name with variant",
    "price": "$XX.XX",
    "original_price": "$XX.XX or null if no sale",
    "category": "Product category",
    "collection": "Collection name if mentioned",
    "url": "Full product URL"
  },
  "description": {
    "headline": "Compelling one-liner from/about the product",
    "body": "Main product description",
    "features": [
      {"label": "Feature name", "value": "Feature description"}
    ],
    "fit_note": "Sizing recommendations if any",
    "care_instructions": "Care instructions if found"
  },
  "images": {
    "hero": "Best main product image URL",
    "secondary": "Second image URL", 
    "additional": ["Other image URLs"]
  },
  "brand": {
    "name": "Full brand name",
    "short_name": "Shortened name",
    "tagline": "Brand tagline if found",
    "origin": "Location/founding story if mentioned",
    "logo_url": "Brand logo URL",
    "website": "Brand homepage"
  },
  "promotions": {
    "free_shipping_threshold": "Free shipping minimum or null",
    "current_sale": "Active promo text",
    "loyalty_program": "Loyalty program name"
  },
  "matching_products": {
    "name": "Complementary product name",
    "url": "URL to matching product/collection"
  },
  
  "brand_analysis": {
    "market_position": "Luxury/Premium/Mid-range/Budget/etc",
    "target_demographic": "Who this brand targets",
    "brand_personality": ["3-5 personality traits derived from site"],
    "visual_identity_notes": "What you observe about their visual style",
    "competitor_comparison": "What tier/type of brand this is similar to"
  },
  
  "design_decisions": {
    "overall_aesthetic": "One phrase describing the email aesthetic (e.g., 'minimalist luxury', 'bold and playful', 'editorial sophistication')",
    
    "color_palette": {
      "primary_accent": "#hexcode - main brand/product color for highlights",
      "secondary_accent": "#hexcode - complementary accent",
      "background_main": "#hexcode - email body background",
      "background_alt": "#hexcode - alternate section background",
      "text_primary": "#hexcode - main body text",
      "text_secondary": "#hexcode - muted/secondary text",
      "text_on_dark": "#hexcode - text color for dark backgrounds",
      "button_bg": "#hexcode - CTA button background",
      "button_text": "#hexcode - CTA button text",
      "border_color": "#hexcode - subtle borders/dividers"
    },
    
    "typography": {
      "headline_font": "Font stack for headlines (must be web-safe with fallbacks)",
      "headline_style": "normal/italic",
      "headline_weight": "300/400/500/600/700",
      "headline_case": "none/uppercase/capitalize",
      "headline_letter_spacing": "0/1px/2px/3px etc",
      
      "body_font": "Font stack for body text (must be web-safe with fallbacks)",
      "body_weight": "300/400/500",
      "body_line_height": "1.5/1.6/1.7/1.8 etc",
      
      "accent_font": "Font for labels/tags (must be web-safe)",
      "accent_style": "uppercase/lowercase/capitalize",
      "accent_letter_spacing": "1px/2px/3px etc"
    },
    
    "layout": {
      "max_width": "550/580/600 - email container width",
      "padding_outer": "20/30/40/50px - outer padding",
      "padding_sections": "30/40/50/60px - between sections",
      "alignment": "center/left - overall text alignment",
      "image_style": "full-bleed/padded - how images are displayed",
      "section_dividers": "none/thin-line/thick-line/spacing-only"
    },
    
    "buttons": {
      "style": "solid/outline/minimal",
      "shape": "square/slightly-rounded/rounded/pill",
      "border_radius": "0/4/8/12/24/50px",
      "padding": "12px 30px / 14px 40px / 16px 50px etc",
      "text_case": "uppercase/capitalize/none",
      "letter_spacing": "0/1px/2px/3px"
    },
    
    "spacing": {
      "tight": "Use compact spacing throughout",
      "generous": "Use generous whitespace",
      "balanced": "Standard balanced spacing"
    },
    
    "mood": {
      "tone_words": ["3-5 words describing the email feeling"],
      "avoid": ["Things that would NOT fit this brand"]
    }
  },
  
  "copywriting_direction": {
    "headline_approach": "How headlines should be written for this brand",
    "voice_tone": "Description of writing voice",
    "vocabulary_level": "Simple/Sophisticated/Technical/Casual etc",
    "cta_style": "How CTAs should sound (e.g., 'Shop Now' vs 'Discover' vs 'Get Yours')",
    "sample_headline": "A headline you would write for this specific email",
    "sample_preheader": "Preheader text for inbox preview (under 100 chars)"
  }
}

## ANALYSIS INSTRUCTIONS
1. Study the brand's website colors, fonts, imagery style, and copy tone
2. Look at how they present themselves - luxury? casual? edgy? classic?
3. Match your design decisions to feel native to this brand
4. Be specific with hex codes - derive them from the actual product/brand colors
5. Typography must use web-safe fonts but style them to match the brand feel`;

// ============================================================================
// CALL 2: EMAIL GENERATION PROMPT
// This prompt has NO design opinions - it just executes the design decisions
// ============================================================================
const EMAIL_GENERATION_PROMPT = `You are an HTML email developer. You will receive:
1. Structured product data
2. Specific design decisions made by a creative director

Your job is to EXECUTE these design decisions precisely in Gmail-safe HTML.

## TECHNICAL REQUIREMENTS (NON-NEGOTIABLE)

1. **Inline CSS Only**: Gmail strips <style> blocks. Every element needs style="..."
2. **Table Layout**: Use nested tables with role="presentation"
3. **Max Width**: Use the width specified in design_decisions.layout.max_width
4. **Font Stacks**: Use exactly what's specified in design_decisions.typography
5. **Colors**: Use exactly the hex codes from design_decisions.color_palette
6. **Buttons**: Style exactly per design_decisions.buttons specs
7. **Table Attributes**: Always include cellspacing="0" cellpadding="0" border="0"
8. **Images**: 
   - Set width as both attribute AND in style
   - Add style="display: block;" to prevent gaps
   - Include meaningful alt text
9. **No Background Images**: Use background-color only

## EMAIL STRUCTURE

Build the email with these sections:
1. Hidden preheader text (use copywriting_direction.sample_preheader)
2. Top banner if there's a promotion/free shipping
3. Brand logo centered
4. Hero image (full width per layout.image_style)
5. Category label (use accent font styling)
6. Headline (use copywriting_direction.sample_headline or similar)
7. Body copy (1-2 sentences max)
8. Feature tags (inline with middot separators)
9. Price display
10. CTA button (styled per design_decisions.buttons)
11. Secondary image if available
12. "Complete the Look" section if matching_products exists
13. Footer with links

## OUTPUT FORMAT
Return ONLY the complete HTML:
- Start with <!DOCTYPE html>
- End with </html>
- No markdown, no explanations, no code blocks
- Production-ready HTML that can be sent immediately`;

// ============================================================================
// HTML SCRAPER FUNCTION
// ============================================================================
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
    
    // Keep JSON-LD scripts, remove others
    $('script[type!="application/ld+json"], style, noscript, iframe').remove();
    
    // Extract JSON-LD data
    const jsonLdData = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        jsonLdData.push(json);
      } catch (e) {}
    });
    
    // Extract images with context
    const images = [];
    const seenUrls = new Set();
    
    $('img').each((_, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src') || '';
      const alt = $(el).attr('alt') || '';
      
      if (src.startsWith('//')) src = 'https:' + src;
      if (!src.startsWith('http')) return;
      if (src.includes('icon') || src.includes('badge') || src.includes('payment')) return;
      if (src.includes('1x1') || src.includes('pixel') || src.includes('spacer')) return;
      
      // Normalize Shopify URLs
      let normalizedSrc = src;
      if (src.includes('cdn.shopify')) {
        normalizedSrc = src.replace(/&width=\d+/, '&width=600');
        if (!normalizedSrc.includes('width=')) {
          normalizedSrc = normalizedSrc.includes('?') 
            ? normalizedSrc + '&width=600' 
            : normalizedSrc + '?width=600';
        }
      }
      
      const baseUrl = normalizedSrc.split('?')[0];
      if (seenUrls.has(baseUrl)) return;
      seenUrls.add(baseUrl);
      
      images.push({ url: normalizedSrc, alt });
    });
    
    // Extract meta tags
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    
    // Get page title
    const title = $('title').text().trim();
    
    // Get body text
    $('script, svg').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    
    return {
      success: true,
      data: {
        url,
        title,
        metaDescription,
        ogImage,
        ogTitle,
        jsonLdData,
        images: images.slice(0, 15),
        bodyText: bodyText.substring(0, 6000)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// CALL 1: EXTRACT DATA + MAKE DESIGN DECISIONS
// ============================================================================
async function extractDataAndDesign(scrapedData) {
  const userPrompt = `Analyze this ecommerce product page. Extract all product/brand data AND make design decisions for an email that perfectly matches this brand's identity.

## PAGE URL
${scrapedData.url}

## PAGE TITLE
${scrapedData.title}

## META DESCRIPTION
${scrapedData.metaDescription}

## OG IMAGE
${scrapedData.ogImage}

## JSON-LD DATA
${JSON.stringify(scrapedData.jsonLdData, null, 2)}

## IMAGES FOUND
${scrapedData.images.map((img, i) => `${i + 1}. ${img.url} (alt: ${img.alt})`).join('\n')}

## PAGE CONTENT
${scrapedData.bodyText}

Study this brand carefully. Your design decisions should make the email feel like it was created by this brand's in-house team.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 5000,
    system: DATA_AND_DESIGN_EXTRACTION_PROMPT,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  });

  const textContent = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');
  
  // Parse JSON
  let cleanJson = textContent.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }
  
  try {
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error('Failed to parse extracted data:', e);
    console.error('Raw response:', textContent);
    throw new Error('Failed to parse product data from AI response');
  }
}

// ============================================================================
// CALL 2: GENERATE EMAIL HTML (PURE EXECUTION)
// ============================================================================
async function generateEmailHtml(extractedData, emailCount, promotion) {
  let userPrompt = `Generate ${emailCount} promotional email(s) using EXACTLY these specifications.

## PRODUCT DATA
${JSON.stringify({
  product: extractedData.product,
  description: extractedData.description,
  images: extractedData.images,
  brand: extractedData.brand,
  promotions: extractedData.promotions,
  matching_products: extractedData.matching_products
}, null, 2)}

## DESIGN SPECIFICATIONS (FOLLOW EXACTLY)
${JSON.stringify(extractedData.design_decisions, null, 2)}

## COPYWRITING DIRECTION
${JSON.stringify(extractedData.copywriting_direction, null, 2)}

## BRAND CONTEXT
${JSON.stringify(extractedData.brand_analysis, null, 2)}`;

  if (promotion) {
    userPrompt += `

## ADDITIONAL PROMOTION TO FEATURE
${promotion}`;
    
    // Calculate discount if applicable
    const percentMatch = promotion.match(/(\d+)%/);
    if (percentMatch && extractedData.product?.price) {
      const percent = parseInt(percentMatch[1]);
      const priceNum = parseFloat(extractedData.product.price.replace(/[^0-9.]/g, ''));
      if (!isNaN(priceNum)) {
        const discounted = (priceNum * (1 - percent / 100)).toFixed(2);
        userPrompt += `
Original: ${extractedData.product.price} → Sale: $${discounted}`;
      }
    }
  }

  if (emailCount > 1) {
    userPrompt += `

## MULTIPLE EMAIL VARIATIONS
Generate ${emailCount} emails. Each should follow the same design system but vary:
- Headline/copy angle
- Image selection (use different images from the set)
- Slight layout variations within the same aesthetic

Separate each email with: <!-- EMAIL_SEPARATOR -->`;
  }

  userPrompt += `

Execute these specifications precisely. Generate production-ready HTML now.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    system: EMAIL_GENERATION_PROMPT,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  });

  return response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}

// ============================================================================
// MAIN API ROUTE
// ============================================================================
export async function POST(request) {
  try {
    const { productUrl, emailCount = 1, promotion } = await request.json();
    
    if (!productUrl) {
      return Response.json({ error: 'Product URL is required' }, { status: 400 });
    }
    
    // Step 1: Scrape the page
    console.log('Step 1: Fetching product page...');
    const scrapeResult = await fetchProductPage(productUrl);
    
    if (!scrapeResult.success) {
      return Response.json({ 
        error: `Failed to fetch product page: ${scrapeResult.error}` 
      }, { status: 400 });
    }
    
    // Step 2: Extract data AND determine design (Call 1)
    console.log('Step 2: Analyzing brand & making design decisions (API Call 1)...');
    let extractedData;
    try {
      extractedData = await extractDataAndDesign(scrapeResult.data);
    } catch (e) {
      return Response.json({ 
        error: `Failed to analyze brand: ${e.message}` 
      }, { status: 500 });
    }
    
    // Step 3: Generate email using the design decisions (Call 2)
    console.log('Step 3: Generating email HTML (API Call 2)...');
    const emailHtml = await generateEmailHtml(extractedData, emailCount, promotion);
    
    return Response.json({ 
      success: true, 
      content: emailHtml,
      productData: {
        name: extractedData.product?.full_name || extractedData.product?.name,
        price: extractedData.product?.price,
        brand: extractedData.brand?.name,
        imageCount: (extractedData.images?.additional?.length || 0) + 2
      },
      // Include design decisions so frontend can display them
      designDecisions: extractedData.design_decisions,
      brandAnalysis: extractedData.brand_analysis,
      copywritingDirection: extractedData.copywriting_direction
    });

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate emails' 
    }, { status: 500 });
  }
}

export { extractDataAndDesign, generateEmailHtml, fetchProductPage };
