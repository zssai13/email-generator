'use client';

import { useState } from 'react';

export default function Home() {
  const [productUrl, setProductUrl] = useState('');
  const [emailCount, setEmailCount] = useState('2');
  const [promotion, setPromotion] = useState('');
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('');
  const [productData, setProductData] = useState(null);

  const parseEmails = (text) => {
    let blocks = text.split(/<!-- ?EMAIL_SEPARATOR ?-->/gi)
      .filter(block => block.includes('<!DOCTYPE html>') || block.includes('<!doctype html>'));
    
    if (blocks.length === 0) {
      const htmlMatches = text.match(/<\!DOCTYPE html>[\s\S]*?<\/html>/gi);
      if (htmlMatches) blocks = htmlMatches;
    }

    return blocks.map((block, index) => {
      const styleMatch = block.match(/<!-- ?(MINIMAL LUXURY|TROPICAL VIBRANT|EDITORIAL|MAGAZINE|PLAYFUL FRESH|[\w\s]+) ?-->/i);
      let styleName = styleMatch ? styleMatch[1].trim() : `Style ${index + 1}`;
      
      const htmlMatch = block.match(/(<\!DOCTYPE html>[\s\S]*<\/html>)/i);
      const html = htmlMatch ? htmlMatch[1].trim() : block.trim();
      
      return { id: index + 1, description: styleName, html };
    }).filter(e => e.html.length > 100);
  };

  const generateEmails = async () => {
    if (!productUrl.trim()) {
      setError('Please enter a product URL');
      return;
    }

    setLoading(true);
    setError('');
    setEmails([]);
    setSelectedEmail(null);
    setProductData(null);
    setStatus('Fetching product page...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl, emailCount, promotion })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to generate');
      }

      setStatus('Parsing emails...');
      setProductData(data.productData);
      
      const parsed = parseEmails(data.content);
      if (parsed.length === 0) {
        throw new Error('Could not parse emails from response');
      }
      
      setEmails(parsed);
      setSelectedEmail(parsed[0]);
      setStatus('');
    } catch (err) {
      setError(err.message);
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const copyHtml = async (html) => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadHtml = (email) => {
    const blob = new Blob([email.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-${email.id}-${email.description.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-5 px-4 shadow-xl">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
            <span className="text-3xl">✉️</span> 
            Email Template Generator
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real page fetching • Gmail-safe HTML • Multiple styles</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Product URL
              </label>
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://www.store.com/products/example"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Emails
              </label>
              <select
                value={emailCount}
                onChange={(e) => setEmailCount(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm bg-white transition-all cursor-pointer"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Promotion (optional)
              </label>
              <input
                type="text"
                value={promotion}
                onChange={(e) => setPromotion(e.target.value)}
                placeholder="e.g., 20% off, flash sale 12 hours"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm transition-all"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              onClick={generateEmails}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-bold uppercase tracking-wide rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                '🚀 Generate Emails'
              )}
            </button>
            
            {status && (
              <span className="text-sm text-slate-500 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                {status}
              </span>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}

          {productData && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-sm">
              <div className="font-semibold text-green-800 mb-1">✓ Product data extracted:</div>
              <div className="text-green-700">
                {productData.title} • {productData.price} • {productData.imageCount} images found
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {emails.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sticky top-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>✨</span> Generated Emails
                </h2>
                <div className="space-y-2">
                  {emails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`w-full text-left p-4 rounded-xl transition-all ${
                        selectedEmail?.id === email.id
                          ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-2 border-slate-100'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                        Option {email.id}
                      </div>
                      <div className="text-sm font-medium mt-1">
                        {email.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="lg:col-span-9">
              {selectedEmail && (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-100 bg-slate-50">
                    <div>
                      <h2 className="font-bold text-slate-800 text-lg">{selectedEmail.description}</h2>
                      <p className="text-xs text-slate-500">Option {selectedEmail.id} • Gmail-ready HTML</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyHtml(selectedEmail.html)}
                        className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                          copied 
                            ? 'bg-green-500 text-white' 
                            : 'border-2 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {copied ? '✓ Copied!' : '📋 Copy'}
                      </button>
                      <button
                        onClick={() => downloadHtml(selectedEmail)}
                        className="px-5 py-2.5 text-sm font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
                      >
                        ⬇ Download
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-b from-slate-100 to-slate-50">
                    <div className="max-w-[620px] mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
                      <iframe
                        srcDoc={selectedEmail.html}
                        title="Email Preview"
                        className="w-full border-0"
                        style={{ height: '700px' }}
                      />
                    </div>
                  </div>

                  <details className="border-t-2 border-slate-100">
                    <summary className="p-4 cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50">
                      &lt;/&gt; View HTML Source
                    </summary>
                    <div className="p-4 bg-slate-900 overflow-auto max-h-80">
                      <pre className="text-xs text-emerald-400 whitespace-pre-wrap font-mono">
                        {selectedEmail.html}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && emails.length === 0 && !error && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-4">📧</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to generate</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              Paste any ecommerce product URL. The app will fetch the real page data including images, then generate Gmail-ready HTML emails.
            </p>
            <div className="inline-block px-4 py-2 bg-slate-100 rounded-lg text-xs text-slate-600 font-mono">
              Works with Shopify, WooCommerce, BigCommerce, and more
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
