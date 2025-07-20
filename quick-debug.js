require('dotenv').config();
const puppeteer = require('puppeteer');

async function quickDebug() {
  console.log('🚀 Quick Debug: Starting fast inspection...');
  
  const browser = await puppeteer.launch({
    headless: true, // Run fast in background
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Quick login (using same method as working scraper)
    console.log('⚡ Logging in...');
    await page.goto('https://www.alendel.com/login?returnUrl=%2F', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.waitForSelector('#Email', { timeout: 15000 });
    
    // Clear fields first
    await page.click('#Email');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Delete');
    
    await page.type('#Email', 'agnes@elitewf.com');
    await page.type('#Password', 'elitewf2025');
    
    // Try login with fallback
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
        page.click('button[type="submit"]')
      ]);
    } catch (navError) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Quick search
    console.log('⚡ Searching...');
    await page.waitForSelector('#small-searchterms');
    await page.click('#small-searchterms');
    await page.evaluate(() => document.querySelector('#small-searchterms').value = '');
    await page.type('#small-searchterms', 'EMPIRE VOILE 130');
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    
    console.log('⚡ Analyzing page structure...');
    
    // Get page structure info quickly
    const pageInfo = await page.evaluate(() => {
      const info = {
        url: window.location.href,
        pageTitle: document.title,
        pageSizeSelectors: [],
        productStructure: [],
        skuElements: []
      };
      
      // Check page size selectors
      const pageSizeSelectors = ['#products-pagesize', '.page-size-selector', 'select[name="pagesize"]', 'select'];
      pageSizeSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          const options = element.tagName === 'SELECT' ? 
            Array.from(element.options).map(opt => ({ value: opt.value, text: opt.textContent.trim() })) : 
            [];
          info.pageSizeSelectors.push({ selector, found: true, options });
        }
      });
      
      // Check product structure
      const productSelectors = ['.item-box', '.product-item', '.product', '.item', '.product-wrapper'];
      productSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          info.productStructure.push({ 
            selector, 
            count: elements.length,
            firstElementClass: elements[0].className,
            hasSkuChild: !!elements[0].querySelector('.sku')
          });
        }
      });
      
      // Find all .sku elements and their content
      const skuElements = document.querySelectorAll('.sku');
      info.skuElements = Array.from(skuElements).slice(0, 10).map(el => ({
        text: el.textContent.trim(),
        parentClass: el.parentElement.className
      }));
      
      return info;
    });
    
    console.log('📋 RESULTS:');
    console.log('URL:', pageInfo.url);
    console.log('Page Title:', pageInfo.pageTitle);
    console.log('\n📏 PAGE SIZE SELECTORS:');
    pageInfo.pageSizeSelectors.forEach(ps => {
      console.log(`  ${ps.selector}: Found with options:`, ps.options);
    });
    
    console.log('\n🎯 PRODUCT STRUCTURE:');
    pageInfo.productStructure.forEach(ps => {
      console.log(`  ${ps.selector}: ${ps.count} elements, hasSkuChild: ${ps.hasSkuChild}`);
    });
    
    console.log('\n🏷️ SKU ELEMENTS (first 10):');
    pageInfo.skuElements.forEach((sku, index) => {
      console.log(`  ${index + 1}. "${sku.text}" (parent: ${sku.parentClass})`);
    });
    
    if (pageInfo.skuElements.some(sku => sku.text.includes('EMPIRE') && sku.text.includes('CHAMPAGNE'))) {
      console.log('\n✅ FOUND MATCHING SKU!');
    } else {
      console.log('\n❌ No matching SKU found on this page');
    }
    
    await browser.close();
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    await browser.close();
  }
}

quickDebug();