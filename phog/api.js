async function apiRequest(url, method = 'GET', body = null, headers = {}) {
  try {
    // Default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Setup fetch options
    const options = {
      method,
      headers: defaultHeaders
    };

    // Add body if it exists (and method isn't GET)
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    // Perform the request
    const response = await fetch(url, options);

    // Throw error if response not ok
    if (!response.ok) {
      const errorText = await response.text(); // capture API error messages
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // Try to parse JSON (if any)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }

  } catch (error) {
    console.error('API Request failed:', error.message);
    throw error; // rethrow so caller can handle it
  }
}

const newObject = await apiRequest(
  'https://api.restful-api.dev/objects',
  'POST',
  { name: 'Laptop', data: { brand: 'Apple', year: 2025 } }
);
console.log('Created:', newObject);
