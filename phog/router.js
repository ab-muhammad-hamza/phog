LiteFramework.prototype.loadRoutes = async function() {
  try {
    if (this.debug) console.log('Loading routes from:', `${this.baseUrl}${this.basePath}/routes.json`);
    const response = await fetch(`${this.baseUrl}${this.basePath}/routes.json`);
    if (!response.ok) {
      throw new Error(`Failed to load routes: ${response.status} ${response.statusText}`);
    }
    this.routes = await response.json();
    if (this.debug) console.log('Routes loaded:', this.routes);
  } catch (error) {
    console.error('Failed to load routes:', error);
  }
};

LiteFramework.prototype.loadAppWrapper = async function() {
  try {
    if (this.debug) console.log('Loading app wrapper from:', `${this.baseUrl}${this.basePath}/app.html`);
    const response = await fetch(`${this.baseUrl}${this.basePath}/app.html`);
    if (!response.ok) {
      throw new Error(`Failed to load app wrapper: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    document.body.innerHTML = this.processAssetPaths(html);
    this.appContainer = document.getElementById('app-content');
    if (this.debug) console.log('App wrapper loaded, container found:', !!this.appContainer);
  } catch (error) {
    console.error('Failed to load app wrapper:', error);
  }
};

LiteFramework.prototype.setupRouter = function() {
  // Handle back/forward navigation
  window.addEventListener('popstate', () => this.handleRoute());
  
  // Handle link clicks
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-route]')) {
      e.preventDefault();
      const route = e.target.getAttribute('data-route');
      this.navigate(route);
    }
  });
};

LiteFramework.prototype.navigate = function(route) {
  if (this.debug) console.log('Navigating to:', route);
  history.pushState({}, '', route);
  this.handleRoute();
};

LiteFramework.prototype.handleRoute = async function() {
  const path = window.location.pathname === '/' ? '/home' : window.location.pathname;
  const route = this.routes[path];
  
  if (this.debug) console.log('Handling route:', path, 'Route config:', route);
  
  if (route && this.appContainer) {
    await this.loadPage(route.component);
    this.currentRoute = path;
  } else {
    if (this.debug) console.warn('Route not found or no app container');
    this.show404();
  }
};

LiteFramework.prototype.show404 = function() {
  if (this.appContainer) {
    this.appContainer.innerHTML = '<h1>404 - Page Not Found</h1>';
  }
};