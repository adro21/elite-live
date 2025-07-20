require('dotenv').config();
const FabricScraper = require('./services/fabricScraper');
const GoogleSheetsService = require('./services/googleSheets');
const logger = require('./services/logger');

class AlendelTester {
  constructor() {
    this.scraper = new FabricScraper();
    this.googleSheets = new GoogleSheetsService();
  }

  async testLogin() {
    console.log('\n=== Testing Alendel Login ===');
    try {
      await this.scraper.initialize();
      await this.scraper.loginToAlendel();
      console.log('✅ Login successful!');
      return true;
    } catch (error) {
      console.log('❌ Login failed:', error.message);
      return false;
    }
  }

  async testSearch(pattern, color) {
    console.log(`\n=== Testing Search for "${pattern}" - "${color}" ===`);
    try {
      const fabricData = {
        supplierPattern: pattern,
        supplierColor: color
      };
      
      const result = await this.scraper.searchAlendelFabric(fabricData);
      
      if (result === null) {
        console.log('✅ Product found and is IN STOCK');
      } else if (result === false) {
        console.log('❌ Product NOT FOUND in search results');
      } else {
        console.log(`⚠️ Product found but is OUT OF STOCK: ${result}`);
      }
      
      return result;
    } catch (error) {
      console.log('❌ Search failed:', error.message);
      return false;
    }
  }

  async testWithSheetData() {
    console.log('\n=== Testing with Real Sheet Data ===');
    try {
      await this.googleSheets.initialize();
      const alendelFabrics = await this.googleSheets.getFabricData('alendel');
      
      console.log(`Found ${alendelFabrics.length} Alendel fabrics in the sheet`);
      
      if (alendelFabrics.length === 0) {
        console.log('❌ No Alendel fabrics found in sheet. Make sure you have items with "Alendel" in the Supplier column.');
        return;
      }

      // Test with first 3 fabrics from the sheet
      const testFabrics = alendelFabrics.slice(0, 3);
      
      for (const fabric of testFabrics) {
        console.log(`\nTesting: ${fabric.supplierPattern} - ${fabric.supplierColor}`);
        const result = await this.testSearch(fabric.supplierPattern, fabric.supplierColor);
        
        // Add delay between tests
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.log('❌ Sheet data test failed:', error.message);
    }
  }

  async testSpecificItem(rowNumber) {
    console.log(`\n=== Testing Specific Item (Row ${rowNumber}) ===`);
    try {
      await this.googleSheets.initialize();
      const alendelFabrics = await this.googleSheets.getFabricData('alendel');
      
      if (alendelFabrics.length === 0) {
        console.log('❌ No Alendel fabrics found in sheet.');
        return;
      }

      const targetIndex = rowNumber - 1; // Convert to 0-based index
      if (targetIndex >= 0 && targetIndex < alendelFabrics.length) {
        const fabric = alendelFabrics[targetIndex];
        console.log(`Testing Row ${rowNumber}: ${fabric.supplierPattern} - ${fabric.supplierColor}`);
        const result = await this.testSearch(fabric.supplierPattern, fabric.supplierColor);
        return result;
      } else {
        console.log(`❌ Row ${rowNumber} not found. Available rows: 1-${alendelFabrics.length}`);
      }
      
    } catch (error) {
      console.log('❌ Specific item test failed:', error.message);
    }
  }

  async testFullWorkflow() {
    console.log('\n=== Testing Complete Alendel Workflow ===');
    
    // Test login first
    const loginSuccess = await this.testLogin();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without successful login');
      return;
    }

    // Test with sample data first (skip if no real data)
    console.log('\n--- Testing with sample patterns ---');
    // await this.testSearch('SAMPLE_PATTERN', 'SAMPLE_COLOR');
    
    // Test with real sheet data
    await this.testWithSheetData();
  }

  async runManualTest() {
    console.log('🧪 Starting Alendel Scraper Tests...');
    
    try {
      await this.testFullWorkflow();
    } catch (error) {
      console.log('❌ Test failed:', error.message);
    } finally {
      await this.scraper.close();
      console.log('\n✅ Test completed, browser closed');
    }
  }

  async runHeadfulTest() {
    console.log('🧪 Starting Alendel Scraper Tests (Headful Mode)...');
    
    try {
      // Initialize with headful mode for debugging
      this.scraper.browser = await require('puppeteer').launch({
        headless: false, // Show browser
        slowMo: 1000,    // Slow down actions
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      this.scraper.page = await this.scraper.browser.newPage();
      await this.scraper.page.setViewport({ width: 1366, height: 768 });
      
      await this.testFullWorkflow();
      
      console.log('\n⏸️  Browser kept open for inspection. Close manually when done.');
      
    } catch (error) {
      console.log('❌ Headful test failed:', error.message);
      await this.scraper.close();
    }
  }
}

// Command line interface
const args = process.argv.slice(2);
const tester = new AlendelTester();

if (args.includes('--headful')) {
  tester.runHeadfulTest();
} else if (args.includes('--login-only')) {
  tester.testLogin().then(() => tester.scraper.close());
} else if (args.includes('--search') && args.length >= 3) {
  const pattern = args[args.indexOf('--search') + 1];
  const color = args[args.indexOf('--search') + 2];
  tester.testLogin().then(() => {
    return tester.testSearch(pattern, color);
  }).then(() => tester.scraper.close());
} else if (args.includes('--row') && args.length >= 2) {
  const rowNumber = parseInt(args[args.indexOf('--row') + 1]);
  tester.testLogin().then(() => {
    return tester.testSpecificItem(rowNumber);
  }).then(() => tester.scraper.close());
} else {
  tester.runManualTest();
}