const supplierConfigs = {
  unique: {
    name: 'Unique Fine Fabrics',
    loginUrl: 'https://uniquefinefabrics.mi-amigo.net/amigo/Account/Login.aspx?Serial=20001&Company=10',
    usernameField: '[name="ctl00$MainContent$LoginUser$UserName"]',
    passwordField: '[name="ctl00$MainContent$LoginUser$Password"]',
    loginButton: '[name="ctl00$MainContent$LoginUser$LoginButton"]',
    postLoginNavigation: {
      fabricCollectionsSelector: 'a.home-grid-item-button[href*="Fabric Collections"]',
      waitForSelector: '.home-grid-item-button'
    },
    searchConfig: {
      collectionSearchMethod: 'navigation',
      patternSearchMethod: 'browse',
      etaElementId: 'MainContent_FormView_Product_ETALabel'
    },
    selectors: {
      collections: '.card-body .align-content-center .colorSpan',
      collectionName: '.card-body .align-content-center .colorSpan',
      patterns: '.card-body a.align-content-center',
      patternName: '.card-body a.align-content-center',
      colorOptions: '.card-body a.align-content-center',
      colorName: '.card-body a.align-content-center',
      etaLabel: '#MainContent_FormView_Product_ETALabel',
      pagination: '#MainContent_ListView_Products_DivPager2',
      sidebar: '#MenuPanelDiv',
      sidebarLinks: '#MenuPanelDiv .navClickable a'
    }
  },
  alendel: {
    name: 'Alendel',
    loginUrl: 'https://www.alendel.com/login?returnUrl=%2F',
    usernameField: '#Email',
    passwordField: '#Password',
    loginButton: 'button[type="submit"]',
    postLoginNavigation: {
      searchSelector: '#small-searchterms',
      waitForSelector: '#small-searchterms'
    },
    searchConfig: {
      searchMethod: 'direct',
      searchInputId: 'small-searchterms',
      pageSizeSelector: '#products-pagesize',
      pageSizeValue: '96'
    },
    selectors: {
      searchInput: '#small-searchterms',
      searchButton: 'button[type="submit"]',
      pageSize: '#products-pagesize',
      products: '.product-item',
      productSku: '.sku',
      productTitle: '.product-title a',
      productPicture: '.picture a',
      stockContainer: '.availability .stock',
      stockQuantity: '.value .stockquantity',
      pagination: '.pager',
      nextPage: '.pager .next-page'
    }
  }
  // Future suppliers can be added here with their specific configurations
};

module.exports = supplierConfigs;