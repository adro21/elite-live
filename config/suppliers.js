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
  }
  // Future suppliers can be added here with their specific configurations
  // example: {
  //   name: 'Example Supplier',
  //   loginUrl: 'https://example.com/login',
  //   usernameField: '#username',
  //   passwordField: '#password',
  //   loginButton: '#login-btn',
  //   ...
  // }
};

module.exports = supplierConfigs;