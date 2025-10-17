class Phog {
  constructor(config = {}) {
    this.routes = {};
    this.components = new Map();
    this.componentInstances = new Map();
    this.env = {};
    this.currentRoute = '';
    this.appContainer = null;
    this.basePath = config.basePath || 'src';
    this.assetsPath = config.assetsPath || 'src/assets';
    this.componentsPath = config.componentsPath || 'src/components';
    this.baseUrl = config.baseUrl || '/';
    this.debug = config.debug || false;
    
    if (this.debug) console.log('Framework initialized with config:', { basePath: this.basePath, assetsPath: this.assetsPath, baseUrl: this.baseUrl });
    
    this.init();
  }

  async init() {
    if (this.debug) console.log('Starting framework initialization...');
    await this.loadEnv();
    await this.loadRoutes();
    await this.loadAppWrapper();
    this.setupRouter();
    this.handleRoute();
  }
}
document.addEventListener('DOMContentLoaded', () => {
  if (window.app && window.app.debug) console.log('DOM loaded, initializing framework...');
  window.app = new Phog();
});