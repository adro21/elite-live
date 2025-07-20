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
      await this.googleSheets.createStatusSheetIfNotExists();
      
      // Setup Express server only if not in GitHub Actions
      if (process.env.GITHUB_ACTIONS !== 'true') {
        this.setupServer();
      }
      
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
    
    // Initialize status tracking
    const status = {
      overallStatus: 'SUCCESS',
      loginSuccess: false,
      totalProcessed: 0,
      availableCount: 0,
      etaCount: 0,
      notFoundCount: 0,
      errorCount: 0,
      navigationErrors: 0,
      timeoutErrors: 0,
      movedToAvailable: 0,
      movedToBackorder: 0,
      newNotFound: 0
    };
    
    // Track current backorder items for syncing
    const currentBackorderItems = [];
    
    try {
      // Initialize scraper
      await this.fabricScraper.initialize();

      // Process Unique fabrics
      await this.processSupplierFabrics('unique', status, currentBackorderItems);

      // Process Alendel fabrics - DISABLED FOR NOW
      // await this.processSupplierFabrics('alendel', status, currentBackorderItems);

      // Sync backorder sheet with current backorder items
      await this.googleSheets.syncBackorderSheet(currentBackorderItems);
      logger.info(`Backorder sheet synced with ${currentBackorderItems.length} items`);

      this.lastRunTime = new Date().toISOString();
      const duration = new Date() - startTime;
      const durationMinutes = Math.round(duration / 60000 * 100) / 100; // Round to 2 decimal places
      
      status.durationMinutes = durationMinutes;
      
      // Update overall status based on results
      if (status.errorCount > 0) {
        status.overallStatus = `SUCCESS (${status.errorCount} errors)`;
      }
      if (status.errorCount > status.totalProcessed * 0.1) { // More than 10% errors
        status.overallStatus = 'PARTIAL FAILURE';
      }
      
      logger.info(`Fabric stock check completed in ${duration}ms`);

    } catch (error) {
      logger.error('Error during fabric stock check:', error);
      status.overallStatus = 'FAILED';
      throw error;
    } finally {
      // Always close the browser
      await this.fabricScraper.close();
      
      // Always update status sheet, even if there were errors
      try {
        await this.googleSheets.updateStatusSheet(status);
      } catch (statusError) {
        logger.error('Failed to update status sheet:', statusError);
      }
    }
  }

  async processSupplierFabrics(supplierName, status, currentBackorderItems) {
    try {
      // Get fabric data from Google Sheets for this supplier
      const fabricData = await this.googleSheets.getFabricData(supplierName);
      logger.info(`Found ${fabricData.length} ${supplierName} fabrics to check`);

      if (fabricData.length === 0) {
        logger.info(`No ${supplierName} fabrics found to check`);
        return;
      }

      status.totalProcessed += fabricData.length;

      // Login to appropriate portal
      try {
        if (supplierName === 'unique') {
          await this.fabricScraper.loginToUnique();
        } else if (supplierName === 'alendel') {
          await this.fabricScraper.loginToAlendel();
        }
        
        // Only set login success if this is the first supplier processed
        if (!status.loginSuccess) {
          status.loginSuccess = true;
        }
        
        logger.info(`${supplierName} login successful`);
      } catch (loginError) {
        status.loginSuccess = false;
        status.overallStatus = 'LOGIN FAILED';
        logger.error(`${supplierName} login failed:`, loginError);
        throw loginError;
      }

      // Process each fabric
      for (const fabric of fabricData) {
        try {
          logger.info(`Processing ${supplierName} fabric: ${fabric.supplierPattern} - ${fabric.supplierColor}`);
          
          // Get current ETA value to track changes
          const currentETA = fabric.currentETA || '';
          
          // Search for the fabric and get ETA info
          let etaInfo;
          if (supplierName === 'unique') {
            etaInfo = await this.fabricScraper.searchFabric(fabric);
          } else if (supplierName === 'alendel') {
            etaInfo = await this.fabricScraper.searchAlendelFabric(fabric);
          }
          
          if (etaInfo === null) {
            // ETA is null means the item is available - clear any existing ETA info
            logger.info(`${supplierName} fabric ${fabric.supplierPattern} - ${fabric.supplierColor}: Available (clearing any previous ETA)`);
            await this.googleSheets.updateFabricETA(fabric.rowIndex, '');
            status.availableCount++;
            
            // Track if this was moved from backorder to available
            if (currentETA && currentETA !== 'Not Found' && currentETA !== 'Error') {
              status.movedToAvailable++;
            }
            
          } else if (etaInfo === false) {
            // etaInfo is false means fabric was not found
            logger.warn(`Could not find ${supplierName} fabric: ${fabric.supplierPattern} - ${fabric.supplierColor}`);
            await this.googleSheets.updateFabricETA(fabric.rowIndex, 'Not Found');
            status.notFoundCount++;
            
            // Track if this is a new "Not Found"
            if (currentETA !== 'Not Found') {
              status.newNotFound++;
            }
            
          } else {
            // etaInfo contains actual ETA information (backorder, dates, etc.)
            await this.googleSheets.updateFabricETA(fabric.rowIndex, etaInfo);
            
            // Add to current backorder items for syncing later
            currentBackorderItems.push({
              supplier: fabric.supplier,
              supplierCollection: fabric.supplierCollection,
              supplierPattern: fabric.supplierPattern,
              supplierColor: fabric.supplierColor,
              etaValue: etaInfo,
              rawRow: fabric.rawRow
            });
            
            logger.info(`Updated ${supplierName} fabric ${fabric.supplierPattern} - ${fabric.supplierColor}: ${etaInfo}`);
            status.etaCount++;
            
            // Track if this was moved from available to backorder
            if (!currentETA || currentETA === '') {
              status.movedToBackorder++;
            }
          }
          
          // Add a small delay to avoid overwhelming the server
          await this.delay(2000);
          
        } catch (error) {
          logger.error(`Error processing ${supplierName} fabric ${fabric.supplierPattern} - ${fabric.supplierColor}:`, error);
          await this.googleSheets.updateFabricETA(fabric.rowIndex, 'Error');
          status.errorCount++;
          
          // Categorize error types
          if (error.message.includes('timeout') || error.message.includes('Timeout')) {
            status.timeoutErrors++;
          } else if (error.message.includes('navigation') || error.message.includes('not found in sidebar')) {
            status.navigationErrors++;
          }
        }
      }

    } catch (error) {
      logger.error(`Error processing ${supplierName} fabrics:`, error);
      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  startScheduler() {
    if (process.env.DEV_MODE === 'true' || process.env.GITHUB_ACTIONS === 'true') {
      logger.info('Running in development or GitHub Actions mode - executing once');
      this.checkFabricStock().catch(error => {
        logger.error('Run failed:', error);
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