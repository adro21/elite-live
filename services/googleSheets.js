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
          'Timestamp', 'Supplier', 'Supplier Collection', 'Supplier Pattern', 'Supplier Colour', 'Backorder Status', 
          'Elite Price Cut -30% (CAN$/Y)', 'Elite Fabric Name', 'Elite Color Name', 'Width (")'
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

        // Add simple status structure to the Status sheet
        const statusData = [
          ['System Status', ''],
          ['Last Scrape', ''],
          ['Last Scrape Duration', ''],
          ['Items "Not Found" in Last Scrape', ''],
          ['Items on Backorder', ''],
          ['Login Status', ''],
          ['Total Items Processed', ''],
          ['Navigation Errors', ''],
          ['Timeout Errors', '']
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Status!A1:B9',
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

      // Determine system health status
      let systemStatus = 'Healthy';
      if (!statusInfo.loginSuccess) {
        systemStatus = 'Critical - Login Failed';
      } else if (statusInfo.errorCount > statusInfo.totalProcessed * 0.3) {
        systemStatus = 'Degraded - High Error Rate';
      } else if (statusInfo.errorCount > 0) {
        systemStatus = 'Warning - Some Errors';
      } else if (statusInfo.navigationErrors > 0 || statusInfo.timeoutErrors > 0) {
        systemStatus = 'Warning - Network Issues';
      }

      // Update only column B values
      const statusValues = [
        [systemStatus], // B1 - System Status
        [timestamp], // B2 - Last Scrape
        [statusInfo.durationMinutes + ' minutes'], // B3 - Last Scrape Duration
        [statusInfo.notFoundCount], // B4 - Items "Not Found" in Last Scrape
        [statusInfo.etaCount], // B5 - Items on Backorder
        [statusInfo.loginSuccess ? 'SUCCESS' : 'FAILED'], // B6 - Login Status
        [statusInfo.totalProcessed], // B7 - Total Items Processed
        [statusInfo.navigationErrors], // B8 - Navigation Errors
        [statusInfo.timeoutErrors] // B9 - Timeout Errors
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Status!B1:B9',
        valueInputOption: 'RAW',
        resource: {
          values: statusValues
        }
      });

      logger.info('Updated Status sheet with latest run information');
    } catch (error) {
      logger.error('Error updating Status sheet:', error);
      throw error;
    }
  }
}

module.exports = GoogleSheetsService;