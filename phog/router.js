Phog.prototype.setupRouter = function() {
  if (this.debug) console.log('Setting up SPA router...');

  this.lastPathname = window.location.pathname;

  window.addEventListener('popstate', () => {
    if (window.location.pathname === this.lastPathname) {
      if (this.debug) console.log('Hash changed only, skipping route handler');
      return;
    }
    this.lastPathname = window.location.pathname;
    this.handleRoute();
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    
    const isExternal = href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');
    
    const isHashOnly = href.startsWith('#') || 
                       (link.pathname === window.location.pathname && link.hash);
    
    const hasSpecialAttr = link.target === '_blank' || 
                          link.hasAttribute('download') || 
                          link.hasAttribute('data-external') || 
                          link.hasAttribute('data-reload');

    if (!href || isExternal || isHashOnly || hasSpecialAttr) {
      return;
    }

    e.preventDefault();
    this.navigateTo(href);
  });

  if (this.debug) console.log('SPA router initialized');
};

Phog.prototype.navigateTo = function(path) {
  if (this.debug) console.log(`Navigating to: ${path}`);
  history.pushState(null, '', path);
  this.handleRoute();
};

Phog.prototype.loadRoutes = async function() {
  try {
    const response = await fetch(`${this.baseUrl}${this.basePath}/routes.json`);
    if (!response.ok) throw new Error(`Failed to load routes: ${response.status}`);
    this.routes = await response.json();
    if (this.debug) console.log('Routes loaded:', this.routes);
  } catch (error) {
    console.error('Error loading routes:', error);
    this.routes = {};
  }
};

Phog.prototype.handleRoute = async function() {
  const path = window.location.pathname;
  if (this.debug) console.log(`Handling route: ${path}`);

  const route = this.routes[path];

  if (route) {
    if (route.title) document.title = route.title;
    await this.loadPage(route.component);
  } else {
    console.warn(`Route not found: ${path}`);
    await this.render404();
  }
};

Phog.prototype.loadAppWrapper = async function() {
  try {
    const response = await fetch(`${this.baseUrl}${this.basePath}/app.html`);
    if (!response.ok) throw new Error(`Failed to load app wrapper: ${response.status}`);
    
    const html = await response.text();
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';

    document.body.insertAdjacentHTML('beforeend', html);
    this.appContainer = document.getElementById('app-content');

    if (this.debug) console.log('App wrapper loaded');
  } catch (error) {
    console.error('Error loading app wrapper:', error);
  }
};

Phog.prototype.render404 = async function() {
  if (!this.appContainer) return;
  try {
    const response = await fetch(`${this.baseUrl}${this.basePath}/NotFound.html`);
    if (!response.ok) throw new Error('NotFound.html file failed to load');
    
    let html = await response.text();
    html = this.processEnvVariables(html);
    html = await this.processComponents(html);
    html = this.processAssetPaths(html);
    this.appContainer.innerHTML = html;
    
    this.initializeComponentInstances();
    this.executePageScripts();
  } catch (error) {
    console.error('Error rendering 404 page:', error);
    this.appContainer.innerHTML = `404, page not found`;
  }
};

Phog.prototype.go = function(path, options = {}) {
  if (options.reload) {
    window.location.href = path;
  } else {
    this.navigateTo(path);
  }
};

Phog.prototype.replace = function(path) {
  if (this.debug) console.log(`Replacing current route with: ${path}`);
  history.replaceState(null, '', path);
  this.handleRoute();
};

Phog.prototype.loadPage = async function(pagePath) {
  if (!this.appContainer) {
    console.error('App container not found');
    return;
  }
  try {
    if (this.debug) console.log(`Loading page: ${pagePath}`);
    const response = await fetch(`${this.baseUrl}${this.basePath}/${pagePath}`);
    if (!response.ok) throw new Error(`Failed to load page: ${response.status}`);

    let html = await response.text();
    html = this.processEnvVariables(html);
    html = await this.processComponents(html);
    html = this.processAssetPaths(html);

    this.appContainer.innerHTML = html;
    this.initializeComponentInstances();
    this.executePageScripts();

    if (this.debug) console.log('Page loaded successfully');
  } catch (error) {
    console.error('Error loading page:', error);
    this.appContainer.innerHTML = `<p>Error: Failed to load page: ${error.message}</p>`;
  }
};

Phog.prototype.executePageScripts = function() {
  this.appContainer.querySelectorAll('script').forEach(script => {
    const newScript = document.createElement('script');
    Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
    newScript.textContent = script.textContent;
    script.parentNode.replaceChild(newScript, script);
  });
};