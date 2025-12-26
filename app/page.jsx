'use client';

import { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('generator');
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
  
  // State for Tab 2: Template-based email generator
  const [templateProductUrl, setTemplateProductUrl] = useState('');
  const [emailTemplateFile, setEmailTemplateFile] = useState(null);
  const [emailTemplateContent, setEmailTemplateContent] = useState('');
  const [templateFileName, setTemplateFileName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-opus-4-5');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [templateStatus, setTemplateStatus] = useState('');
  const [generatedTemplateEmail, setGeneratedTemplateEmail] = useState(null);
  const [templateCopied, setTemplateCopied] = useState(false);
  const [templateUsage, setTemplateUsage] = useState(null);

  // Model options for dropdown
  const modelOptions = [
    { value: 'claude-opus-4-5', label: 'Claude Opus 4.5', provider: 'anthropic' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic' },
    { value: 'gpt-4o', label: 'ChatGPT-4o', provider: 'openai' },
    { value: 'gpt-4o-mini', label: 'ChatGPT-4o Mini', provider: 'openai' },
    { value: 'gpt-4o-extract-mini-generate', label: 'GPT-4o Extract + Mini Generate', provider: 'openai-hybrid' },
    { value: 'claude-sonnet-extract-mini-generate', label: 'Claude Sonnet Extract + Mini Generate', provider: 'claude-hybrid' },
    { value: 'claude-haiku-extract-mini-generate', label: 'Claude Haiku Extract + Mini Generate', provider: 'claude-hybrid' },
    { value: 'manual-extract-mini-refine-generate', label: 'Manual Extract + Mini Refine + Generate (Cheapest)', provider: 'manual-hybrid' }
  ];

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

  // File upload handler for Tab 2
  const handleTemplateFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setEmailTemplateFile(null);
      setEmailTemplateContent('');
      setTemplateFileName('');
      return;
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
      setTemplateError('Please upload a valid HTML file (.html or .htm)');
      event.target.value = ''; // Clear the input
      return;
    }

    setEmailTemplateFile(file);
    setTemplateFileName(file.name);
    setTemplateError('');
    setGeneratedTemplateEmail(null); // Clear previous results

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      
      // Client-side HTML validation
      if (!content || typeof content !== 'string') {
        setTemplateError('Failed to read file content');
        return;
      }

      // Check if it contains HTML tags
      const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
      const hasStructure = /<!DOCTYPE\s+html/i.test(content) || /<html/i.test(content);

      if (!hasHtmlTags || !hasStructure) {
        setTemplateError('The uploaded file does not appear to be valid HTML. It should contain HTML tags and either a DOCTYPE declaration or html tag structure.');
        setEmailTemplateFile(null);
        setEmailTemplateContent('');
        setTemplateFileName('');
        event.target.value = '';
        return;
      }

      setEmailTemplateContent(content);
    };

    reader.onerror = () => {
      setTemplateError('Error reading file. Please try again.');
      setEmailTemplateFile(null);
      setEmailTemplateContent('');
      setTemplateFileName('');
    };

    reader.readAsText(file);
  };

  // Generate template-based email
  const generateTemplateEmail = async () => {
    // Validation
    if (!templateProductUrl.trim()) {
      setTemplateError('Please enter a product URL');
      return;
    }

    // Validate URL format
    try {
      new URL(templateProductUrl.trim());
    } catch {
      setTemplateError('Please enter a valid URL (must start with http:// or https://)');
      return;
    }

    if (!emailTemplateContent.trim()) {
      setTemplateError('Please upload an HTML email template');
      return;
    }

    setTemplateLoading(true);
    setTemplateError('');
    setGeneratedTemplateEmail(null);
    setTemplateUsage(null); // Clear previous usage data
    const selectedModelLabel = modelOptions.find(m => m.value === selectedModel)?.label || selectedModel;
    
    // Show different status for hybrid approach
    if (selectedModel === 'gpt-4o-extract-mini-generate') {
      setTemplateStatus('Step 1: Extracting product data with GPT-4o...');
    } else if (selectedModel === 'claude-sonnet-extract-mini-generate') {
      setTemplateStatus('Step 1: Extracting product data with Claude Sonnet...');
    } else if (selectedModel === 'claude-haiku-extract-mini-generate') {
      setTemplateStatus('Step 1: Extracting product data with Claude Haiku...');
    } else if (selectedModel === 'manual-extract-mini-refine-generate') {
      setTemplateStatus('Step 1: Manually extracting product data...');
    } else {
      setTemplateStatus(`Generating with ${selectedModelLabel}...`);
    }
    setTemplateCopied(false); // Reset copy state

    try {
      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productUrl: templateProductUrl.trim(),
          emailTemplate: emailTemplateContent.trim(),
          customPrompt: customPrompt.trim(),
          model: selectedModel
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to generate email');
      }

      if (!data.content || data.content.length < 100) {
        throw new Error('Generated email appears to be invalid or too short');
      }

      // Store usage/cost information
      if (data.usage) {
        setTemplateUsage(data.usage);
        console.log('📊 Token Usage & Cost:', {
          total_tokens: data.usage.total_tokens,
          input_tokens: data.usage.input_tokens,
          output_tokens: data.usage.output_tokens,
          estimated_cost_usd: `$${data.usage.estimated_cost_usd?.toFixed(6) || 'N/A'}`,
          breakdown: data.usage.breakdown || null
        });
      } else {
        setTemplateUsage(null);
      }

      setGeneratedTemplateEmail(data.content);
      setTemplateStatus('');
    } catch (err) {
      setTemplateError(err.message);
      setTemplateStatus('');
    } finally {
      setTemplateLoading(false);
    }
  };

  // Copy HTML for template email
  const copyTemplateHtml = async (html) => {
    await navigator.clipboard.writeText(html);
    setTemplateCopied(true);
    setTimeout(() => setTemplateCopied(false), 2000);
  };

  // Download HTML for template email
  const downloadTemplateHtml = (html) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-email-${Date.now()}.html`;
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
          
          {/* Tab Navigation */}
          <div className="mt-4 flex gap-1 border-b border-slate-700">
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-4 py-2 text-sm font-medium transition-all relative ${
                activeTab === 'generator'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Email Generator
              {activeTab === 'generator' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('new-feature')}
              className={`px-4 py-2 text-sm font-medium transition-all relative ${
                activeTab === 'new-feature'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              New Feature
              {activeTab === 'new-feature' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></span>
              )}
            </button>
          </div>
          
          <p className="text-slate-400 text-sm mt-3">Real page fetching • Gmail-safe HTML • Multiple styles</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Tab 1: Email Generator */}
        {activeTab === 'generator' && (
          <>
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
          </>
        )}

        {/* Tab 2: Template-based Email Generator */}
        {activeTab === 'new-feature' && (
          <>
            {/* Input Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    AI Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm bg-white transition-all cursor-pointer"
                  >
                    {modelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-8">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Product URL
                  </label>
                  <input
                    type="url"
                    value={templateProductUrl}
                    onChange={(e) => {
                      setTemplateProductUrl(e.target.value);
                      if (templateError && e.target.value.trim()) {
                        setTemplateError(''); // Clear error when user starts typing
                      }
                    }}
                    placeholder="https://www.store.com/products/example"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Email Template (HTML File)
                </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".html,.htm"
                      onChange={handleTemplateFileUpload}
                      className="hidden"
                      id="template-file-input"
                    />
                    <label
                      htmlFor="template-file-input"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent text-sm transition-all cursor-pointer bg-white hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span className="text-slate-600">
                        {templateFileName || 'Choose HTML file...'}
                      </span>
                      <span className="text-slate-400">📎</span>
                    </label>
                  </div>
                  {templateFileName && (
                    <p className="text-xs text-slate-500 mt-1">✓ {templateFileName}</p>
                  )}
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Custom Prompt (Optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => {
                    setCustomPrompt(e.target.value);
                    if (templateError) {
                      setTemplateError(''); // Clear error when user starts typing
                    }
                  }}
                  placeholder="e.g., Use a more casual tone, emphasize the discount, add urgency..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent text-sm transition-all resize-none"
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  onClick={generateTemplateEmail}
                  disabled={templateLoading}
                  className="px-8 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-bold uppercase tracking-wide rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {templateLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    '🚀 Generate Email'
                  )}
                </button>
                
                {templateStatus && (
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    {templateStatus}
                  </span>
                )}
              </div>

              {templateError && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm">
                  <strong>Error:</strong> {templateError}
                </div>
              )}
            </div>

            {/* Results */}
            {generatedTemplateEmail && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                {/* Token Usage & Cost Display */}
                {templateUsage && (
                  <div className="px-4 pt-4 pb-2 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-medium">Total Tokens:</span>
                        <span className="text-slate-800 font-bold">{templateUsage.total_tokens?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-medium">Cost:</span>
                        <span className="text-green-600 font-bold">
                          ${templateUsage.estimated_cost_usd?.toFixed(6) || '0.000000'}
                        </span>
                      </div>
                      {templateUsage.breakdown && (
                        <>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Extraction:</span>
                            <span className="font-semibold">${templateUsage.breakdown.extraction?.estimated_cost_usd?.toFixed(6) || '0.000000'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Generation:</span>
                            <span className="font-semibold">${templateUsage.breakdown.generation?.estimated_cost_usd?.toFixed(6) || '0.000000'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-100 bg-slate-50">
                  <div>
                    <h2 className="font-bold text-slate-800 text-lg">Generated Email</h2>
                    <p className="text-xs text-slate-500">Template-based • Gmail-ready HTML</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyTemplateHtml(generatedTemplateEmail)}
                      className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                        templateCopied 
                          ? 'bg-green-500 text-white' 
                          : 'border-2 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {templateCopied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                    <button
                      onClick={() => downloadTemplateHtml(generatedTemplateEmail)}
                      className="px-5 py-2.5 text-sm font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
                    >
                      ⬇ Download
                    </button>
                  </div>
                </div>
                
                <div className="p-6 bg-gradient-to-b from-slate-100 to-slate-50">
                  <div className="max-w-[620px] mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
                    <iframe
                      srcDoc={generatedTemplateEmail}
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
                      {generatedTemplateEmail}
                    </pre>
                  </div>
                </details>
              </div>
            )}

            {/* Empty State */}
            {!templateLoading && !generatedTemplateEmail && !templateError && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
                <div className="text-6xl mb-4">📧</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to generate</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                  Upload an HTML email template and provide a product URL. The app will use the template structure to create a new promotional email for the specified product.
                </p>
                <div className="inline-block px-4 py-2 bg-slate-100 rounded-lg text-xs text-slate-600 font-mono">
                  Template-based generation • Custom prompts • Gmail-ready HTML
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
