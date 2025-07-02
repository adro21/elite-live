require('dotenv').config();
const cron = require('node-cron');
const express = require('express');
const GoogleSheetsService = require('./services/googleSheets');
const FabricScraper = require('./services/fabricScraper');
const logger = require('./services/logger');

class FabricStockChecker {
  constructor() {
    this.googleSheets = new GoogleSheetsService();
    this.fabricScraper = new FabricScraper();
    this.app = express();
    this.port = process.env.PORT || 3000;
  }

  async initialize() {
    try {
      // Initialize services
      await this.googleSheets.initialize();
      await this.googleSheets.createBackorderSheetIfNotExists();
      
      // Setup Express server for Railway health checks
      this.setupServer();
      
      logger.info('Fabric Stock Checker initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Fabric Stock Checker:', error);
      throw error;
    }
  }

  setupServer() {
    this.app.get('/', (req, res) => {
      res.json({ 
        status: 'running', 
        service: 'Fabric Stock Checker',
        lastRun: this.lastRunTime || 'Not yet run'
      });
    });

    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    this.app.get('/run-now', async (req, res) => {
      try {
        logger.info('Manual run triggered via /run-now endpoint');
        await this.checkFabricStock();
        res.json({ status: 'success', message: 'Stock check completed' });
      } catch (error) {
        logger.error('Manual run failed:', error);
        res.status(500).json({ status: 'error', message: error.message });
      }
    });

    this.app.listen(this.port, () => {
      logger.info(`Server running on port ${this.port}`);
    });
  }

  async checkFabricStock() {
    const startTime = new Date();
    logger.info('Starting fabric stock check');
    
    try {
      // Get fabric data from Google Sheets
      const fabricData = await this.googleSheets.getFabricData();
      logger.info(`Found ${fabricData.length} Unique fabrics to check`);

      if (fabricData.length === 0) {
        logger.info('No Unique fabrics found to check');
        return;
      }

      // Initialize scraper
      await this.fabricScraper.initialize();

      // Login to Unique portal
      await this.fabricScraper.loginToUnique();

      // Process each fabric
      for (const fabric of fabricData) {
        try {
          logger.info(`Processing fabric: ${fabric.supplierPattern} - ${fabric.supplierColor}`);
          
          // Search for the fabric and get ETA info
          const etaInfo = await this.fabricScraper.searchFabric(fabric);
          
          if (etaInfo) {
            // Update the ETA in the main sheet
            await this.googleSheets.updateFabricETA(fabric.rowIndex, etaInfo);
            
            // If there's an ETA (not "In Stock"), add to backorder sheet
            if (etaInfo !== 'In Stock' && etaInfo.trim() !== '') {
              await this.googleSheets.appendToBackorderSheet(fabric, etaInfo);
            }
            
            logger.info(`Updated fabric ${fabric.supplierPattern} - ${fabric.supplierColor}: ${etaInfo}`);
          } else {
            logger.warn(`Could not find fabric: ${fabric.supplierPattern} - ${fabric.supplierColor}`);
            await this.googleSheets.updateFabricETA(fabric.rowIndex, 'Not Found');
          }
          
          // Add a small delay to avoid overwhelming the server
          await this.delay(2000);
          
        } catch (error) {
          logger.error(`Error processing fabric ${fabric.supplierPattern} - ${fabric.supplierColor}:`, error);
          await this.googleSheets.updateFabricETA(fabric.rowIndex, 'Error');
        }
      }

      this.lastRunTime = new Date().toISOString();
      const duration = new Date() - startTime;
      logger.info(`Fabric stock check completed in ${duration}ms`);

    } catch (error) {
      logger.error('Error during fabric stock check:', error);
      throw error;
    } finally {
      // Always close the browser
      await this.fabricScraper.close();
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  startScheduler() {
    if (process.env.DEV_MODE === 'true') {
      logger.info('Running in development mode - executing once');
      this.checkFabricStock().catch(error => {
        logger.error('Development run failed:', error);
        process.exit(1);
      });
      return;
    }

    // Schedule to run daily at 1 AM
    const cronExpression = '0 1 * * *'; // 1 AM every day
    
    cron.schedule(cronExpression, async () => {
      try {
        await this.checkFabricStock();
      } catch (error) {
        logger.error('Scheduled run failed:', error);
      }
    }, {
      timezone: process.env.TZ || 'America/New_York'
    });

    logger.info(`Scheduled fabric stock check to run daily at 1 AM (${process.env.TZ || 'America/New_York'})`);
  }
}

// Main execution
async function main() {
  try {
    const checker = new FabricStockChecker();
    await checker.initialize();
    checker.startScheduler();
  } catch (error) {
    logger.error('Failed to start Fabric Stock Checker:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Start the application
if (require.main === module) {
  main();
}

module.exports = FabricStockChecker;