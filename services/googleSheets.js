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

      return dataRows.map((row, index) => ({
        rowIndex: index + 2, // +2 because we skip header and arrays are 0-indexed
        supplier: row[0] || '',
        supplierCollection: row[1] || '',
        supplierPattern: row[2] || '',
        supplierColor: row[3] || '',
        // Add other columns as needed
        currentETA: row[9] || '', // Column J
        rawRow: row
      })).filter(item => item.supplier.toLowerCase() === 'unique');

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
        ...fabricData.rawRow.slice(5) // Include any additional columns
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
}

module.exports = GoogleSheetsService;