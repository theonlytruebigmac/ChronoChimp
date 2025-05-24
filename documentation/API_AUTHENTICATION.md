# ChronoChimp API Authentication Quick Reference

This guide explains how to authenticate with the ChronoChimp API.

## Authentication Methods

ChronoChimp supports two authentication methods:

### 1. Session Cookies (for browser applications)

When using the API from a browser application that already has a user logged in, the session cookie (`session_token`) is automatically sent with each request.

### 2. API Keys (for external applications)

For programmatic access from external applications, use API keys with the following steps:

1. Generate an API key in the ChronoChimp web interface:
   - Go to Settings > API Keys
   - Click "Create New API Key"
   - Give your key a name and copy the full key (you will only see it once)

2. Include the API key in the Authorization header with each request:
   ```
   Authorization: Bearer YOUR_API_KEY
   ```

## API Request Examples

### Using curl

```bash
# Get user profile
curl -X GET "http://localhost:3000/api/me/profile" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Get tasks
curl -X GET "http://localhost:3000/api/tasks" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Create a new task
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Task via API",
    "description": "Created via API request",
    "status": "Backlog",
    "priority": "medium"
  }'
```

### Using JavaScript (Node.js)

```javascript
const axios = require('axios');

const apiKey = 'YOUR_API_KEY';
const baseUrl = 'http://localhost:3000/api';

// Get user profile
async function getUserProfile() {
  try {
    const response = await axios.get(`${baseUrl}/me/profile`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching profile:', error.response?.data || error.message);
    throw error;
  }
}

// Create a new task
async function createTask(task) {
  try {
    const response = await axios.post(`${baseUrl}/tasks`, task, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error.response?.data || error.message);
    throw error;
  }
}
```

### Using Python

```python
import requests

api_key = 'YOUR_API_KEY'
base_url = 'http://localhost:3000/api'

headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json'
}

# Get user profile
def get_user_profile():
    response = requests.get(f'{base_url}/me/profile', headers=headers)
    response.raise_for_status()  # Raise exception for 4XX/5XX errors
    return response.json()

# Create a new task
def create_task(task):
    response = requests.post(
        f'{base_url}/tasks',
        headers=headers,
        json=task
    )
    response.raise_for_status()
    return response.json()

# Example usage
try:
    profile = get_user_profile()
    print(f"Logged in as: {profile['name']}")
    
    new_task = {
        'title': 'New Task via Python',
        'description': 'Created using Python requests',
        'status': 'Backlog',
        'priority': 'medium'
    }
    
    task = create_task(new_task)
    print(f"Created task: {task['id']}")
except requests.exceptions.HTTPError as e:
    print(f"API Error: {e.response.text}")
```

## Troubleshooting

If you receive a `401 Unauthorized` response, check:
1. Is your API key valid and active?
2. Are you including the `Bearer` prefix in the Authorization header?
3. Has the API key been revoked or expired?

If you receive a `403 Forbidden` response, check:
1. Does your user have the necessary permissions for the requested resource?
2. For admin endpoints, is your user an Admin?

## Testing Tools

ChronoChimp includes several scripts to help test your API authentication:

```bash
# Basic API key test
./scripts/test-api-auth.sh

# Comprehensive test of all endpoints with both auth methods
./scripts/comprehensive-api-test.sh

# Interactive API key tester
./scripts/api-key-helper.sh --key YOUR_API_KEY test
```
