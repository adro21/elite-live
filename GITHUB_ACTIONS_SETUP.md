# GitHub Actions Setup for Fabric Stock Checker

## Overview
This system now runs on GitHub Actions instead of Railway, providing:
- **Cost**: Completely free (within GitHub's generous limits)
- **Reliability**: Runs daily at 1 AM EST automatically
- **Monitoring**: Full logs and status tracking in GitHub

## Setup Instructions

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Migrate to GitHub Actions from Railway"
git push origin main
```

### 2. Set up Repository Secrets
Go to your GitHub repository → Settings → Secrets and Variables → Actions

Add these **Repository Secrets**:

- `UNIQUE_USERNAME`: Your Unique Fine Fabrics username
- `UNIQUE_PASSWORD`: Your Unique Fine Fabrics password  
- `GOOGLE_SPREADSHEET_ID`: Your Google Sheets ID (from the URL)
- `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`: Your Google service account JSON (entire file content)

### 3. How to Find Your Google Sheets ID
From a URL like: `https://docs.google.com/spreadsheets/d/1ABC123xyz/edit`
The ID is: `1ABC123xyz`

### 4. Google Service Account JSON
Copy the entire content of your `elite-live-464722-ae42e6f8ca03.json` file into the `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` secret.

## Testing

### Manual Test
1. Go to Actions tab in your GitHub repository
2. Click "Daily Fabric Stock Check"
3. Click "Run workflow" → "Run workflow"
4. Monitor the run in real-time

### Scheduled Runs
The system automatically runs daily at 1 AM EST (6 AM UTC).

## Monitoring

- **GitHub Actions**: View run history, logs, and status
- **Google Sheets Status Tab**: Shows detailed run information
- **Logs**: Available in GitHub Actions for 90 days

## Benefits Over Railway

- **Cost**: $0/month vs $5/month
- **Reliability**: GitHub's infrastructure
- **Monitoring**: Built-in GitHub Actions interface
- **Logs**: 90-day retention vs limited Railway logs
- **No sleep issues**: Runs fresh each time

## Troubleshooting

If a run fails:
1. Check the Actions tab for error logs
2. Verify all secrets are set correctly
3. Check the Status sheet for system health info
4. Manual trigger available for immediate testing