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

  async appendToBackorderSheet(fabricData, etaValue) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const timestamp = new Date().toISOString();
      const backorderRow = [
        timestamp,
        fabricData.supplier,
        fabricData.supplierCollection,
        fabricData.supplierPattern,
        fabricData.supplierColor,
        etaValue,
        ...fabricData.rawRow.slice(5, 9) // Include columns F-I, exclude ETA column J
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Backorder!A:Z',
        valueInputOption: 'RAW',
        resource: {
          values: [backorderRow]
        }
      });

      logger.info(`Added fabric to backorder sheet: ${fabricData.supplierPattern} - ${fabricData.supplierColor}`);
    } catch (error) {
      logger.error('Error appending to backorder sheet:', error);
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
          'Timestamp', 'Supplier', 'Collection', 'Pattern', 'Color', 'ETA', 
          'Additional Info 1', 'Additional Info 2', 'Additional Info 3'
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Backorder!A1:I1',
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
          ['Fabric Stock Checker - System Status'],
          [''],
          ['Last Scrape Information', ''],
          ['Last Run Date & Time', ''],
          ['Status', ''],
          ['Duration (minutes)', ''],
          ['Total Items Processed', ''],
          [''],
          ['Results Summary', ''],
          ['Items Available (blank)', ''],
          ['Items with ETA Info', ''],
          ['Items Not Found', ''],
          ['Items with Errors', ''],
          [''],
          ['System Health', ''],
          ['Login Success', ''],
          ['Navigation Errors', ''],
          ['Timeout Errors', ''],
          [''],
          ['Next Scheduled Run', ''],
          ['System Mode', ''],
          [''],
          ['Recent Activity', ''],
          ['Items Moved to Available', ''],
          ['Items Moved to Backorder', ''],
          ['New Not Found Items', '']
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Status!A1:B26',
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

      const statusValues = [
        [timestamp], // B4 - Last Run Date & Time
        [statusInfo.overallStatus], // B5 - Status
        [statusInfo.durationMinutes], // B6 - Duration
        [statusInfo.totalProcessed], // B7 - Total Items Processed
        [''], // B8 - Empty
        [''], // B9 - Empty  
        [statusInfo.availableCount], // B10 - Items Available
        [statusInfo.etaCount], // B11 - Items with ETA Info
        [statusInfo.notFoundCount], // B12 - Items Not Found
        [statusInfo.errorCount], // B13 - Items with Errors
        [''], // B14 - Empty
        [''], // B15 - Empty
        [statusInfo.loginSuccess ? 'SUCCESS' : 'FAILED'], // B16 - Login Success
        [statusInfo.navigationErrors], // B17 - Navigation Errors
        [statusInfo.timeoutErrors], // B18 - Timeout Errors
        [''], // B19 - Empty
        [nextRun], // B20 - Next Scheduled Run
        [process.env.DEV_MODE === 'true' ? 'Development' : process.env.GITHUB_ACTIONS === 'true' ? 'GitHub Actions' : 'Production'], // B21 - System Mode
        [''], // B22 - Empty
        [''], // B23 - Empty
        [statusInfo.movedToAvailable || 0], // B24 - Items Moved to Available
        [statusInfo.movedToBackorder || 0], // B25 - Items Moved to Backorder
        [statusInfo.newNotFound || 0] // B26 - New Not Found Items
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Status!B4:B26',
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