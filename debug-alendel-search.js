require('dotenv').config();
const puppeteer = require('puppeteer');

async function debugAlendelSearch() {
  console.log('🐛 Debug: Starting Alendel search inspection...');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 1000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  
  try {
    // Login first
    console.log('🐛 Debug: Logging in...');
    await page.goto('https://www.alendel.com/login?returnUrl=%2F', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    await page.waitForSelector('#Email', { timeout: 15000 });
    await page.type('#Email', 'agnes@elitewf.com');
    await page.type('#Password', 'elitewf2025');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('🐛 Debug: Login completed, current URL:', page.url());
    
    // Search for "EMPIRE VOILE 130"
    console.log('🐛 Debug: Searching for "EMPIRE VOILE 130"...');
    await page.waitForSelector('#small-searchterms', { timeout: 15000 });
    
    await page.click('#small-searchterms');
    await page.evaluate(() => {
      const searchInput = document.querySelector('#small-searchterms');
      if (searchInput) searchInput.value = '';
    });
    
    await page.type('#small-searchterms', 'EMPIRE VOILE 130');
    await page.keyboard.press('Enter');
    
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log('🐛 Debug: Search completed, current URL:', page.url());
    
    // Wait for results to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for page size selector
    console.log('🐛 Debug: Checking for page size selectors...');
    const pageSizeSelectors = ['#products-pagesize', '.page-size-selector', 'select[name="pagesize"]', 'select'];
    
    for (const selector of pageSizeSelectors) {
      const element = await page.$(selector);
      if (element) {
        const html = await page.evaluate(el => el.outerHTML, element);
        console.log(`🐛 Debug: Found selector ${selector}:`, html.substring(0, 200));
        
        // Try to get the options
        const options = await page.evaluate(el => {
          if (el.tagName === 'SELECT') {
            return Array.from(el.options).map(opt => ({ value: opt.value, text: opt.textContent }));
          }
          return [];
        }, element);
        console.log(`🐛 Debug: Options for ${selector}:`, options);
      }
    }
    
    // Check page structure
    console.log('🐛 Debug: Checking page structure...');
    const pageStructure = await page.evaluate(() => {
      const containers = ['.item-grid', '.products-wrapper', '.product-list', '.search-results'];
      const result = {};
      
      containers.forEach(container => {
        const elements = document.querySelectorAll(container);
        result[container] = elements.length;
        
        if (elements.length > 0) {
          result[container + '_html'] = elements[0].outerHTML.substring(0, 300);
        }
      });
      
      return result;
    });
    
    console.log('🐛 Debug: Page structure:', pageStructure);
    
    // Check for product elements
    console.log('🐛 Debug: Checking for product elements...');
    const productSelectors = ['.item-box', '.product-item', '.product', '.item'];
    
    for (const selector of productSelectors) {
      const elements = await page.$$(selector);
      console.log(`🐛 Debug: Found ${elements.length} elements with selector "${selector}"`);
      
      if (elements.length > 0) {
        const firstElementHtml = await page.evaluate(el => el.outerHTML.substring(0, 400), elements[0]);
        console.log(`🐛 Debug: First element HTML:`, firstElementHtml);
        
        // Look for .sku elements within
        const skuElements = await page.$$(`${selector} .sku`);
        console.log(`🐛 Debug: Found ${skuElements.length} .sku elements within ${selector}`);
        
        if (skuElements.length > 0) {
          const skuTexts = await Promise.all(
            skuElements.slice(0, 3).map(el => 
              page.evaluate(element => element.textContent.trim(), el)
            )
          );
          console.log(`🐛 Debug: First 3 SKU texts:`, skuTexts);
        }
      }
    }
    
    console.log('🐛 Debug: Inspection complete. Browser will stay open for manual review.');
    console.log('🐛 Debug: Check the search results and press Ctrl+C when done.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.log('🐛 Debug: Error occurred:', error.message);
    await browser.close();
  }
}

debugAlendelSearch();