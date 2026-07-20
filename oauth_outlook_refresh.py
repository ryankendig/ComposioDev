#!/usr/bin/env python3
"""
OAuth Outlook Token Refresh Implementation

This module provides functionality to refresh OAuth access tokens for Microsoft
Outlook/Graph API integration using the OAuth 2.0 refresh token flow.
"""

import json
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


class OutlookOAuthTokenManager:
    """
    Manages OAuth token lifecycle for Microsoft Outlook/Graph API.
    
    Handles token storage, refresh logic, and automatic token renewal
    before expiration.
    """
    
    MICROSOFT_TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    TOKEN_EXPIRY_BUFFER_SECONDS = 300
    
    def __init__(self, client_id: str, client_secret: str, 
                 redirect_uri: str, token_storage_path: Optional[str] = None):
        """
        Initialize the token manager.
        
        Args:
            client_id: Microsoft application (client) ID
            client_secret: Microsoft application client secret
            redirect_uri: Registered redirect URI for the application
            token_storage_path: Path to store tokens (optional)
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.token_storage_path = token_storage_path or "outlook_tokens.json"
        self._cached_token = None
        self._token_expiry = None
    
    def exchange_code_for_tokens(self, authorization_code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access and refresh tokens.
        
        Args:
            authorization_code: Authorization code from OAuth callback
            
        Returns:
            Dictionary containing access_token, refresh_token, expires_in, etc.
            
        Raises:
            Exception: If token exchange fails
        """
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': authorization_code,
            'redirect_uri': self.redirect_uri,
            'grant_type': 'authorization_code',
            'scope': 'https://graph.microsoft.com/.default offline_access'
        }
        
        return self._request_token(data)
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh an expired access token using a refresh token.
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            Dictionary containing new access_token, refresh_token, expires_in, etc.
            
        Raises:
            Exception: If token refresh fails
        """
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token',
            'scope': 'https://graph.microsoft.com/.default offline_access'
        }
        
        return self._request_token(data)
    
    def _request_token(self, data: Dict[str, str]) -> Dict[str, Any]:
        """
        Make a token request to Microsoft's OAuth endpoint.
        
        Args:
            data: Request parameters
            
        Returns:
            Parsed JSON response from token endpoint
            
        Raises:
            Exception: If request fails
        """
        encoded_data = urlencode(data).encode('utf-8')
        request = Request(
            self.MICROSOFT_TOKEN_ENDPOINT,
            data=encoded_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        try:
            with urlopen(request, timeout=30) as response:
                response_data = json.loads(response.read().decode('utf-8'))
                
                if 'access_token' in response_data:
                    response_data['retrieved_at'] = datetime.now(timezone.utc).isoformat()
                
                return response_data
                
        except HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else 'No error details'
            raise Exception(f"Token request failed with status {e.code}: {error_body}")
        except URLError as e:
            raise Exception(f"Network error during token request: {str(e)}")
        except Exception as e:
            raise Exception(f"Unexpected error during token request: {str(e)}")
    
    def get_valid_access_token(self) -> Optional[str]:
        """
        Get a valid access token, refreshing if necessary.
        
        Returns:
            Valid access token or None if refresh fails
        """
        if self._is_token_valid():
            return self._cached_token
        
        token_data = self.load_tokens()
        if not token_data or 'refresh_token' not in token_data:
            return None
        
        try:
            new_token_data = self.refresh_access_token(token_data['refresh_token'])
            self.save_tokens(new_token_data)
            self._update_cache(new_token_data)
            return new_token_data.get('access_token')
        except Exception as e:
            print(f"Failed to refresh token: {str(e)}")
            return None
    
    def _is_token_valid(self) -> bool:
        """
        Check if cached token is still valid.
        
        Returns:
            True if token is valid and not expiring soon
        """
        if not self._cached_token or not self._token_expiry:
            return False
        
        buffer_time = datetime.now(timezone.utc) + timedelta(
            seconds=self.TOKEN_EXPIRY_BUFFER_SECONDS
        )
        return self._token_expiry > buffer_time
    
    def _update_cache(self, token_data: Dict[str, Any]) -> None:
        """
        Update internal token cache.
        
        Args:
            token_data: Token response data
        """
        self._cached_token = token_data.get('access_token')
        
        if 'expires_in' in token_data:
            self._token_expiry = datetime.now(timezone.utc) + timedelta(
                seconds=int(token_data['expires_in'])
            )
        elif 'retrieved_at' in token_data and 'expires_in' in token_data:
            retrieved_at = datetime.fromisoformat(token_data['retrieved_at'])
            self._token_expiry = retrieved_at + timedelta(
                seconds=int(token_data['expires_in'])
            )
    
    def save_tokens(self, token_data: Dict[str, Any]) -> None:
        """
        Save tokens to storage.
        
        Args:
            token_data: Token data to save
        """
        try:
            with open(self.token_storage_path, 'w') as f:
                json.dump(token_data, f, indent=2)
        except IOError as e:
            print(f"Failed to save tokens: {str(e)}")
    
    def load_tokens(self) -> Optional[Dict[str, Any]]:
        """
        Load tokens from storage.
        
        Returns:
            Token data or None if not found
        """
        try:
            with open(self.token_storage_path, 'r') as f:
                return json.load(f)
        except (IOError, json.JSONDecodeError):
            return None
    
    def is_token_expired(self, token_data: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check if a token is expired.
        
        Args:
            token_data: Token data to check (loads from storage if None)
            
        Returns:
            True if token is expired
        """
        if token_data is None:
            token_data = self.load_tokens()
        
        if not token_data or 'retrieved_at' not in token_data or 'expires_in' not in token_data:
            return True
        
        retrieved_at = datetime.fromisoformat(token_data['retrieved_at'])
        expiry_time = retrieved_at + timedelta(seconds=int(token_data['expires_in']))
        
        return datetime.now(timezone.utc) >= expiry_time


