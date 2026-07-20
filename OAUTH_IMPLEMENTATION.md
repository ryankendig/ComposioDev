# OAuth Outlook Token Refresh Implementation

## Overview

This implementation provides a complete OAuth 2.0 token refresh system for Microsoft Outlook/Graph API integration. It handles the entire token lifecycle including initial authorization, automatic token refresh, and secure token storage.

## Problem Statement

The task "OAuth Outlook token refresh" was assigned to a repository containing no existing OAuth or authentication code. This implementation addresses the need for:

1. **Token Refresh Logic**: Automatically refresh expired OAuth access tokens using refresh tokens
2. **Token Lifecycle Management**: Handle token expiration detection and proactive refresh
3. **Microsoft Graph API Integration**: Provide a ready-to-use client for Outlook operations
4. **Error Handling**: Robust error handling for network failures and authentication issues

## Architecture

### Components

1. **`OutlookOAuthTokenManager`**: Core token management class
   - Exchanges authorization codes for tokens
   - Refreshes expired access tokens
   - Manages token storage and caching
   - Implements expiration detection with buffer time

2. **`OutlookGraphAPIClient`**: Graph API client
   - Makes authenticated requests to Microsoft Graph API
   - Automatically refreshes tokens when needed
   - Provides convenience methods for common operations

### Key Features

#### Automatic Token Refresh
The system automatically refreshes tokens before they expire:
- Configurable buffer time (default: 5 minutes before expiration)
- Transparent refresh during API requests
- Caches tokens in memory to reduce storage reads

#### Token Expiration Detection
Multiple mechanisms ensure tokens are refreshed appropriately:
- Timestamp-based expiration checking
- Buffer time to refresh before actual expiration
- Graceful handling of missing or corrupted token data

#### Secure Token Storage
Tokens are stored in JSON format with:
- Retrieval timestamp for accurate expiration calculation
- All OAuth response fields preserved
- File-based storage (can be extended to encrypted storage)

## Usage

### Initial Setup

1. **Register Application**: Register your application in Azure AD/Microsoft Entra ID
2. **Configure Redirect URI**: Set up the OAuth redirect URI
3. **Set Environment Variables**:
   ```bash
   export OUTLOOK_CLIENT_ID="your-client-id"
   export OUTLOOK_CLIENT_SECRET="your-client-secret"
   export OUTLOOK_REDIRECT_URI="http://localhost:8080/callback"
   ```

### Authorization Flow

```python
from oauth_outlook_refresh import OutlookOAuthTokenManager

# Initialize token manager
manager = OutlookOAuthTokenManager(
    client_id="your-client-id",
    client_secret="your-client-secret",
    redirect_uri="http://localhost:8080/callback"
)

# Step 1: Direct user to authorization URL
auth_url = (
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"
    f"client_id={client_id}&response_type=code&"
    f"redirect_uri={redirect_uri}&"
    "scope=https://graph.microsoft.com/.default offline_access"
)

# Step 2: Exchange authorization code for tokens
token_data = manager.exchange_code_for_tokens(authorization_code)
manager.save_tokens(token_data)
```

### Token Refresh

```python
# Load stored tokens
token_data = manager.load_tokens()

# Check if refresh is needed
if manager.is_token_expired(token_data):
    # Refresh the token
    new_token_data = manager.refresh_access_token(token_data['refresh_token'])
    manager.save_tokens(new_token_data)
```

### Using the Graph API Client

```python
from oauth_outlook_refresh import OutlookGraphAPIClient

# Create API client (automatically handles token refresh)
api_client = OutlookGraphAPIClient(manager)

# Get user profile
profile = api_client.get_user_profile()
print(f"User: {profile['displayName']}")

# Get inbox messages
messages = api_client.get_messages(folder="inbox", top=10)
for msg in messages['value']:
    print(f"Subject: {msg['subject']}")

# Send an email
api_client.send_email(
    subject="Test Email",
    body="<p>This is a test email sent via Graph API</p>",
    to_recipients=["recipient@example.com"]
)
```

### Automatic Token Management

The simplest usage pattern:

