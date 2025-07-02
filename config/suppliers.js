const supplierConfigs = {
  unique: {
    name: 'Unique Fine Fabrics',
    loginUrl: 'https://uniquefinefabrics.mi-amigo.net/amigo/Account/Login.aspx?Serial=20001&Company=10',
    usernameField: '#MainContent_Login_UserName',
    passwordField: '#MainContent_Login_Password',
    loginButton: '#MainContent_Login_LoginButton',
    postLoginNavigation: {
      fabricCollectionsSelector: 'a.home-grid-item-button[href*="Fabric Collections"]',
      waitForSelector: '.home-grid-item-button'
    },
    searchConfig: {
      collectionSearchMethod: 'navigation', // or 'search'
      patternSearchMethod: 'browse',
      etaElementId: 'MainContent_FormView_Product_ETALabel'
    },
    selectors: {
      collections: '.collection-item, .fabric-collection',
      collectionName: '.collection-name, h2, h3',
      patterns: '.pattern-item, .fabric-pattern',
      patternName: '.pattern-name, .product-title',
      colorOptions: '.color-option, .color-swatch',
      colorName: '.color-name, .color-title',
      etaLabel: '#MainContent_FormView_Product_ETALabel'
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