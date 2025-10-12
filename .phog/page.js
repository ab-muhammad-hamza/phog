LiteFramework.prototype.loadPage = async function(componentPath) {
  try {
    if (this.debug) console.log('Loading page:', `${this.baseUrl}${this.basePath}/${componentPath}`);
    const response = await fetch(`${this.baseUrl}${this.basePath}/${componentPath}`);
    if (!response.ok) {
      throw new Error(`Failed to load page: ${response.status} ${response.statusText}`);
    }
    
    let html = await response.text();
    if (this.debug) console.log('Original HTML loaded:', html.substring(0, 200) + '...');
    
    // Process components first
    html = await this.processComponents(html);
    if (this.debug) console.log('After component processing:', html.substring(0, 200) + '...');
    
    // Then process asset paths
    html = this.processAssetPaths(html);
    
    this.appContainer.innerHTML = html;
    
    // Execute any inline scripts and initialize components
    this.executeScripts();
    this.initializeComponentInstances();
  } catch (error) {
    console.error('Failed to load page:', error);
    this.appContainer.innerHTML = '<h1>Page not found</h1>';
  }
};

LiteFramework.prototype.executeScripts = function() {
  const scripts = this.appContainer.querySelectorAll('script');
  scripts.forEach(script => {
    const newScript = document.createElement('script');
    if (script.src) {
      newScript.src = script.src;
    } else {
      newScript.textContent = script.textContent;
    }
    document.head.appendChild(newScript);
  });
};

window.addEventListener('popstate', () => {
  const path = location.pathname.replace('/', '') || 'index.html';
  app.loadPage(path);
});

document.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const href = a.getAttribute('href');
    history.pushState({}, '', href);
    app.loadPage(href);
  });
});
