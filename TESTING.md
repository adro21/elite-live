# Testing the Alendel Scraper

## Prerequisites

1. **Environment Setup**:
   ```bash
   # Make sure you have your .env file with Google Sheets credentials
   cp .env.example .env
   # Edit .env with your GOOGLE_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_KEY_JSON
   ```

2. **Dependencies**:
   ```bash
   npm install
   ```

3. **Test Data**: Make sure your Google Sheet has some rows with "Alendel" in the Supplier column (Column A).

## Testing Options

### 1. Quick Login Test
Test just the login functionality:
```bash
node test-alendel.js --login-only
```

### 2. Search Specific Pattern
Test searching for a specific pattern and color:
```bash
node test-alendel.js --search "PATTERN_NAME" "COLOR_NAME"
```

### 3. Full Automated Test
Run complete test with sheet data:
```bash
node test-alendel.js
```

### 4. Visual Debug Mode
Run with browser visible (great for debugging):
```bash
node test-alendel.js --headful
```

## Expected Results

### ✅ Success Cases:
- **Login**: Should see "✅ Login successful!"
- **Product Found (In Stock)**: "✅ Product found and is IN STOCK"
- **Product Found (Out of Stock)**: "✅ Product found but is OUT OF STOCK: Out of stock"

### ❌ Failure Cases:
- **Login Failed**: Check credentials or network connection
- **Product Not Found**: "❌ Product NOT FOUND in search results"
- **Search Failed**: Network or selector issues

## Debugging Tips

1. **Use Headful Mode**: `node test-alendel.js --headful` to see what's happening
2. **Check Console**: Look for detailed error messages
3. **Network Issues**: Try with a VPN or different connection
4. **Website Changes**: Selectors might need updating if Alendel changed their site

## Testing the Full Integration

Once individual tests pass, test the complete workflow:

```bash
# Run the full scraper (will process both Unique and Alendel)
node index.js
```

## Manual Website Testing

You can also manually test the website flow:

1. Go to: https://www.alendel.com/login?returnUrl=%2F
2. Login with: `agnes@elitewf.com` / `elitewf2025`
3. Use the search box (id="small-searchterms") to search for patterns
4. Change page size to 96 items
5. Look for products that contain both pattern and color
6. Click into products and check for "Out of stock" in the stock section

## Common Issues

### Login Problems
- **Credential Error**: Double-check username/password
- **Captcha**: Website might have added captcha
- **Rate Limiting**: Wait a few minutes between attempts

### Search Problems
- **No Results**: Pattern might not exist or be spelled differently
- **Timeout**: Increase timeout values in scraper
- **Selector Changes**: Website might have changed their HTML structure

### Stock Detection Problems
- **Different Stock Text**: Check if they use different text than "Out of stock"
- **Dynamic Loading**: Stock info might load via JavaScript

## Next Steps

After successful testing:
1. Add more test patterns to your sheet
2. Schedule the scraper to run regularly
3. Monitor the Status sheet for any issues
4. Set up alerts for scraper failures