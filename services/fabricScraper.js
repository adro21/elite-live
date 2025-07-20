const puppeteer = require('puppeteer');
const supplierConfigs = require('../config/suppliers');
const logger = require('./logger');

class FabricScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1366, height: 768 });
      
      // Set user agent to avoid bot detection
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      logger.info('Fabric scraper initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize fabric scraper:', error);
      throw error;
    }
  }

  async loginToUnique() {
    try {
      const config = supplierConfigs.unique;
      
      logger.info('Navigating to Unique login page');
      await this.page.goto(config.loginUrl, { waitUntil: 'networkidle2' });
      
      // Wait for login form to load
      await this.page.waitForSelector(config.usernameField, { timeout: 10000 });
      
      // Fill in credentials
      await this.page.type(config.usernameField, process.env.UNIQUE_USERNAME);
      await this.page.type(config.passwordField, process.env.UNIQUE_PASSWORD);
      
      // Click login button
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
        this.page.click(config.loginButton)
      ]);
      
      logger.info('Successfully logged into Unique portal');
      
      // Navigate to Fabric Collections
      await this.page.waitForSelector(config.postLoginNavigation.waitForSelector, { timeout: 10000 });
      
      const fabricCollectionsLink = await this.page.$(config.postLoginNavigation.fabricCollectionsSelector);
      if (fabricCollectionsLink) {
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
          fabricCollectionsLink.click()
        ]);
        logger.info('Navigated to Fabric Collections');
        
      } else {
        throw new Error('Could not find Fabric Collections link');
      }
      
    } catch (error) {
      logger.error('Error during Unique login:', error);
      throw error;
    }
  }

  async loginToAlendel() {
    try {
      const config = supplierConfigs.alendel;
      
      logger.info('Navigating to Alendel login page');
      await this.page.goto(config.loginUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // Wait a bit for page to fully load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Wait for login form to load
      await this.page.waitForSelector(config.usernameField, { timeout: 15000 });
      
      logger.info('Login form found, filling credentials');
      
      // Clear fields first
      await this.page.click(config.usernameField);
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Delete');
      
      // Fill in credentials
      await this.page.type(config.usernameField, 'agnes@elitewf.com');
      await this.page.type(config.passwordField, 'elitewf2025');
      
      logger.info('Credentials entered, clicking login button');
      
      // Click login button with improved error handling
      try {
        await Promise.all([
          this.page.waitForNavigation({ 
            waitUntil: 'domcontentloaded',
            timeout: 45000 
          }),
          this.page.click(config.loginButton)
        ]);
      } catch (navError) {
        logger.warn('Navigation after login click failed, checking if we are logged in anyway');
        // Sometimes the navigation promise fails but login succeeds
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      logger.info('Checking if login was successful');
      
      // Check if we're logged in by looking for the search input or other post-login elements
      try {
        await this.page.waitForSelector(config.postLoginNavigation.waitForSelector, { timeout: 15000 });
        logger.info('Successfully logged into Alendel portal');
      } catch (searchError) {
        // Check if we're on a different page but still logged in
        const currentUrl = this.page.url();
        logger.info(`Current URL after login attempt: ${currentUrl}`);
        
        if (currentUrl.includes('alendel.com') && !currentUrl.includes('login')) {
          logger.info('Login appears successful based on URL change');
          // Try to find search input with different selector
          const searchInput = await this.page.$('#small-searchterms');
          if (searchInput) {
            logger.info('Found search input, login confirmed');
          } else {
            throw new Error('Login may have failed - cannot find search input');
          }
        } else {
          throw new Error('Login failed - still on login page or redirected unexpectedly');
        }
      }
      
    } catch (error) {
      logger.error('Error during Alendel login:', error);
      throw error;
    }
  }


  async searchFabric(fabricData) {
    try {
      const config = supplierConfigs.unique;
      const { supplierCollection, supplierPattern, supplierColor } = fabricData;
      
      logger.info(`Searching for fabric: ${supplierCollection} - ${supplierPattern} - ${supplierColor}`);
      
      // Navigate to the specific collection
      await this.navigateToCollection(supplierCollection);
      
      // Wait a moment for page to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if we're already in a product listing page (like Loft)
      // If we see product links with colors directly, skip pattern search
      const productLinks = await this.page.$$('a');
      let hasDirectProductColors = false;
      
      for (let link of productLinks) { // Check all links
        const linkText = await this.page.evaluate(el => el.textContent.trim(), link);
        if (linkText.includes('Color:')) {
          hasDirectProductColors = true;
          logger.info(`Found direct product color link: ${linkText.substring(0, 50)}...`);
          break;
        }
      }
      
      if (hasDirectProductColors) {
        logger.info(`Collection has direct product colors, skipping pattern search for ${supplierPattern}`);
        // Go directly to color search
        if (supplierColor && supplierColor.trim() !== '') {
          const colorFound = await this.findPatternOrColor(supplierColor);
          if (!colorFound) {
            logger.warn(`Color not found: ${supplierColor}`);
            await this.returnToCollectionsPage();
            return false; // Not found
          }
        } else {
          logger.warn(`No color specified for direct product collection`);
          await this.returnToCollectionsPage();
          return false; // Not found
        }
      } else {
        // Try to find the pattern first (for collections like Sheer Collective)
        const patternFound = await this.findPatternOrColor(supplierPattern);
        if (!patternFound) {
          logger.warn(`Pattern not found: ${supplierPattern}`);
          await this.returnToCollectionsPage();
          return false; // Not found
        }
        
        // If pattern found, now look for color (if color is specified)
        if (supplierColor && supplierColor.trim() !== '') {
          const colorFound = await this.findPatternOrColor(supplierColor);
          if (!colorFound) {
            logger.warn(`Color not found: ${supplierColor}`);
            await this.returnToCollectionsPage();
            return false; // Not found
          }
        }
      }
      
      // Extract ETA information
      const etaInfo = await this.extractETAInfo();
      
      logger.info(`Found ETA info for ${supplierPattern} - ${supplierColor}: ${etaInfo}`);
      
      // Return to collections page for next search
      await this.returnToCollectionsPage();
      return etaInfo;
      
    } catch (error) {
      logger.error(`Error searching for fabric ${fabricData.supplierPattern} - ${fabricData.supplierColor}:`, error);
      // Return to collections page for next search
      await this.returnToCollectionsPage();
      return false; // Error means not found
    }
  }

  async searchAlendelFabric(fabricData) {
    try {
      const config = supplierConfigs.alendel;
      const { supplierPattern, supplierColor } = fabricData;
      
      // Validate input data
      if (!supplierPattern || supplierPattern.trim() === '') {
        logger.warn('Empty supplier pattern provided, skipping search');
        return false;
      }
      
      if (!supplierColor || supplierColor.trim() === '') {
        logger.warn('Empty supplier color provided, skipping search');
        return false;
      }
      
      logger.info(`Searching Alendel for fabric: ${supplierPattern} - ${supplierColor}`);
      
      // Clear search input and search for pattern
      await this.page.click(config.selectors.searchInput);
      await this.page.evaluate(() => {
        const searchInput = document.querySelector('#small-searchterms');
        if (searchInput) {
          searchInput.value = '';
        }
      });
      
      // Type the search pattern
      await this.page.type(config.selectors.searchInput, supplierPattern.trim());
      
      // Wait a moment before submitting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Submit search - look for both button and form submission
      try {
        await Promise.all([
          this.page.waitForNavigation({ 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          }),
          this.page.click(config.selectors.searchButton)
        ]);
      } catch (navError) {
        logger.warn('Navigation after search failed, trying form submission');
        // Try submitting by pressing Enter
        await this.page.focus(config.selectors.searchInput);
        await this.page.keyboard.press('Enter');
        await this.page.waitForNavigation({ 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
      }
      
      // Wait for search results to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Set page size to 96 if the selector exists
      try {
        // Wait longer for the page to fully load after search
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // Try to find the page size selector with retries
        let pageSizeSelector = null;
        for (let i = 0; i < 3; i++) {
          pageSizeSelector = await this.page.$(config.selectors.pageSize);
          if (pageSizeSelector) break;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (pageSizeSelector) {
          logger.info('Found page size selector, setting to 96');
          
          // Check if the option 96 exists
          const hasOption96 = await this.page.evaluate(() => {
            const select = document.querySelector('#products-pagesize');
            if (select) {
              const options = Array.from(select.options);
              return options.some(option => option.value === '96');
            }
            return false;
          });
          
          if (hasOption96) {
            await this.page.select(config.selectors.pageSize, '96');
            await this.page.waitForNavigation({ 
              waitUntil: 'domcontentloaded',
              timeout: 30000 
            });
            logger.info('Page size set to 96 successfully');
          } else {
            logger.warn('Option 96 not found in page size selector');
          }
        } else {
          logger.warn('Page size selector #products-pagesize not found');
        }
      } catch (pageSizeError) {
        logger.warn('Could not set page size, proceeding with default:', pageSizeError.message);
      }
      
      // Search through all pages for matching pattern and color
      const stockInfo = await this.searchAlendelPages(supplierPattern, supplierColor);
      
      logger.info(`Alendel search result for ${supplierPattern} - ${supplierColor}: ${stockInfo}`);
      return stockInfo;
      
    } catch (error) {
      logger.error(`Error searching Alendel for fabric ${fabricData.supplierPattern} - ${fabricData.supplierColor}:`, error);
      return false;
    }
  }

  async returnToCollectionsPage() {
    try {
      const config = supplierConfigs.unique;
      
      // Navigate directly to the fabric collections URL
      await this.page.goto('https://uniquefinefabrics.mi-amigo.net/amigo/?Path=Home/Fabric%20Collections', { 
        waitUntil: 'networkidle2' 
      });
      
      logger.info('Returned to Fabric Collections page via direct navigation');
      
    } catch (error) {
      logger.error('Error returning to collections page:', error.message);
      throw error;
    }
  }

  async navigateToCollection(collectionName) {
    try {
      const config = supplierConfigs.unique;
      logger.info(`Searching for collection: ${collectionName} using sidebar navigation`);
      
      // First, navigate to the main collections page to get the sidebar
      const fabricCollectionsLink = await this.page.$(config.postLoginNavigation.fabricCollectionsSelector);
      if (fabricCollectionsLink) {
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
          fabricCollectionsLink.click()
        ]);
        logger.info('Navigated to Fabric Collections page');
      }
      
      // Wait for sidebar to load
      await this.page.waitForSelector(config.selectors.sidebar, { timeout: 10000 });
      
      // Look for the collection in the sidebar
      const sidebarLinks = await this.page.$$(config.selectors.sidebarLinks);
      
      for (let link of sidebarLinks) {
        const linkText = await this.page.evaluate(el => el.textContent.trim(), link);
        
        // Check if the link text matches our collection name
        if (linkText.toLowerCase().includes(collectionName.toLowerCase())) {
          logger.info(`Found "${collectionName}" in sidebar: ${linkText}`);
          
          // Click the link
          await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
            link.click()
          ]);
          
          logger.info(`✅ Successfully navigated to collection: ${collectionName}`);
          return true;
        }
      }
      
      throw new Error(`Collection "${collectionName}" not found in sidebar`);
      
    } catch (error) {
      logger.error(`Error navigating to collection ${collectionName}:`, error);
      throw error;
    }
  }


  async goToNextColorPage() {
    try {
      const config = supplierConfigs.unique;
      
      // Check if pagination exists
      const paginationExists = await this.page.$(config.selectors.pagination);
      if (!paginationExists) {
        return false;
      }
      
      // Try to find and click the ">" (next) button
      const nextArrowButton = await this.page.evaluateHandle((paginationSelector) => {
        const pagination = document.querySelector(paginationSelector);
        if (pagination) {
          const inputs = pagination.querySelectorAll('input[type="submit"]');
          for (let input of inputs) {
            const value = input.value.trim();
            if ((value === '>' || value === '&gt;') && !input.disabled) {
              return input;
            }
          }
        }
        return null;
      }, config.selectors.pagination);
      
      if (nextArrowButton && nextArrowButton.asElement()) {
        try {
          const currentContent = await this.page.$eval(config.selectors.pagination, el => el.innerHTML);
          await nextArrowButton.asElement().click();
          
          await this.page.waitForFunction(
            (paginationSelector, oldContent) => {
              const pagination = document.querySelector(paginationSelector);
              return pagination && pagination.innerHTML !== oldContent;
            },
            { timeout: 15000 },
            config.selectors.pagination,
            currentContent
          );
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          logger.info(`Successfully navigated to next color page`);
          return true;
        } catch (navError) {
          logger.warn(`Color page navigation failed: ${navError.message}`);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error in goToNextColorPage:', error);
      return false;
    }
  }

  async findPatternOrColor(searchTerm) {
    try {
      const config = supplierConfigs.unique;
      logger.info(`Looking for pattern/color: ${searchTerm}`);
      
      // Check if sidebar exists (we should be in a collection page)
      const sidebarExists = await this.page.$(config.selectors.sidebar);
      if (!sidebarExists) {
        logger.warn('Sidebar not found - not in collection page');
        return false;
      }
      
      // Look for the search term in the sidebar links first (for patterns)
      const sidebarLinks = await this.page.$$(config.selectors.sidebarLinks);
      
      for (let link of sidebarLinks) {
        const linkText = await this.page.evaluate(el => el.textContent.trim(), link);
        
        // Check if the link text matches our search term
        if (linkText.toLowerCase().includes(searchTerm.toLowerCase())) {
          logger.info(`Found "${searchTerm}" in sidebar: ${linkText}`);
          
          // Click the link
          await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
            link.click()
          ]);
          
          logger.info(`Successfully navigated to: ${linkText}`);
          return true;
        }
      }
      
      // If not found in sidebar, look for color codes in all page links with pagination
      let currentPage = 1;
      const maxPages = 10; // Safety limit for color pagination
      
      while (currentPage <= maxPages) {
        logger.info(`Searching for color "${searchTerm}" on page ${currentPage}`);
        
        const allLinks = await this.page.$$('a');
        
        for (let link of allLinks) {
          const linkText = await this.page.evaluate(el => el.textContent.trim(), link);
          
          // Check if the link contains "Color: [searchTerm]"
          if (linkText.includes(`Color: ${searchTerm}`)) {
            logger.info(`Found color "${searchTerm}" in product link on page ${currentPage}`);
            
            // Click the link
            await Promise.all([
              this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
              link.click()
            ]);
            
            logger.info(`Successfully navigated to product with color: ${searchTerm}`);
            return true;
          }
        }
        
        // Try to go to next page within this pattern/collection
        const nextPageNavigated = await this.goToNextColorPage();
        if (!nextPageNavigated) {
          logger.info(`No more color pages available`);
          break;
        }
        currentPage++;
      }
      
      // If not found by exact color match, try the main content area (for patterns)
      try {
        await this.page.waitForSelector(config.selectors.patterns, { timeout: 5000 });
        const items = await this.page.$$(config.selectors.patterns);
        
        for (let item of items) {
          const text = await this.page.evaluate(el => el.textContent.trim(), item);
          if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
            await Promise.all([
              this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
              item.click()
            ]);
            logger.info(`Found and clicked: ${searchTerm}`);
            return true;
          }
        }
      } catch (e) {
        // Patterns selector not found, which is fine
      }
      
      logger.info(`"${searchTerm}" not found in sidebar, links, or main content`);
      return false;
      
    } catch (error) {
      logger.error(`Error finding ${searchTerm}:`, error);
      return false;
    }
  }


  async extractETAInfo() {
    try {
      const config = supplierConfigs.unique;
      
      // Check the specific ETA label element first
      const etaElement = await this.page.$(config.selectors.etaLabel);
      if (etaElement) {
        const etaText = await this.page.evaluate(el => el.textContent.trim(), etaElement);
        if (etaText && etaText !== '') {
          logger.info(`Found ETA info: ${etaText}`);
          return etaText; // Return actual ETA information (like "Please Call Customer Service", dates, etc.)
        }
      }
      
      // If ETA element exists but is empty, or doesn't exist, check for other backorder indicators
      const bodyText = await this.page.evaluate(() => document.body.textContent);
      
      if (bodyText.includes('Please Call Customer Service')) {
        return 'Please Call Customer Service';
      }
      
      if (bodyText.includes('Out of Stock')) {
        return 'Out of Stock';
      }
      
      if (bodyText.includes('Backorder')) {
        return 'Backorder';
      }
      
      // If none of the above, the item is available - return null to leave cell blank
      logger.info('No ETA/backorder information found - item appears to be available');
      return null;
      
    } catch (error) {
      logger.error('Error extracting ETA info:', error);
      return null;
    }
  }

  async searchAlendelPages(supplierPattern, supplierColor) {
    try {
      const config = supplierConfigs.alendel;
      let currentPage = 1;
      const maxPages = 20;
      
      while (currentPage <= maxPages) {
        logger.info(`Searching Alendel page ${currentPage} for ${supplierPattern} - ${supplierColor}`);
        
        // Get all product elements
        const productElements = await this.page.$$(config.selectors.products);
        
        for (let productElement of productElements) {
          // Look for the .sku element within each product
          const skuElement = await productElement.$(config.selectors.productSku);
          
          if (skuElement) {
            const skuText = await this.page.evaluate(el => el.textContent.trim(), skuElement);
            
            // Check if the SKU contains both pattern and color
            if (skuText.toLowerCase().includes(supplierPattern.toLowerCase()) && 
                skuText.toLowerCase().includes(supplierColor.toLowerCase())) {
              
              logger.info(`Found matching product SKU: ${skuText}`);
              
              // Find the picture link within the product element and click it
              const pictureLink = await productElement.$(config.selectors.productPicture);
              if (pictureLink) {
                try {
                  await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
                    pictureLink.click()
                  ]);
                  
                  logger.info(`Successfully navigated to product page`);
                  
                  // Check stock status on product page
                  const stockStatus = await this.checkAlendelStock();
                  return stockStatus;
                } catch (navError) {
                  logger.error(`Navigation to product page failed: ${navError.message}`);
                  return false;
                }
              } else {
                logger.warn('Picture link not found in product element');
                return false;
              }
            }
          }
        }
        
        // Try to go to next page
        const nextPageExists = await this.goToNextAlendelPage();
        if (!nextPageExists) {
          logger.info(`No more pages available in Alendel search`);
          break;
        }
        currentPage++;
      }
      
      logger.info(`Product not found in Alendel search results`);
      return false;
      
    } catch (error) {
      logger.error('Error searching Alendel pages:', error);
      return false;
    }
  }

  async goToNextAlendelPage() {
    try {
      const config = supplierConfigs.alendel;
      
      // Check if next page button exists
      const nextPageButton = await this.page.$(config.selectors.nextPage);
      if (nextPageButton) {
        const isDisabled = await this.page.evaluate(el => el.classList.contains('disabled'), nextPageButton);
        if (!isDisabled) {
          await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            nextPageButton.click()
          ]);
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error navigating to next Alendel page:', error);
      return false;
    }
  }

  async checkAlendelStock() {
    try {
      const config = supplierConfigs.alendel;
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Log the current URL for debugging
      const currentUrl = this.page.url();
      logger.info(`Checking stock on URL: ${currentUrl}`);
      
      // Try different approaches to find the stock information
      
      // First try the direct stockquantity selector
      const stockQuantityDirect = await this.page.$('.stockquantity');
      if (stockQuantityDirect) {
        const stockText = await this.page.evaluate(el => el.textContent.trim(), stockQuantityDirect);
        logger.info(`Found stock quantity directly: "${stockText}"`);
        
        if (stockText.includes('Out of stock') || stockText.includes('OUT OF STOCK') || stockText === '') {
          logger.info('Product is out of stock');
          return stockText || 'Out of stock';
        }
        
        // Return the stock value text (could be quantity or other stock info)
        return stockText;
      }
      
      // Try the full selector path
      const stockContainer = await this.page.$(config.selectors.stockContainer);
      if (stockContainer) {
        logger.info('Found stock container using config selector');
        
        // Look for stockquantity element within the stock container
        const stockQuantityElement = await stockContainer.$(config.selectors.stockQuantity);
        if (stockQuantityElement) {
          const stockText = await this.page.evaluate(el => el.textContent.trim(), stockQuantityElement);
          
          logger.info(`Found stock quantity: ${stockText}`);
          
          if (stockText.includes('Out of stock') || stockText.includes('OUT OF STOCK')) {
            logger.info('Product is out of stock');
            return stockText;
          }
          
          // Return the stock value text (could be quantity or other stock info)
          return stockText;
        } else {
          logger.warn('Stock container found but no stockquantity element inside');
        }
      } else {
        logger.warn('Stock container not found using selector:', config.selectors.stockContainer);
      }
      
      // If no stock container found, item might be available
      logger.info('No stock container found - product might be available');
      return null;
      
    } catch (error) {
      logger.error('Error checking Alendel stock:', error);
      return false;
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        logger.info('Browser closed successfully');
      }
    } catch (error) {
      logger.error('Error closing browser:', error);
    }
  }
}

module.exports = FabricScraper;