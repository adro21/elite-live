# Fabric Stock Checker

Automated fabric stock checking system that monitors supplier portals and updates Google Sheets with current availability and ETA information. Now runs on GitHub Actions for **completely free** operation.

## Features

- **Free hosting on GitHub Actions** (no monthly costs)
- Daily automated checks at 1 AM EST
- Google Sheets integration for fabric data management
- **Intelligent backorder syncing** (no duplicates, reflects current state)
- **Professional Status sheet** with system health monitoring
- Modular supplier system (currently supports Unique Fine Fabrics)
- Comprehensive logging and error handling
- **Sidebar navigation** to bypass pagination issues

## Project Structure

```
fabric-stock-checker/
├── .github/
│   └── workflows/
│       └── fabric-stock-check.yml  # GitHub Actions workflow
├── config/
│   └── suppliers.js               # Supplier-specific configurations
├── services/
│   ├── googleSheets.js            # Google Sheets API integration
│   ├── fabricScraper.js           # Puppeteer scraping logic
│   └── logger.js                  # Winston logging setup
├── index.js                       # Main application
├── package.json                   # Dependencies and scripts
└── .env.example                   # Environment variables template
```

## Quick Start

### 1. Setup GitHub Repository
1. Fork or clone this repository
2. Push to your GitHub repository
3. Set up repository secrets (see below)
4. The system will run automatically daily at 1 AM EST

### 2. Google Sheets Setup

1. **Create a Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one

2. **Enable Google Sheets API:**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API" and enable it

3. **Create Service Account:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details and create

4. **Generate Service Account Key:**
   - Click on the created service account
   - Go to "Keys" tab → "Add Key" → "Create New Key"
   - Choose "JSON" format and download

5. **Prepare Your Google Sheet:**
   Create a spreadsheet with these sheets:
   
   **"Fabrics" Sheet (columns A-J):**
   - A: Supplier
   - B: Type
   - C: Supplier Collection  
   - D: Supplier Pattern
   - E: Supplier Colour
   - F-I: Additional data (price, names, etc.)
   - J: ETA (updated automatically by the system)
   
   **"Backorder" Sheet:** (Auto-created with proper headers)
   **"Status" Sheet:** (Auto-created with system monitoring)

6. **Share the spreadsheet** with the service account email (from JSON file) as Editor

### 3. GitHub Actions Setup

#### Repository Secrets (Required)
Go to your GitHub repo → Settings → Secrets and Variables → Actions

Add these **Repository Secrets**:

- `UNIQUE_USERNAME`: Your Unique Fine Fabrics username
- `UNIQUE_PASSWORD`: Your Unique Fine Fabrics password  
- `GOOGLE_SPREADSHEET_ID`: Your Google Sheets ID (from URL)
- `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`: Complete JSON file content

#### How to Find Google Sheets ID
From URL: `https://docs.google.com/spreadsheets/d/1ABC123xyz/edit`  
The ID is: `1ABC123xyz`

## Operation

### Automatic Scheduling
- **Runs daily at 1 AM EST** via GitHub Actions
- **Completely free** within GitHub's generous limits
- **90-day log retention** for debugging

### What It Does
1. **Logs into Unique Fine Fabrics portal**
2. **Checks each fabric** in your "Fabrics" sheet (Supplier = "Unique")
3. **Updates column J** with current ETA/availability status
4. **Syncs Backorder sheet** with only current backorder items (no duplicates)
5. **Updates Status sheet** with comprehensive system health metrics

### Manual Testing
1. Go to your GitHub repo → Actions tab
2. Click "Daily Fabric Stock Check"
3. Click "Run workflow" → "Run workflow"
4. Watch real-time execution logs

## Google Sheets Output

### Fabrics Sheet
- **Column J updated** with current ETA information
- Available items: **blank cell**
- Backorder items: **ETA info** ("Please Call Customer Service", dates, etc.)
- Not found items: **"Not Found"**

### Backorder Sheet (Auto-synced)
- Shows **only current backorder items** from Fabrics column J
- **No duplicates** - completely replaced each run
- Headers: Timestamp | Supplier | Collection | Pattern | Colour | Backorder Status | etc.

### Status Sheet (System Monitoring)
```
System Status                    → Healthy / Warning / Critical
Login Status                    → Success / Failed
Last Scrape                     → Thursday, July 3, 2025 at 09:27:05 AM
Last Scrape Duration            → 8.45 minutes
Items "Not Found" in Last Scrape → 2
Items on Backorder              → 3
Total Items Processed           → 44
Navigation Errors               → 0
Timeout Errors                  → 0
```

## System Health Statuses

- **Healthy**: All systems working perfectly
- **Warning - Some Errors**: Minor issues, mostly functional
- **Warning - Network Issues**: Navigation/timeout problems  
- **Degraded - High Error Rate**: >30% error rate
- **Critical - Login Failed**: Authentication failure

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

2. **Add GitHub repository secrets:**
   - `NEW_SUPPLIER_USERNAME`
   - `NEW_SUPPLIER_PASSWORD`

3. **Update filtering logic** in `googleSheets.js` to include the new supplier

## Local Development

1. **Clone and install:**
   ```bash
   git clone <your-repo>
   cd fabric-stock-checker
   npm install
   ```

2. **Create `.env` file:**
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY_FILE=path/to/service-account-key.json
   GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
   UNIQUE_USERNAME=your_username
   UNIQUE_PASSWORD=your_password
   DEV_MODE=true
   ```

3. **Test locally:**
   ```bash
   npm start
   ```

## Troubleshooting

### GitHub Actions Issues
1. **Check Actions tab** for error logs
2. **Verify all 4 secrets** are set correctly
3. **Check Status sheet** for system health
4. **Use manual trigger** for immediate testing

### Common Issues

1. **Google Sheets permission errors:**
   - Service account needs Editor access to spreadsheet
   - Verify spreadsheet ID is correct

2. **Login failures:**
   - Check credentials in repository secrets
   - Monitor for website changes/CAPTCHA

3. **No updates happening:**
   - Verify workflow is enabled in Actions tab
   - Check if fabrics have Supplier = "Unique" (case-sensitive)

## Migration from Railway

If migrating from Railway:
1. **Remove old Railway environment variables**
2. **Set up GitHub repository secrets** as listed above
3. **Remove Railway deployment** to avoid double-processing
4. **Test with manual GitHub Actions run**

## Benefits of GitHub Actions

- **Cost**: $0/month (vs $5+/month Railway)
- **Reliability**: GitHub's enterprise infrastructure
- **Monitoring**: Built-in Actions interface with 90-day logs
- **Simplicity**: No server management, runs fresh each time
- **Scalability**: Within GitHub's generous free tier limits

## Security

- **Never commit credentials** to the repository
- **Use GitHub secrets** for all sensitive data
- **Service account has minimal permissions** (Sheets Editor only)
- **Credentials encrypted** in GitHub's secret management

## Support

For issues:
1. **Check GitHub Actions logs** in the Actions tab
2. **Review Status sheet** for system health indicators
3. **Verify Google Sheets permissions** and formatting
4. **Test supplier credentials** manually
5. **Use manual workflow trigger** for immediate debugging

The system is designed to handle temporary failures gracefully and will retry on the next scheduled run.