# Fabric Stock Checker

Automated fabric stock checking system that monitors supplier portals and updates Google Sheets with current availability and ETA information.

## Features

- Daily automated checks at 1 AM
- Google Sheets integration for fabric data management
- Modular supplier system (currently supports Unique Fine Fabrics)
- Automatic backorder tracking
- Railway deployment ready
- Comprehensive logging and error handling

## Project Structure

```
fabric-stock-checker/
├── config/
│   └── suppliers.js          # Supplier-specific configurations
├── services/
│   ├── googleSheets.js       # Google Sheets API integration
│   ├── fabricScraper.js      # Puppeteer scraping logic
│   └── logger.js             # Winston logging setup
├── index.js                  # Main application and scheduler
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
├── railway.toml              # Railway deployment config
└── Procfile                  # Process definition for Railway
```

## Setup Instructions

### 1. Google Sheets Setup

1. **Create a Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one

2. **Enable Google Sheets API:**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API" and enable it

3. **Create Service Account:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details
   - Click "Create and Continue"
   - Skip role assignment for now
   - Click "Done"

4. **Generate Service Account Key:**
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose "JSON" format
   - Download the key file

5. **Prepare Your Google Sheet:**
   - Create a Google Spreadsheet
   - Create a sheet named "Fabrics" with columns:
     - A: Supplier
     - B: Supplier Collection  
     - C: Supplier Pattern
     - D: Supplier Color
     - E-I: Additional data as needed
     - J: ETA (this will be updated by the script)
   - Share the spreadsheet with the service account email (found in the JSON key file)
   - Give "Editor" permissions

### 2. Local Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd fabric-stock-checker
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY_FILE=path/to/your-service-account-key.json
   GOOGLE_SPREADSHEET_ID=your_google_spreadsheet_id_from_url
   UNIQUE_USERNAME=agnes@elitewf.com
   UNIQUE_PASSWORD=E108140$
   DEV_MODE=true
   LOG_LEVEL=debug
   ```

3. **Test the application:**
   ```bash
   npm start
   ```

### 3. Railway Deployment

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize Railway project:**
   ```bash
   railway init
   ```

4. **Set environment variables in Railway:**
   ```bash
   # Set Google Sheets credentials (use the JSON content directly)
   railway variables set GOOGLE_SERVICE_ACCOUNT_KEY_JSON='{"type":"service_account","project_id":"...your-full-json-here..."}'
   
   # Set spreadsheet ID
   railway variables set GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
   
   # Set Unique credentials
   railway variables set UNIQUE_USERNAME=agnes@elitewf.com
   railway variables set UNIQUE_PASSWORD='E108140$'
   
   # Set timezone (optional)
   railway variables set TZ=America/New_York
   
   # Production settings
   railway variables set DEV_MODE=false
   railway variables set LOG_LEVEL=info
   ```

5. **Deploy to Railway:**
   ```bash
   railway up
   ```

6. **Monitor deployment:**
   ```bash
   railway logs
   ```

## Usage

### Automatic Operation
- The system runs automatically daily at 1 AM (configured timezone)
- Checks all fabrics in the Google Sheet where Supplier = "Unique"
- Updates ETA information in column J
- Adds items with ETAs to the "Backorder" sheet

### Manual Triggers
- **Development mode:** Set `DEV_MODE=true` to run once immediately
- **Manual endpoint:** Visit `https://your-railway-url.com/run-now` to trigger manually
- **Health check:** Visit `https://your-railway-url.com/health` to verify system status

### Monitoring
- **Status endpoint:** `https://your-railway-url.com/` shows last run time
- **Railway logs:** Use `railway logs` to view real-time logs
- **Google Sheets:** Check the "Fabrics" and "Backorder" sheets for updates

## Adding New Suppliers

To add support for additional suppliers:

1. **Update `config/suppliers.js`:**
   ```javascript
   newSupplier: {
     name: 'New Supplier Name',
     loginUrl: 'https://supplier.com/login',
     usernameField: '#username',
     passwordField: '#password',
     loginButton: '#login-btn',
     // ... other configuration
   }
   ```

2. **Add credentials to environment variables:**
   ```bash
   railway variables set NEW_SUPPLIER_USERNAME=username
   railway variables set NEW_SUPPLIER_PASSWORD=password
   ```

3. **Update the filtering logic in `googleSheets.js`** to include the new supplier

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` | Google service account credentials as JSON string | Yes | `{"type":"service_account",...}` |
| `GOOGLE_SPREADSHEET_ID` | ID from Google Sheets URL | Yes | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `UNIQUE_USERNAME` | Unique portal username | Yes | `agnes@elitewf.com` |
| `UNIQUE_PASSWORD` | Unique portal password | Yes | `E108140$` |
| `TZ` | Timezone for scheduling | No | `America/New_York` |
| `DEV_MODE` | Run once instead of scheduling | No | `false` |
| `LOG_LEVEL` | Logging verbosity | No | `info` |

## Troubleshooting

### Common Issues

1. **Google Sheets permission errors:**
   - Ensure the service account email has Editor access to the spreadsheet
   - Verify the spreadsheet ID is correct

2. **Puppeteer crashes on Railway:**
   - The configuration includes Railway-optimized Puppeteer settings
   - Check Railway logs for specific error messages

3. **Login failures:**
   - Verify credentials are correct
   - Check if the website structure has changed
   - Monitor for CAPTCHA or other anti-bot measures

4. **Scheduling not working:**
   - Ensure `DEV_MODE=false` in production
   - Check Railway logs for cron job execution
   - Verify timezone setting

### Debugging

1. **Enable debug logging:**
   ```bash
   railway variables set LOG_LEVEL=debug
   ```

2. **Test manually:**
   - Use the `/run-now` endpoint
   - Set `DEV_MODE=true` for immediate execution

3. **Check Railway status:**
   ```bash
   railway status
   railway logs --tail
   ```

## Security Notes

- Never commit the Google service account JSON file to version control
- Use Railway's environment variables for all sensitive credentials
- The service account should have minimal required permissions
- Regularly rotate credentials if needed

## Support

For issues with this system:
1. Check Railway deployment logs
2. Verify Google Sheets permissions
3. Test credentials manually
4. Review supplier website changes

The system is designed to handle temporary failures gracefully and will retry on the next scheduled run.