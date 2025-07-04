# GitHub Actions Setup for Fabric Stock Checker

## Overview
This system runs on **GitHub Actions for completely free** operation, providing:
- **Cost**: $0/month (within GitHub's generous 2,000 minute/month free tier)
- **Reliability**: Runs daily at 1 AM EST automatically on GitHub's infrastructure
- **Monitoring**: Full logs, status tracking, and 90-day retention
- **Intelligence**: Smart backorder syncing and system health monitoring

## Latest Features (2025)
- ✅ **Intelligent Backorder Syncing**: No duplicates, reflects true current state
- ✅ **Professional Status Sheet**: System health monitoring with smart status detection
- ✅ **Sidebar Navigation**: Bypasses pagination issues for reliable fabric finding
- ✅ **State Transition Tracking**: Monitors items moving between available/backorder
- ✅ **Proper Sheet Headers**: Clean, professional Google Sheets structure

## Setup Instructions

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Deploy fabric stock checker to GitHub Actions"
git push origin main
```

### 2. Set up Repository Secrets
Go to your GitHub repository → **Settings** → **Secrets and Variables** → **Actions**

Add these **4 Repository Secrets**:

- `UNIQUE_USERNAME`: Your Unique Fine Fabrics username
- `UNIQUE_PASSWORD`: Your Unique Fine Fabrics password  
- `GOOGLE_SPREADSHEET_ID`: Your Google Sheets ID (from the URL)
- `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`: Your Google service account JSON (entire file content)

### 3. How to Find Your Google Sheets ID
From a URL like: `https://docs.google.com/spreadsheets/d/1ABC123xyz/edit`
The ID is: `1ABC123xyz`

### 4. Google Service Account JSON Setup
1. Download your service account JSON file from Google Cloud Console
2. Open the file and **copy the entire JSON content**
3. Paste the complete JSON into the `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` secret
4. **Important**: Copy the ENTIRE file content, including all braces `{}`

## Google Sheets Structure

The system automatically creates and manages these sheets:

### "Fabrics" Sheet
- **Column J**: ETA information (updated automatically)
- Available items: **blank cells**
- Backorder items: **ETA details** ("Please Call Customer Service", dates, etc.)
- Not found items: **"Not Found"**

### "Backorder" Sheet (Auto-managed)
- **Intelligent syncing**: Shows only current backorder items
- **No duplicates**: Completely replaced each run
- **Professional headers**: Timestamp, Supplier, Collection, etc.

### "Status" Sheet (System Health)
```
System Status              → Healthy / Warning / Critical
Login Status              → Success / Failed
Last Scrape               → Thursday, July 3, 2025 at 09:27:05 AM
Last Scrape Duration      → 8.45 minutes
Items "Not Found"         → 2
Items on Backorder        → 3
Total Items Processed     → 44
Navigation Errors         → 0
Timeout Errors           → 0
```

## System Health Monitoring

The Status sheet automatically shows intelligent health assessments:

- **Healthy**: All systems working perfectly
- **Warning - Some Errors**: Minor issues, mostly functional  
- **Warning - Network Issues**: Navigation/timeout problems
- **Degraded - High Error Rate**: >30% error rate
- **Critical - Login Failed**: Authentication failure

## Testing & Operation

### Manual Test Run
1. Go to **Actions** tab in your GitHub repository
2. Click **"Daily Fabric Stock Check"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Watch **real-time execution logs**
5. Check **Status sheet** for results summary

### Automatic Scheduling
- **Daily at 1 AM EST** (6 AM UTC)
- **Completely automated** - no intervention needed
- **Free operation** within GitHub's 2,000 minute/month limit
- **90-day log retention** for debugging

### What Happens Each Run
1. **Authenticates** with Unique Fine Fabrics portal
2. **Processes each fabric** marked as Supplier = "Unique" 
3. **Updates column J** with current availability/ETA status
4. **Syncs Backorder sheet** with only current backorder items
5. **Updates Status sheet** with comprehensive system health metrics
6. **Logs everything** to GitHub Actions for monitoring

## Monitoring & Debugging

### GitHub Actions Interface
- **Run History**: See all executions and their status
- **Real-time Logs**: Watch runs as they happen
- **Error Details**: Full stack traces for debugging
- **Manual Triggers**: Test immediately without waiting

### Google Sheets Monitoring
- **Status Sheet**: System health dashboard
- **Backorder Sheet**: Current items needing attention
- **Fabrics Sheet**: Updated ETA information in column J

## Benefits Over Other Platforms

| Feature | GitHub Actions | Railway | Heroku | Render |
|---------|---------------|---------|--------|--------|
| **Cost** | $0/month | $5+/month | $25+/month | $7+/month |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Logs** | 90 days | Limited | Limited | Limited |
| **Cron Jobs** | Native | Manual | Add-on | Native |
| **Setup** | Simple | Medium | Complex | Medium |

## Troubleshooting

### Run Failures
1. **Check Actions tab** for detailed error logs
2. **Verify all 4 secrets** are correctly set
3. **Check Status sheet** for specific health indicators
4. **Use manual trigger** for immediate testing

### Common Issues

**"No Google credentials configured"**
- Verify `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` secret contains complete JSON

**"Login failed"**
- Check `UNIQUE_USERNAME` and `UNIQUE_PASSWORD` secrets
- Test credentials manually on Unique website

**"Items not updating"**
- Ensure fabrics have `Supplier = "Unique"` (case-sensitive)
- Check Google Sheets permissions for service account

**"Status sheet looks wrong"**
- System auto-creates proper structure on first run
- Manual clearing may require re-running to fix

### Migration from Railway

If switching from Railway:
1. **Disable Railway deployment** (to avoid conflicts)
2. **Set up GitHub secrets** as described above
3. **Test with manual GitHub Actions run**
4. **Remove Railway environment variables**

## Advanced Configuration

### Changing Schedule
Edit `.github/workflows/fabric-stock-check.yml`:
```yaml
schedule:
  - cron: '0 6 * * *'  # 6 AM UTC = 1 AM EST
```

### Adding Debug Logging
Temporarily add to workflow environment:
```yaml
env:
  LOG_LEVEL: debug
```

## Security Best Practices

- ✅ **Never commit credentials** to repository
- ✅ **Use GitHub secrets** for all sensitive data
- ✅ **Service account minimal permissions** (Google Sheets Editor only)
- ✅ **Regular credential rotation** if needed
- ✅ **Repository access controls** (private recommended)

## Support & Maintenance

For issues or questions:
1. **Review GitHub Actions logs** first
2. **Check Status sheet** for system health indicators  
3. **Test credentials manually** if authentication fails
4. **Use manual workflow triggers** for immediate debugging
5. **Monitor Google Sheets permissions** periodically

The system is designed for **zero-maintenance operation** with comprehensive error handling and automatic recovery on the next scheduled run.