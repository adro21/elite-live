require('dotenv').config();
const puppeteer = require('puppeteer');

async function debugAlendel() {
  console.log('🐛 Debug: Starting Alendel login test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 2000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  
  try {
    console.log('🐛 Debug: Navigating to Alendel login page...');
    await page.goto('https://www.alendel.com/login?returnUrl=%2F', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    console.log('🐛 Debug: Page loaded, checking for login form...');
    
    // Check what selectors are available
    const emailField = await page.$('#Email');
    const passwordField = await page.$('#Password');
    const submitButton = await page.$('button[type="submit"]');
    
    console.log('🐛 Debug: Form elements found:');
    console.log('  Email field:', emailField ? '✅ Found' : '❌ Not found');
    console.log('  Password field:', passwordField ? '✅ Found' : '❌ Not found');
    console.log('  Submit button:', submitButton ? '✅ Found' : '❌ Not found');
    
    // Check current URL
    console.log('🐛 Debug: Current URL:', page.url());
    
    // Try to inspect the actual form structure
    const formHTML = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.outerHTML.substring(0, 500) : 'No form found';
    });
    console.log('🐛 Debug: Form HTML snippet:', formHTML);
    
    if (emailField && passwordField && submitButton) {
      console.log('🐛 Debug: All elements found, attempting login...');
      
      await page.type('#Email', 'agnes@elitewf.com');
      await page.type('#Password', 'elitewf2025');
      
      console.log('🐛 Debug: Credentials entered, clicking submit...');
      
      // Click and wait for response
      await Promise.all([
        page.waitForNavigation({ 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        }),
        page.click('button[type="submit"]')
      ]);
      
      console.log('🐛 Debug: Login submitted, checking result...');
      console.log('🐛 Debug: New URL:', page.url());
      
      // Check if we can find the search box
      const searchBox = await page.$('#small-searchterms');
      console.log('🐛 Debug: Search box found:', searchBox ? '✅ Found' : '❌ Not found');
      
      if (searchBox) {
        console.log('🐛 Debug: ✅ Login successful! Search box is available.');
      } else {
        console.log('🐛 Debug: ❌ Login may have failed - no search box found.');
        
        // Check for error messages
        const errorMsg = await page.evaluate(() => {
          const errors = document.querySelectorAll('.text-danger, .alert-danger, .error');
          return Array.from(errors).map(el => el.textContent).join(', ');
        });
        
        if (errorMsg) {
          console.log('🐛 Debug: Error messages found:', errorMsg);
        }
      }
      
    } else {
      console.log('🐛 Debug: ❌ Cannot proceed - missing form elements');
    }
    
    console.log('🐛 Debug: Keeping browser open for manual inspection...');
    console.log('🐛 Debug: Press Ctrl+C to close when done inspecting');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.log('🐛 Debug: Error occurred:', error.message);
    await browser.close();
  }
}

debugAlendel();