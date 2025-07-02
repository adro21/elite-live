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

  async searchFabric(fabricData) {
    try {
      const config = supplierConfigs.unique;
      const { supplierCollection, supplierPattern, supplierColor } = fabricData;
      
      logger.info(`Searching for fabric: ${supplierCollection} - ${supplierPattern} - ${supplierColor}`);
      
      // Navigate to the specific collection
      await this.navigateToCollection(supplierCollection);
      
      // Search for the pattern
      const patternFound = await this.findPattern(supplierPattern);
      if (!patternFound) {
        logger.warn(`Pattern not found: ${supplierPattern}`);
        return null;
      }
      
      // Search for the color
      const colorFound = await this.findColor(supplierColor);
      if (!colorFound) {
        logger.warn(`Color not found: ${supplierColor}`);
        return null;
      }
      
      // Extract ETA information
      const etaInfo = await this.extractETAInfo();
      
      logger.info(`Found ETA info for ${supplierPattern} - ${supplierColor}: ${etaInfo}`);
      return etaInfo;
      
    } catch (error) {
      logger.error(`Error searching for fabric ${supplierPattern} - ${supplierColor}:`, error);
      return null;
    }
  }

  async navigateToCollection(collectionName) {
    try {
      const config = supplierConfigs.unique;
      
      // Wait for collections to load
      await this.page.waitForSelector(config.selectors.collections, { timeout: 10000 });
      
      // Find and click the matching collection
      const collections = await this.page.$$(config.selectors.collections);
      
      for (let collection of collections) {
        const nameElement = await collection.$(config.selectors.collectionName);
        if (nameElement) {
          const name = await this.page.evaluate(el => el.textContent.trim(), nameElement);
          if (name.toLowerCase().includes(collectionName.toLowerCase())) {
            await Promise.all([
              this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
              collection.click()
            ]);
            logger.info(`Navigated to collection: ${collectionName}`);
            return true;
          }
        }
      }
      
      throw new Error(`Collection not found: ${collectionName}`);
    } catch (error) {
      logger.error(`Error navigating to collection ${collectionName}:`, error);
      throw error;
    }
  }

  async findPattern(patternName) {
    try {
      const config = supplierConfigs.unique;
      
      // Wait for patterns to load
      await this.page.waitForSelector(config.selectors.patterns, { timeout: 10000 });
      
      // Find and click the matching pattern
      const patterns = await this.page.$$(config.selectors.patterns);
      
      for (let pattern of patterns) {
        const nameElement = await pattern.$(config.selectors.patternName);
        if (nameElement) {
          const name = await this.page.evaluate(el => el.textContent.trim(), nameElement);
          if (name.toLowerCase().includes(patternName.toLowerCase())) {
            await Promise.all([
              this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
              pattern.click()
            ]);
            logger.info(`Found and clicked pattern: ${patternName}`);
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      logger.error(`Error finding pattern ${patternName}:`, error);
      return false;
    }
  }

  async findColor(colorName) {
    try {
      const config = supplierConfigs.unique;
      
      // Wait for color options to load
      await this.page.waitForSelector(config.selectors.colorOptions, { timeout: 10000 });
      
      // Find and click the matching color
      const colors = await this.page.$$(config.selectors.colorOptions);
      
      for (let color of colors) {
        const nameElement = await color.$(config.selectors.colorName);
        if (nameElement) {
          const name = await this.page.evaluate(el => el.textContent.trim(), nameElement);
          if (name.toLowerCase().includes(colorName.toLowerCase())) {
            await Promise.all([
              this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
              color.click()
            ]);
            logger.info(`Found and clicked color: ${colorName}`);
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      logger.error(`Error finding color ${colorName}:`, error);
      return false;
    }
  }

  async extractETAInfo() {
    try {
      const config = supplierConfigs.unique;
      
      // Wait for the ETA element to load
      await this.page.waitForSelector(config.selectors.etaLabel, { timeout: 5000 });
      
      const etaElement = await this.page.$(config.selectors.etaLabel);
      if (etaElement) {
        const etaText = await this.page.evaluate(el => el.textContent.trim(), etaElement);
        return etaText;
      }
      
      return 'In Stock'; // If no ETA element, assume it's in stock
    } catch (error) {
      // If ETA element doesn't exist, it might be in stock
      logger.info('No ETA element found, assuming item is in stock');
      return 'In Stock';
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