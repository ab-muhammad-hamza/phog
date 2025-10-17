Phog.prototype.loadEnv = async function() {
  if (this.debug) console.log('Loading environment variables...');
  try {
    
    const response = await fetch(`.env`);
    if (!response.ok) {
      throw new Error(`Failed to load config.env: ${response.status}`);
    }
    
    const text = await response.text();
    this.env = this.parseEnvText(text);

    if (this.debug) console.log('Environment variables loaded:', this.env);
  } catch (error) {
    console.warn('Could not load config.env. Proceeding without environment variables.', error);
    this.env = {};
  }
};

Phog.prototype.parseEnvText = function(text) {
  const env = {};
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.trim().startsWith('#') || !line.trim()) {
      continue;
    }

    const parts = line.split('=');
    const key = parts.shift().trim();
    const value = parts.join('=').trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      env[key] = value.slice(1, -1);
    } else {
      env[key] = value;
    }
  }

  if (this.debug) console.log('Parsed .env text:', env);
  return env;
};
Phog.prototype.processEnvVariables = function(html) {
  if (!this.env) return html;

  // Regex to find all instances of {{env.VARIABLE}}
  return html.replace(/{{\s*env\.(\w+)\s*}}/g, (match, varName) => {
    const value = this.env[varName];
    if (value !== undefined) {
      if (this.debug) console.log(`Replacing ${match} with "${value}"`);
      return value;
    }
    if (this.debug) console.warn(`Environment variable not found for ${match}`);
    return '';
  });
};