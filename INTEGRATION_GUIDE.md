# OAuth Outlook Token Refresh - Integration Guide

## Quick Start

This guide helps you integrate the OAuth Outlook token refresh system into your application.

## Prerequisites

1. **Python 3.7+** installed
2. **Microsoft Azure Account** for app registration
3. **Application Registration** in Azure AD/Microsoft Entra ID

## Setup Steps

### 1. Register Your Application in Azure

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Configure:
   - **Name**: Your application name
   - **Supported account types**: Choose based on your needs
   - **Redirect URI**: `http://localhost:8080/callback` (for local testing)
4. After registration, note your **Application (client) ID**
5. Create a **Client Secret**:
   - Go to **Certificates & secrets** → **New client secret**
   - Note the secret value (shown only once)
6. Configure **API permissions**:
   - Add **Microsoft Graph** → **Delegated permissions**
   - Add: `Mail.Read`, `Mail.Send`, `User.Read`, `offline_access`
   - Grant admin consent if required

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
OUTLOOK_CLIENT_ID=your-actual-client-id
OUTLOOK_CLIENT_SECRET=your-actual-client-secret
OUTLOOK_REDIRECT_URI=http://localhost:8080/callback
```

### 3. Initial Authorization

Run the example script to get initial authorization:

```bash
python3 oauth_outlook_refresh.py
```

This will:
1. Display an authorization URL
2. Open it in your browser
3. After authorization, you'll be redirected to your redirect URI
4. Extract the `code` parameter from the URL
5. Exchange it for tokens using the manager

Example authorization code exchange:

```python
from oauth_outlook_refresh import OutlookOAuthTokenManager
import os

# Initialize manager
manager = OutlookOAuthTokenManager(
    client_id=os.environ['OUTLOOK_CLIENT_ID'],
    client_secret=os.environ['OUTLOOK_CLIENT_SECRET'],
    redirect_uri=os.environ['OUTLOOK_REDIRECT_URI']
)

# After user authorizes, you'll receive a code in the redirect URL
# Extract it and exchange for tokens
authorization_code = "YOUR_AUTH_CODE_FROM_REDIRECT"
token_data = manager.exchange_code_for_tokens(authorization_code)
manager.save_tokens(token_data)

print("Authorization complete! Tokens saved.")
```

### 4. Use in Your Application

Once tokens are saved, use the system in your application:

```python
from oauth_outlook_refresh import OutlookOAuthTokenManager, OutlookGraphAPIClient
import os

# Initialize
manager = OutlookOAuthTokenManager(
    client_id=os.environ['OUTLOOK_CLIENT_ID'],
    client_secret=os.environ['OUTLOOK_CLIENT_SECRET'],
    redirect_uri=os.environ['OUTLOOK_REDIRECT_URI']
)

api_client = OutlookGraphAPIClient(manager)

# Use the API - token refresh happens automatically
try:
    profile = api_client.get_user_profile()
    print(f"Logged in as: {profile['displayName']}")
    
    messages = api_client.get_messages(top=5)
    for msg in messages['value']:
        print(f"- {msg['subject']}")
except Exception as e:
    print(f"Error: {e}")
```

## Integration Patterns

### Pattern 1: Web Application with Flask

```python
from flask import Flask, request, redirect, session
from oauth_outlook_refresh import OutlookOAuthTokenManager
import os

app = Flask(__name__)
app.secret_key = 'your-secret-key'

manager = OutlookOAuthTokenManager(
    client_id=os.environ['OUTLOOK_CLIENT_ID'],
    client_secret=os.environ['OUTLOOK_CLIENT_SECRET'],
    redirect_uri='http://localhost:5000/callback'
)

@app.route('/login')
def login():
    auth_url = (
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"
        f"client_id={os.environ['OUTLOOK_CLIENT_ID']}&"
        "response_type=code&"
        f"redirect_uri={manager.redirect_uri}&"
        "scope=https://graph.microsoft.com/.default offline_access"
    )
    return redirect(auth_url)

@app.route('/callback')
def callback():
    code = request.args.get('code')
    if code:
        token_data = manager.exchange_code_for_tokens(code)
        session['user_id'] = token_data.get('user_id', 'default')
        manager.save_tokens(token_data)
        return "Authorization successful!"
    return "Authorization failed", 400

@app.route('/profile')
def profile():
    access_token = manager.get_valid_access_token()
    if not access_token:
        return redirect('/login')
    # Use token to make API requests
    return "Profile page"

if __name__ == '__main__':
    app.run(debug=True)
```

### Pattern 2: Background Service

```python
from oauth_outlook_refresh import OutlookOAuthTokenManager, OutlookGraphAPIClient
import time
import os

def check_emails_periodically():
    manager = OutlookOAuthTokenManager(
        client_id=os.environ['OUTLOOK_CLIENT_ID'],
        client_secret=os.environ['OUTLOOK_CLIENT_SECRET'],
        redirect_uri=os.environ['OUTLOOK_REDIRECT_URI']
    )
    
    api_client = OutlookGraphAPIClient(manager)
    
    while True:
        try:
            # Token refresh happens automatically
            messages = api_client.get_messages(top=10)
            
            unread_count = sum(1 for msg in messages['value'] 
                             if not msg.get('isRead', True))
            print(f"Unread messages: {unread_count}")
            
        except Exception as e:
            print(f"Error checking emails: {e}")
        
        time.sleep(300)  # Check every 5 minutes

if __name__ == '__main__':
    check_emails_periodically()
```

### Pattern 3: CLI Tool

```python
import sys
from oauth_outlook_refresh import OutlookOAuthTokenManager, OutlookGraphAPIClient
import os

