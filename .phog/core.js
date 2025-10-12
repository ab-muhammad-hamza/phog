class LiteFramework {
  constructor(config = {}) {
    this.routes = {};
    this.components = new Map();
    this.componentInstances = new Map();
    this.currentRoute = '';
    this.appContainer = null;
    this.basePath = config.basePath || 'src';
    this.assetsPath = config.assetsPath || 'src/assets';
    this.baseUrl = config.baseUrl || '/';
    this.debug = config.debug || false;
    
    if (this.debug) console.log('Framework initialized with config:', { basePath: this.basePath, assetsPath: this.assetsPath, baseUrl: this.baseUrl });
    
    this.init();
  }

  async init() {
    if (this.debug) console.log('Starting framework initialization...');
    
    // Load routes configuration
    await this.loadRoutes();
    
    // Load app wrapper
    await this.loadAppWrapper();
    
    // Set up routing
    this.setupRouter();
    
    // Handle initial route
    this.handleRoute();
  }
}

// Initialize framework when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.app && window.app.debug) console.log('DOM loaded, initializing framework...');
  window.app = new LiteFramework();
});