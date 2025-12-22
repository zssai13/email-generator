import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

const client = new Anthropic();

// ============================================================================
// HTML SCRAPER - COMPREHENSIVE DATA EXTRACTION
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

    // ========== JSON-LD STRUCTURED DATA ==========
    const jsonLdData = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        jsonLdData.push(json);
      } catch (e) {}
    });

    // ========== META TAGS ==========
    const meta = {
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      keywords: $('meta[name="keywords"]').attr('content') || '',
      ogTitle: $('meta[property="og:title"]').attr('content') || '',
      ogDescription: $('meta[property="og:description"]').attr('content') || '',
      ogImage: $('meta[property="og:image"]').attr('content') || '',
      ogSiteName: $('meta[property="og:site_name"]').attr('content') || '',
      twitterCard: $('meta[name="twitter:card"]').attr('content') || '',
      twitterImage: $('meta[name="twitter:image"]').attr('content') || '',
    };

    // ========== ALL IMAGES ==========
    const images = [];
    const seenUrls = new Set();

    $('img').each((_, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || '';
      const alt = $(el).attr('alt') || '';
      const title = $(el).attr('title') || '';
      const width = $(el).attr('width') || '';
      const height = $(el).attr('height') || '';

      if (src.startsWith('//')) src = 'https:' + src;
      if (!src.startsWith('http')) return;

      // Skip obvious non-product images
      if (src.includes('icon') || src.includes('badge') || src.includes('payment')) return;
      if (src.includes('1x1') || src.includes('pixel') || src.includes('spacer')) return;
      if (src.includes('loader') || src.includes('spinner')) return;

      // Normalize Shopify URLs to get better resolution
      let normalizedSrc = src;
      if (src.includes('cdn.shopify')) {
        normalizedSrc = src.replace(/&width=\d+/, '&width=800');
        if (!normalizedSrc.includes('width=')) {
          normalizedSrc = normalizedSrc.includes('?') 
            ? normalizedSrc + '&width=800' 
            : normalizedSrc + '?width=800';
        }
      }

      const baseUrl = normalizedSrc.split('?')[0];
      if (seenUrls.has(baseUrl)) return;
      seenUrls.add(baseUrl);

      images.push({ 
        url: normalizedSrc, 
        alt,
        title,
        width,
        height,
        isProduct: src.includes('product') || src.includes('/files/') || src.includes('cdn.shopify'),
        isLogo: src.toLowerCase().includes('logo')
      });
    });

    // ========== ALL LINKS ==========
    const links = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().substring(0, 100);
      if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
        let fullHref = href;
        if (href.startsWith('/')) {
          try {
            const urlObj = new URL(url);
            fullHref = `${urlObj.protocol}//${urlObj.host}${href}`;
          } catch (e) {}
        }
        links.push({ href: fullHref, text });
      }
    });

    // ========== CSS/STYLE EXTRACTION ==========
    const styles = [];
    $('style').each((_, el) => {
      styles.push($(el).html());
    });

    const inlineStyles = [];
    $('[style]').each((_, el) => {
      inlineStyles.push({
        tag: el.tagName,
        style: $(el).attr('style')
      });
    });

    // ========== COLOR EXTRACTION FROM CSS ==========
    const colorMatches = new Set();
    const allStyles = styles.join(' ') + ' ' + inlineStyles.map(s => s.style).join(' ');
    const hexColors = allStyles.match(/#[0-9A-Fa-f]{3,6}\b/g) || [];
    const rgbColors = allStyles.match(/rgb\([^)]+\)/g) || [];
    hexColors.forEach(c => colorMatches.add(c.toLowerCase()));
    rgbColors.forEach(c => colorMatches.add(c));

    // ========== FONT EXTRACTION ==========
    const fontMatches = new Set();
    const fontFamilies = allStyles.match(/font-family:\s*([^;]+)/gi) || [];
    fontFamilies.forEach(f => fontMatches.add(f.replace(/font-family:\s*/i, '').trim()));

    // ========== STRUCTURED CONTENT EXTRACTION ==========
    // Remove scripts and styles for text extraction
    const $clean = cheerio.load(html);
    $clean('script, style, noscript, iframe, svg').remove();

    // Get specific sections
    const sections = {
      header: $clean('header').text().replace(/\s+/g, ' ').trim().substring(0, 1000),
      nav: $clean('nav').text().replace(/\s+/g, ' ').trim().substring(0, 500),
      main: $clean('main, [role="main"], .main-content, #main').text().replace(/\s+/g, ' ').trim().substring(0, 3000),
      footer: $clean('footer').text().replace(/\s+/g, ' ').trim().substring(0, 1000),
      product: $clean('.product, .product-page, [data-product], #product, .pdp').text().replace(/\s+/g, ' ').trim().substring(0, 2000),
    };

    // Full body text
    const bodyText = $clean('body').text().replace(/\s+/g, ' ').trim();

    // ========== PRICE EXTRACTION ==========
    const pricePatterns = [];
    const priceRegex = /\$[\d,]+\.?\d*/g;
    const priceMatches = bodyText.match(priceRegex) || [];
    priceMatches.forEach(p => pricePatterns.push(p));

    // ========== SOCIAL LINKS ==========
    const socialLinks = [];
    $('a[href*="instagram"], a[href*="facebook"], a[href*="twitter"], a[href*="tiktok"], a[href*="pinterest"], a[href*="youtube"]').each((_, el) => {
      socialLinks.push($(el).attr('href'));
    });

    // ========== BRAND/LOGO DETECTION ==========
    let logoUrl = '';
    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      const alt = $(el).attr('alt') || '';
      const className = $(el).attr('class') || '';
      if (src.toLowerCase().includes('logo') || alt.toLowerCase().includes('logo') || className.toLowerCase().includes('logo')) {
        logoUrl = src.startsWith('//') ? 'https:' + src : src;
        return false; // break
      }
    });

    // ========== DOMAIN INFO ==========
    let domain = '';
    let brandFromDomain = '';
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
      brandFromDomain = domain.replace('www.', '').split('.')[0];
      brandFromDomain = brandFromDomain.charAt(0).toUpperCase() + brandFromDomain.slice(1);
    } catch (e) {}

    return {
      success: true,
      data: {
        url,
        domain,
        brandFromDomain,
        meta,
        jsonLdData,
        images: images.slice(0, 20),
        logoUrl,
        links: links.slice(0, 50),
        socialLinks: [...new Set(socialLinks)],
        colors: [...colorMatches].slice(0, 30),
        fonts: [...fontMatches].slice(0, 10),
        prices: [...new Set(pricePatterns)].slice(0, 5),
        sections,
        bodyText: bodyText.substring(0, 8000)
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
// MAIN API ROUTE
// ============================================================================
export async function POST(request) {
  try {
    const { productUrl } = await request.json();

    if (!productUrl) {
      return Response.json({ error: 'Product URL is required' }, { status: 400 });
    }

    // Fetch and extract all available data from the page
    console.log('Fetching product page...');
    const scrapeResult = await fetchProductPage(productUrl);

    if (!scrapeResult.success) {
      return Response.json({ 
        error: `Failed to fetch product page: ${scrapeResult.error}` 
      }, { status: 400 });
    }

    // Single API call with all data and minimal instruction
    console.log('Generating email...');
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        { 
          role: 'user', 
          content: `Create a beautiful promotional ecommerce email for this product.

${JSON.stringify(scrapeResult.data, null, 2)}` 
        }
      ]
    });

    const emailHtml = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return Response.json({ 
      success: true, 
      content: emailHtml,
      scrapedData: scrapeResult.data
    });

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate email' 
    }, { status: 500 });
  }
}

export { fetchProductPage };