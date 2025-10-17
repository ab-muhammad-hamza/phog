Phog.prototype.processComponents = async function(html) {
  if (this.debug) console.log('Processing components in HTML...');
  
  const componentRegex = /<([A-Z]\w*)([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/\1>)/g;
  const matches = [...html.matchAll(componentRegex)];
  
  if (this.debug) console.log('Found potential components:', matches.map(m => m[1]));
  
  const replacements = await Promise.all(
    matches.map(async match => {
      const [fullMatch, componentName, attributes, content] = match;
      
      if (this.debug) console.log('Processing element:', componentName);
      
      if (this.isStandardHtmlElement(componentName)) {
        if (this.debug) console.log(`Skipping standard HTML element: ${componentName}`);
        return { fullMatch, replacement: fullMatch };
      }
      
      if (this.debug) console.log(`Loading custom component: ${componentName}`);
      
      try {
        const componentHtml = await this.loadComponent(componentName);
        const props = this.parseAttributes(attributes);
        const renderedComponent = this.renderComponent(componentHtml, props, content || '');
        
        if (this.debug) console.log(`Rendered component ${componentName}:`, renderedComponent.substring(0, 100));
        
        return { fullMatch, replacement: renderedComponent };
      } catch (error) {
        console.warn(`Failed to load component ${componentName}:`, error);
        return { 
          fullMatch, 
          replacement: `<!-- Component ${componentName} failed to load: ${error.message} -->` 
        };
      }
    })
  );
  
  let processedHtml = html;
  for (const { fullMatch, replacement } of replacements) {
    processedHtml = processedHtml.replace(fullMatch, replacement);
  }
  
  return processedHtml;
};

Phog.prototype.loadComponent = async function(componentName) {
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

Phog.prototype.parseAttributes = function(attributeString) {
  const props = {};
  const attrRegex = /(\w+)=["']([^"']*)["']/g;
  let match;
  
  while ((match = attrRegex.exec(attributeString)) !== null) {
    props[match[1]] = match[2];
  }
  
  if (this.debug) console.log('Parsed attributes:', props);
  return props;
};

Phog.prototype.renderComponent = function(template, props, content = '') {
  let rendered = this.processEnvVariables(template);
  
  rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, propName) => {
    const value = props[propName] || '';
    if (this.debug) console.log(`Replacing ${match} with: ${value}`);
    return value;
  });
  
  rendered = rendered.replace(/\{\{children\}\}/g, content);
  rendered = this.processAssetPaths(rendered);
  rendered = this.processComponentPaths(rendered);
  
  return rendered;
};

Phog.prototype.processAssetPaths = function(html) {
  return html.replace(/@assets\//g, `${this.baseUrl}${this.assetsPath}/`);
};

Phog.prototype.processComponentPaths = function(html) {
  return html.replace(/@components\//g, `${this.baseUrl}${this.componentsPath}/`);
};

Phog.prototype.initializeComponentInstances = function() {
  const componentElements = document.querySelectorAll('[data-component]');
  if (this.debug) console.log(`Found ${componentElements.length} component instances to initialize`);
  
  componentElements.forEach(element => {
    const componentName = element.getAttribute('data-component');
    const componentId = this.generateComponentId();
    
    element.setAttribute('data-component-id', componentId);
    
    this.componentInstances.set(componentId, {
      name: componentName,
      element: element,
      state: {}
    });
    
    this.initializeComponentLogic(element, componentName);
  });
};

Phog.prototype.initializeComponentLogic = function(element, componentName) {
  const buttons = element.querySelectorAll('[data-action]');
  buttons.forEach(button => {
    const action = button.getAttribute('data-action');
    button.addEventListener('click', (e) => {
      this.handleComponentAction(element, componentName, action, e);
    });
  });
};

Phog.prototype.handleComponentAction = function(element, componentName, action, event) {
  const componentId = element.getAttribute('data-component-id');
  const instance = this.componentInstances.get(componentId);
  
  if (this.debug) console.log(`Component action triggered: ${componentName}.${action}`);
  
  const customEvent = new CustomEvent(`component-${action}`, {
    detail: { componentName, componentId, instance, originalEvent: event }
  });
  
  element.dispatchEvent(customEvent);
};

Phog.prototype.generateComponentId = function() {
  return `comp_${Math.random().toString(36).substr(2, 9)}`;
};

Phog.prototype.isStandardHtmlElement = function(tagName) {
  const standardElements = new Set([
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
  ]);
  return standardElements.has(tagName.toLowerCase());
};