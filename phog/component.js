LiteFramework.prototype.processComponents = async function(html) {
  if (this.debug) console.log('Processing components in HTML...');
  
  // Find all component tags - improved regex to handle both self-closing and paired tags
  const componentRegex = /<([A-Z]\w*)([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/\1>)/g;
  let processedHtml = html;
  
  const matches = [...html.matchAll(componentRegex)];
  if (this.debug) console.log('Found potential components:', matches.map(m => m[1]));
  
  for (const match of matches) {
    const [fullMatch, componentName, attributes, content] = match;
    
    if (this.debug) console.log('Processing element:', componentName);
    
    // Skip standard HTML elements (but components should start with capital letter anyway)
    if (this.isStandardHtmlElement(componentName)) {
      if (this.debug) console.log(`Skipping standard HTML element: ${componentName}`);
      continue;
    }
    
    if (this.debug) console.log(`Loading custom component: ${componentName}`);
    
    try {
      const componentHtml = await this.loadComponent(componentName);
      const props = this.parseAttributes(attributes);
      const renderedComponent = this.renderComponent(componentHtml, props, content || '');
      
      if (this.debug) console.log(`Rendered component ${componentName}:`, renderedComponent.substring(0, 100));
      
      processedHtml = processedHtml.replace(fullMatch, renderedComponent);
    } catch (error) {
      console.warn(`Failed to load component ${componentName}:`, error);
      processedHtml = processedHtml.replace(fullMatch, `<!-- Component ${componentName} failed to load: ${error.message} -->`);
    }
  }
  
  return processedHtml;
};

LiteFramework.prototype.loadComponent = async function(componentName) {
  if (this.components.has(componentName)) {
    if (this.debug) console.log(`Component ${componentName} found in cache`);
    return this.components.get(componentName);
  }
  
  const componentPath = `${this.baseUrl}${this.basePath}/components/${componentName.toLowerCase()}.html`;
  if (this.debug) console.log(`Loading component from: ${componentPath}`);
  
  const response = await fetch(componentPath);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const html = await response.text();
  if (this.debug) console.log(`Component ${componentName} loaded successfully`);
  
  this.components.set(componentName, html);
  return html;
};

LiteFramework.prototype.parseAttributes = function(attributeString) {
  const props = {};
  const attrRegex = /(\w+)=["']([^"']*)["']/g;
  let match;
  
  while ((match = attrRegex.exec(attributeString)) !== null) {
    const [, key, value] = match;
    props[key] = value;
  }
  
  if (this.debug) console.log('Parsed attributes:', props);
  return props;
};

LiteFramework.prototype.renderComponent = function(template, props, content = '') {
  let rendered = template;
  
  // Replace {{prop}} with actual values
  rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, propName) => {
    const value = props[propName] || '';
    if (this.debug) console.log(`Replacing ${match} with: ${value}`);
    return value;
  });
  
  // Replace {{children}} with slot content
  rendered = rendered.replace(/\{\{children\}\}/g, content);
  
  // Process asset paths in components too
  rendered = this.processAssetPaths(rendered);
  
  return rendered;
};

LiteFramework.prototype.processAssetPaths = function(html) {
  // Replace @assets/ with actual asset path
  return html.replace(/@assets\//g, `${this.baseUrl}${this.assetsPath}/`);
};

LiteFramework.prototype.initializeComponentInstances = function() {
  // Find and initialize components with data-component attribute
  const componentElements = document.querySelectorAll('[data-component]');
  if (this.debug) console.log(`Found ${componentElements.length} component instances to initialize`);
  
  componentElements.forEach(element => {
    const componentName = element.getAttribute('data-component');
    const componentId = this.generateComponentId();
    
    element.setAttribute('data-component-id', componentId);
    
    // Store component instance for potential state management
    this.componentInstances.set(componentId, {
      name: componentName,
      element: element,
      state: {}
    });
    
    // Initialize component-specific logic
    this.initializeComponentLogic(element, componentName);
  });
};

LiteFramework.prototype.initializeComponentLogic = function(element, componentName) {
  // Handle component-specific interactions
  const buttons = element.querySelectorAll('[data-action]');
  buttons.forEach(button => {
    const action = button.getAttribute('data-action');
    button.addEventListener('click', (e) => {
      this.handleComponentAction(element, componentName, action, e);
    });
  });
};

LiteFramework.prototype.handleComponentAction = function(element, componentName, action, event) {
  // This can be extended for component-specific actions
  const componentId = element.getAttribute('data-component-id');
  const instance = this.componentInstances.get(componentId);
  
  if (this.debug) console.log(`Component action triggered: ${componentName}.${action}`);
  
  // Example: emit custom events
  const customEvent = new CustomEvent(`component-${action}`, {
    detail: { componentName, componentId, instance, originalEvent: event }
  });
  
  element.dispatchEvent(customEvent);
};

LiteFramework.prototype.generateComponentId = function() {
  return `comp_${Math.random().toString(36).substr(2, 9)}`;
};

LiteFramework.prototype.isStandardHtmlElement = function(tagName) {
  const standardElements = [
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'img', 'button', 'input', 'form', 'ul', 'ol', 'li',
    'table', 'tr', 'td', 'th', 'thead', 'tbody', 'nav', 'header',
    'footer', 'section', 'article', 'aside', 'main', 'script',
    'style', 'link', 'meta', 'title', 'head', 'body', 'html',
    'br', 'hr', 'strong', 'em', 'small', 'mark', 'del', 'ins',
    'sub', 'sup', 'blockquote', 'pre', 'code', 'kbd', 'samp',
    'var', 'time', 'data', 'address', 'cite', 'q', 'dfn', 'abbr',
    'textarea', 'select', 'option', 'label', 'fieldset', 'legend',
    'details', 'summary', 'dialog', 'menu', 'menuitem'
  ];
  const lower = tagName.toLowerCase();
  return tagName === lower && standardElements.includes(lower);
};