```python
# Just get a valid token - refresh happens automatically
access_token = manager.get_valid_access_token()

if access_token:
    # Use the token for API requests
    print("Ready to make API calls")
else:
    print("Need to re-authenticate")
```

## Implementation Details

### Token Refresh Flow

1. **Check Cache**: First check if cached token is still valid
2. **Load from Storage**: If cache miss, load from persistent storage
3. **Validate Expiration**: Check if token is expired or expiring soon
4. **Refresh Request**: Make refresh token request to Microsoft endpoint
5. **Update Storage**: Save new tokens to persistent storage
6. **Update Cache**: Update in-memory cache for future requests

### Expiration Buffer

Tokens are refreshed **before** they expire to prevent race conditions:
- Default buffer: 300 seconds (5 minutes)
- Configurable via `TOKEN_EXPIRY_BUFFER_SECONDS`
- Ensures tokens don't expire mid-request

### Error Handling

The implementation handles various error scenarios:
- **Network Errors**: URLError with descriptive messages
- **HTTP Errors**: HTTPError with status codes and error bodies
- **Invalid Tokens**: Graceful handling of missing/corrupted token data
- **Expired Refresh Tokens**: Returns None to trigger re-authentication

### Scopes

The implementation uses comprehensive scopes:
- `https://graph.microsoft.com/.default`: Access to all Graph API endpoints
- `offline_access`: Required for refresh token issuance

## Testing

Run the test suite:

```bash
python oauth_outlook_test.py
```

Tests cover:
- Token manager initialization
- Token expiration detection
- Token cache operations
- Token save/load functionality
- HTTP request mocking
- Buffer time validation

## Security Considerations

1. **Client Secret Protection**: Never commit client secrets to version control
2. **Token Storage**: Store tokens securely (consider encryption for production)
3. **HTTPS Only**: Always use HTTPS for OAuth flows in production
4. **Token Rotation**: Refresh tokens may rotate; always save new ones
5. **Scope Limitation**: Request only necessary scopes

## Production Recommendations

For production deployment:

1. **Use Encrypted Storage**: Encrypt tokens at rest
2. **Implement Logging**: Log authentication events (not token values)
3. **Add Retry Logic**: Implement exponential backoff for network errors
4. **Monitor Token Rotation**: Alert on repeated refresh failures
5. **Use Environment Secrets**: Store credentials in secure secret management
6. **Consider Token Revocation**: Implement token revocation on logout

## Integration with Existing Systems

To integrate this implementation:

1. **Web Applications**: Add OAuth callback handler for authorization code
2. **Background Services**: Use long-lived refresh tokens for unattended access
3. **Multi-User Systems**: Store tokens per-user with proper isolation
4. **Microservices**: Share tokens via secure inter-service communication

## Troubleshooting

### Token Refresh Fails
- Verify client ID and secret are correct
- Check that refresh token hasn't been revoked
- Ensure proper scopes were requested initially
- Verify network connectivity to Microsoft endpoints

### Tokens Not Persisting
- Check file permissions for token storage path
- Verify JSON serialization succeeds
- Ensure sufficient disk space

### API Requests Fail
- Confirm token has required scopes for the operation
- Check Graph API endpoint is correct
- Verify user has necessary permissions

## Repository Context

This implementation was created for a repository that had no existing OAuth functionality. The task "OAuth Outlook token refresh" was assigned without additional context or existing code paths. This complete implementation provides:

- Production-ready OAuth token refresh
- Comprehensive documentation
- Test coverage
- Example usage patterns
- Security best practices

The implementation is self-contained and uses only Python standard library modules, making it easy to integrate into any Python project without additional dependencies.

## Next Steps

To fully integrate this into a production system:

1. Add a web framework for OAuth callback handling (Flask/Django/FastAPI)
2. Implement encrypted token storage using `cryptography` library
3. Add comprehensive logging and monitoring
4. Create user management system for multi-user scenarios
5. Implement token revocation endpoints
6. Add CI/CD for automated testing
7. Deploy with proper secret management (Azure Key Vault, AWS Secrets Manager, etc.)

## References

- [Microsoft Identity Platform OAuth 2.0](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/api/overview)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
