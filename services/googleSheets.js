const { google } = require('googleapis');
const logger = require('./logger');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    this.initialized = false;
  }

  async initialize() {
    try {
      let credentials;
      
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) {
        // For Railway deployment - credentials as JSON string
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON);
      } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
        // For local development - credentials from file
        credentials = require(`../${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE}`);
      } else {
        throw new Error('No Google credentials configured');
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.initialized = true;
      logger.info('Google Sheets service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets service:', error);
      throw error;
    }
  }

  async getFabricData() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Fabrics!A:J', // Assuming columns A-J contain the fabric data
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        logger.warn('No fabric data found in the sheet');
        return [];
      }

      // Assuming first row contains headers
      const headers = rows[0];
      const dataRows = rows.slice(1);

      const allData = dataRows.map((row, index) => ({
        rowIndex: index + 2, // +2 because we skip header and arrays are 0-indexed
        supplier: (row[0] || '').trim(),        // Column A: Supplier
        type: (row[1] || '').trim(),            // Column B: Type  
        supplierCollection: (row[2] || '').trim(), // Column C: Supplier Collection
        supplierPattern: (row[3] || '').trim(),    // Column D: Supplier Pattern
        supplierColor: (row[4] || '').trim(),      // Column E: Supplier Color
        // Add other columns as needed
        currentETA: row[9] || '', // Column J: ETA
        rawRow: row
      }));

      // Debug: Log all unique suppliers found
      const uniqueSuppliers = [...new Set(allData.map(item => item.supplier))];
      logger.info(`Found suppliers in sheet: ${uniqueSuppliers.join(', ')}`);

      // Filter for only "Unique" supplier (case-insensitive, trimmed)
      const uniqueData = allData.filter(item => 
        item.supplier.toLowerCase() === 'unique'
      );

      logger.info(`Found ${uniqueData.length} rows for Unique supplier out of ${allData.length} total rows`);
      
      return uniqueData;

    } catch (error) {
      logger.error('Error fetching fabric data:', error);
      throw error;
    }
  }

  async updateFabricETA(rowIndex, etaValue) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Update column J (ETA column)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Fabrics!J${rowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[etaValue]]
        }
      });

      logger.info(`Updated ETA for row ${rowIndex}: ${etaValue}`);
    } catch (error) {
      logger.error(`Error updating ETA for row ${rowIndex}:`, error);
      throw error;
    }
  }

  async syncBackorderSheet(backorderItems) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Clear existing data (keep headers)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Backorder!A2:Z1000'
      });

      if (backorderItems.length === 0) {
        logger.info('No items on backorder - Backorder sheet cleared');
        return;
      }

      // Prepare rows for current backorder items
      const timestamp = new Date().toISOString();
      const backorderRows = backorderItems.map(item => [
        timestamp,
        item.supplier,
        item.supplierCollection,
        item.supplierPattern,
        item.supplierColor,
        item.etaValue,
        ...item.rawRow.slice(5, 9) // Include columns F-I, exclude ETA column J
      ]);

      // Add current backorder items
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Backorder!A2:Z' + (backorderRows.length + 1),
        valueInputOption: 'RAW',
        resource: {
          values: backorderRows
        }
      });

      logger.info(`Synced ${backorderItems.length} items to backorder sheet`);
    } catch (error) {
      logger.error('Error syncing backorder sheet:', error);
      throw error;
    }
  }

  async createBackorderSheetIfNotExists() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Check if Backorder sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const backorderSheetExists = spreadsheet.data.sheets.some(
        sheet => sheet.properties.title === 'Backorder'
      );

      if (!backorderSheetExists) {
        // Create the Backorder sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Backorder'
                }
              }
            }]
          }
        });

        // Add headers to the new sheet
        const headers = [
          'Last Updated', 'Supplier', 'Collection', 'Pattern', 'Color', 'ETA Status', 
          'Price', 'Pattern Name', 'Color Name', 'Width'
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Backorder!A1:J1',
          valueInputOption: 'RAW',
          resource: {
            values: [headers]
          }
        });

        logger.info('Created Backorder sheet with headers');
      }
    } catch (error) {
      logger.error('Error creating/checking Backorder sheet:', error);
      throw error;
    }
  }

  async createStatusSheetIfNotExists() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const statusSheetExists = spreadsheet.data.sheets.some(
        sheet => sheet.properties.title === 'Status'
      );

      if (!statusSheetExists) {
        // Create the Status sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Status'
                }
              }
            }]
          }
        });

        // Add headers and initial structure to the Status sheet
        const statusData = [
          ['Fabric Stock Checker - System Status', '', '', ''],
          ['', '', '', ''],
          ['Metric', 'Value', 'Description', 'Last Updated'],
          ['', '', '', ''],
          ['Last Run Status', '', 'Overall result of last execution', ''],
          ['Run Duration', '', 'Time taken to complete (minutes)', ''],
          ['Login Status', '', 'Authentication success/failure', ''],
          ['Items Processed', '', 'Total fabrics checked', ''],
          ['Items Available', '', 'Items currently in stock', ''],
          ['Items on Backorder', '', 'Items with ETA information', ''],
          ['Items Not Found', '', 'Items that could not be located', ''],
          ['Items with Errors', '', 'Items that failed to process', ''],
          ['Navigation Errors', '', 'Website navigation failures', ''],
          ['Timeout Errors', '', 'Network/loading timeout failures', ''],
          ['Items Moved to Available', '', 'Changed from backorder to available', ''],
          ['Items Moved to Backorder', '', 'Changed from available to backorder', ''],
          ['New Not Found Items', '', 'Items newly marked as not found', ''],
          ['System Mode', '', 'Runtime environment', ''],
          ['Next Run', '', 'Scheduled execution time', ''],
          ['Last Updated', '', 'Timestamp of this status update', '']
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Status!A1:D23',
          valueInputOption: 'RAW',
          resource: {
            values: statusData
          }
        });

        logger.info('Created Status sheet with structure');
      }
    } catch (error) {
      logger.error('Error creating/checking Status sheet:', error);
      throw error;
    }
  }

  async updateStatusSheet(statusInfo) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const nextRun = process.env.DEV_MODE === 'true' 
        ? 'Development Mode - Manual runs only'
        : process.env.GITHUB_ACTIONS === 'true'
        ? 'GitHub Actions - Daily at 1:00 AM EST'
        : 'Daily at 1:00 AM EST';

      const systemMode = process.env.DEV_MODE === 'true' ? 'Development' : 
                        process.env.GITHUB_ACTIONS === 'true' ? 'GitHub Actions' : 'Production';

      // Update the Values column (B) and Last Updated column (D) 
      const statusUpdates = [
        ['B5', statusInfo.overallStatus, timestamp], // Last Run Status
        ['B6', statusInfo.durationMinutes + ' minutes', timestamp], // Run Duration
        ['B7', statusInfo.loginSuccess ? 'SUCCESS' : 'FAILED', timestamp], // Login Status
        ['B8', statusInfo.totalProcessed, timestamp], // Items Processed
        ['B9', statusInfo.availableCount, timestamp], // Items Available
        ['B10', statusInfo.etaCount, timestamp], // Items on Backorder
        ['B11', statusInfo.notFoundCount, timestamp], // Items Not Found
        ['B12', statusInfo.errorCount, timestamp], // Items with Errors
        ['B13', statusInfo.navigationErrors, timestamp], // Navigation Errors
        ['B14', statusInfo.timeoutErrors, timestamp], // Timeout Errors
        ['B15', statusInfo.movedToAvailable || 0, timestamp], // Items Moved to Available
        ['B16', statusInfo.movedToBackorder || 0, timestamp], // Items Moved to Backorder
        ['B17', statusInfo.newNotFound || 0, timestamp], // New Not Found Items
        ['B18', systemMode, timestamp], // System Mode
        ['B19', nextRun, timestamp], // Next Run
        ['B20', timestamp, timestamp] // Last Updated
      ];

      // Update each row individually for better control
      for (const [cell, value, updateTime] of statusUpdates) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Status!${cell}`,
          valueInputOption: 'RAW',
          resource: {
            values: [[value]]
          }
        });

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Status!D${cell.substring(1)}`,
          valueInputOption: 'RAW',
          resource: {
            values: [[updateTime]]
          }
        });
      }

      logger.info('Updated Status sheet with latest run information');
    } catch (error) {
      logger.error('Error updating Status sheet:', error);
      throw error;
    }
  }
}

module.exports = GoogleSheetsService;