def main():
    manager = OutlookOAuthTokenManager(
        client_id=os.environ['OUTLOOK_CLIENT_ID'],
        client_secret=os.environ['OUTLOOK_CLIENT_SECRET'],
        redirect_uri=os.environ['OUTLOOK_REDIRECT_URI']
    )
    
    api_client = OutlookGraphAPIClient(manager)
    
    if len(sys.argv) < 2:
        print("Usage: python cli_tool.py [profile|messages|send]")
        return
    
    command = sys.argv[1]
    
    try:
        if command == 'profile':
            profile = api_client.get_user_profile()
            print(f"Name: {profile['displayName']}")
            print(f"Email: {profile['mail']}")
        
        elif command == 'messages':
            messages = api_client.get_messages(top=10)
            for msg in messages['value']:
                print(f"[{'READ' if msg['isRead'] else 'UNREAD'}] {msg['subject']}")
        
        elif command == 'send':
            if len(sys.argv) < 5:
                print("Usage: python cli_tool.py send <to> <subject> <body>")
                return
            to_addr = sys.argv[2]
            subject = sys.argv[3]
            body = sys.argv[4]
            api_client.send_email(subject, body, [to_addr])
            print("Email sent!")
        
        else:
            print(f"Unknown command: {command}")
    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
```

## Multi-User Support

For applications with multiple users, store tokens per user:

```python
class UserTokenManager:
    def __init__(self, user_id):
        self.user_id = user_id
        self.manager = OutlookOAuthTokenManager(
            client_id=os.environ['OUTLOOK_CLIENT_ID'],
            client_secret=os.environ['OUTLOOK_CLIENT_SECRET'],
            redirect_uri=os.environ['OUTLOOK_REDIRECT_URI'],
            token_storage_path=f"tokens/user_{user_id}.json"
        )
    
    def get_api_client(self):
        return OutlookGraphAPIClient(self.manager)

# Usage
user_manager = UserTokenManager(user_id=123)
api_client = user_manager.get_api_client()
profile = api_client.get_user_profile()
```

## Production Deployment

### Security Enhancements

1. **Encrypt tokens at rest**:

```python
from cryptography.fernet import Fernet
import json

class EncryptedTokenStorage:
    def __init__(self, encryption_key):
        self.cipher = Fernet(encryption_key)
    
    def save_tokens(self, token_data, path):
        encrypted = self.cipher.encrypt(
            json.dumps(token_data).encode()
        )
        with open(path, 'wb') as f:
            f.write(encrypted)
    
    def load_tokens(self, path):
        with open(path, 'rb') as f:
            encrypted = f.read()
        decrypted = self.cipher.decrypt(encrypted)
        return json.loads(decrypted)
```

2. **Use environment-specific secrets**:

```python
# Use Azure Key Vault, AWS Secrets Manager, etc.
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

credential = DefaultAzureCredential()
client = SecretClient(vault_url="https://your-vault.vault.azure.net", 
                     credential=credential)

client_id = client.get_secret("outlook-client-id").value
client_secret = client.get_secret("outlook-client-secret").value
```

3. **Add comprehensive logging**:

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In token manager methods:
logger.info(f"Token refresh requested for client {self.client_id[:8]}...")
logger.warning("Token refresh failed, re-authentication required")
```

### Monitoring and Alerts

Monitor these metrics:
- Token refresh success/failure rate
- API request latency
- Authentication errors
- Token expiration events

### Scaling Considerations

For high-volume applications:
- Use Redis/Memcached for token caching
- Implement connection pooling
- Add circuit breakers for API failures
- Use async/await for concurrent requests

## Testing

Run the test suite:

```bash
python3 oauth_outlook_test.py
```

Add your own tests:

```python
from oauth_outlook_refresh import OutlookOAuthTokenManager

def test_custom_scenario():
    manager = OutlookOAuthTokenManager(
        client_id="test-id",
        client_secret="test-secret",
        redirect_uri="http://localhost/callback"
    )
    # Your test logic here
```

## Troubleshooting

### "Failed to obtain valid access token"
- Ensure you've completed initial authorization
- Check that tokens file exists and is readable
- Verify refresh token hasn't been revoked

### "Token refresh failed"
- Verify client ID and secret are correct
- Check Azure app registration is active
- Ensure proper scopes were requested initially
- Confirm network connectivity to Microsoft endpoints

### "Insufficient privileges"
- Check API permissions in Azure app registration
- Ensure admin consent has been granted (if required)
- Verify the user has the necessary mailbox permissions

### Token Not Persisting
- Check file write permissions
- Verify storage path is valid
- Ensure sufficient disk space

## API Reference

### OutlookOAuthTokenManager

- `exchange_code_for_tokens(code)`: Exchange auth code for tokens
- `refresh_access_token(refresh_token)`: Refresh an expired token
- `get_valid_access_token()`: Get valid token (auto-refresh)
- `save_tokens(token_data)`: Save tokens to storage
- `load_tokens()`: Load tokens from storage
- `is_token_expired(token_data)`: Check if token is expired

### OutlookGraphAPIClient

- `get_user_profile()`: Get authenticated user's profile
- `get_messages(folder, top)`: Get messages from folder
- `send_email(subject, body, recipients)`: Send an email
- `make_request(endpoint, method, data)`: Make custom API request

## Support

For issues or questions:
1. Check the main [OAUTH_IMPLEMENTATION.md](OAUTH_IMPLEMENTATION.md)
2. Review Microsoft Graph API documentation
3. Verify Azure app registration configuration
4. Check Python version compatibility (3.7+)

## License

This implementation is provided as-is for integration with Microsoft Outlook/Graph API.