class OutlookGraphAPIClient:
    """
    Example client for making Microsoft Graph API requests with automatic token refresh.
    """
    
    GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"
    
    def __init__(self, token_manager: OutlookOAuthTokenManager):
        """
        Initialize the Graph API client.
        
        Args:
            token_manager: Token manager instance
        """
        self.token_manager = token_manager
    
    def make_request(self, endpoint: str, method: str = "GET", 
                     data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Make an authenticated request to Microsoft Graph API.
        
        Args:
            endpoint: API endpoint (e.g., "/me/messages")
            method: HTTP method
            data: Request body for POST/PATCH requests
            
        Returns:
            API response data
            
        Raises:
            Exception: If request fails
        """
        access_token = self.token_manager.get_valid_access_token()
        if not access_token:
            raise Exception("Failed to obtain valid access token")
        
        url = f"{self.GRAPH_API_BASE}{endpoint}"
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        request_data = json.dumps(data).encode('utf-8') if data else None
        request = Request(url, data=request_data, headers=headers, method=method)
        
        try:
            with urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode('utf-8'))
        except HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else 'No error details'
            raise Exception(f"API request failed with status {e.code}: {error_body}")
        except Exception as e:
            raise Exception(f"API request failed: {str(e)}")
    
    def get_user_profile(self) -> Dict[str, Any]:
        """Get the authenticated user's profile."""
        return self.make_request("/me")
    
    def get_messages(self, folder: str = "inbox", top: int = 10) -> Dict[str, Any]:
        """
        Get messages from a mail folder.
        
        Args:
            folder: Folder name (inbox, sentitems, drafts, etc.)
            top: Number of messages to retrieve
            
        Returns:
            Messages data
        """
        return self.make_request(f"/me/mailFolders/{folder}/messages?$top={top}")
    
    def send_email(self, subject: str, body: str, to_recipients: list) -> None:
        """
        Send an email via Outlook.
        
        Args:
            subject: Email subject
            body: Email body (HTML supported)
            to_recipients: List of recipient email addresses
        """
        message = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "HTML",
                    "content": body
                },
                "toRecipients": [
                    {"emailAddress": {"address": addr}} 
                    for addr in to_recipients
                ]
            }
        }
        self.make_request("/me/sendMail", method="POST", data=message)


def main():
    """
    Example usage demonstrating token refresh functionality.
    """
    import os
    
    client_id = os.environ.get('OUTLOOK_CLIENT_ID', 'your-client-id')
    client_secret = os.environ.get('OUTLOOK_CLIENT_SECRET', 'your-client-secret')
    redirect_uri = os.environ.get('OUTLOOK_REDIRECT_URI', 'http://localhost:8080/callback')
    
    token_manager = OutlookOAuthTokenManager(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri
    )
    
    token_data = token_manager.load_tokens()
    
    if token_data:
        print("Token data loaded from storage")
        
        if token_manager.is_token_expired(token_data):
            print("Token is expired, refreshing...")
            try:
                new_token_data = token_manager.refresh_access_token(
                    token_data['refresh_token']
                )
                token_manager.save_tokens(new_token_data)
                print("Token refreshed successfully")
            except Exception as e:
                print(f"Token refresh failed: {str(e)}")
        else:
            print("Token is still valid")
        
        api_client = OutlookGraphAPIClient(token_manager)
        
        try:
            profile = api_client.get_user_profile()
            print(f"Authenticated as: {profile.get('displayName')} ({profile.get('mail')})")
        except Exception as e:
            print(f"API request failed: {str(e)}")
    else:
        print("No tokens found. Please obtain initial authorization code.")
        print(f"Authorization URL: https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"
              f"client_id={client_id}&response_type=code&redirect_uri={redirect_uri}"
              f"&scope=https://graph.microsoft.com/.default offline_access")


if __name__ == "__main__":
    main()
