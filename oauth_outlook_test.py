#!/usr/bin/env python3
"""
Unit tests for OAuth Outlook Token Refresh implementation.
"""

import json
import tempfile
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock
from oauth_outlook_refresh import OutlookOAuthTokenManager, OutlookGraphAPIClient


def test_token_manager_initialization():
    """Test that token manager initializes correctly."""
    manager = OutlookOAuthTokenManager(
        client_id="test-client-id",
        client_secret="test-secret",
        redirect_uri="http://localhost:8080/callback"
    )
    
    assert manager.client_id == "test-client-id"
    assert manager.client_secret == "test-secret"
    assert manager.redirect_uri == "http://localhost:8080/callback"
    assert manager._cached_token is None
    assert manager._token_expiry is None
    print("✓ Token manager initialization test passed")


def test_token_expiry_detection():
    """Test that expired tokens are correctly identified."""
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
        token_path = f.name
        
        expired_token = {
            'access_token': 'expired-token',
            'refresh_token': 'refresh-token',
            'expires_in': 3600,
            'retrieved_at': (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        }
        json.dump(expired_token, f)
    
    try:
        manager = OutlookOAuthTokenManager(
            client_id="test-client-id",
            client_secret="test-secret",
            redirect_uri="http://localhost:8080/callback",
            token_storage_path=token_path
        )
        
        token_data = manager.load_tokens()
        assert manager.is_token_expired(token_data) is True
        print("✓ Expired token detection test passed")
    finally:
        os.unlink(token_path)


def test_valid_token_detection():
    """Test that valid tokens are correctly identified."""
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
        token_path = f.name
        
        valid_token = {
            'access_token': 'valid-token',
            'refresh_token': 'refresh-token',
            'expires_in': 3600,
            'retrieved_at': datetime.now(timezone.utc).isoformat()
        }
        json.dump(valid_token, f)
    
    try:
        manager = OutlookOAuthTokenManager(
            client_id="test-client-id",
            client_secret="test-secret",
            redirect_uri="http://localhost:8080/callback",
            token_storage_path=token_path
        )
        
        token_data = manager.load_tokens()
        assert manager.is_token_expired(token_data) is False
        print("✓ Valid token detection test passed")
    finally:
        os.unlink(token_path)


def test_token_cache_update():
    """Test that token cache is updated correctly."""
    manager = OutlookOAuthTokenManager(
        client_id="test-client-id",
        client_secret="test-secret",
        redirect_uri="http://localhost:8080/callback"
    )
    
    token_data = {
        'access_token': 'new-access-token',
        'refresh_token': 'new-refresh-token',
        'expires_in': 3600,
        'retrieved_at': datetime.now(timezone.utc).isoformat()
    }
    
    manager._update_cache(token_data)
    
    assert manager._cached_token == 'new-access-token'
    assert manager._token_expiry is not None
    assert manager._is_token_valid() is True
    print("✓ Token cache update test passed")


def test_token_save_and_load():
    """Test that tokens can be saved and loaded."""
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
        token_path = f.name
    
    try:
        manager = OutlookOAuthTokenManager(
            client_id="test-client-id",
            client_secret="test-secret",
            redirect_uri="http://localhost:8080/callback",
            token_storage_path=token_path
        )
        
        token_data = {
            'access_token': 'test-access-token',
            'refresh_token': 'test-refresh-token',
            'expires_in': 3600,
            'retrieved_at': datetime.now(timezone.utc).isoformat()
        }
        
        manager.save_tokens(token_data)
        
        loaded_data = manager.load_tokens()
        assert loaded_data == token_data
        assert loaded_data['access_token'] == 'test-access-token'
        assert loaded_data['refresh_token'] == 'test-refresh-token'
        print("✓ Token save and load test passed")
    finally:
        if os.path.exists(token_path):
            os.unlink(token_path)


@patch('oauth_outlook_refresh.urlopen')
def test_refresh_token_request(mock_urlopen):
    """Test that refresh token request is made correctly."""
    mock_response = MagicMock()
    mock_response.read.return_value = json.dumps({
        'access_token': 'new-access-token',
        'refresh_token': 'new-refresh-token',
        'expires_in': 3600,
        'token_type': 'Bearer'
    }).encode('utf-8')
    mock_response.__enter__.return_value = mock_response
    mock_urlopen.return_value = mock_response
    
    manager = OutlookOAuthTokenManager(
        client_id="test-client-id",
        client_secret="test-secret",
        redirect_uri="http://localhost:8080/callback"
    )
    
    result = manager.refresh_access_token('old-refresh-token')
    
    assert result['access_token'] == 'new-access-token'
    assert result['refresh_token'] == 'new-refresh-token'
    assert result['expires_in'] == 3600
    assert 'retrieved_at' in result
    print("✓ Refresh token request test passed")


@patch('oauth_outlook_refresh.urlopen')
def test_graph_api_client_request(mock_urlopen):
    """Test that Graph API client makes requests correctly."""
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
        token_path = f.name
        valid_token = {
            'access_token': 'valid-access-token',
            'refresh_token': 'refresh-token',
            'expires_in': 3600,
            'retrieved_at': datetime.now(timezone.utc).isoformat()
        }
        json.dump(valid_token, f)
    
    try:
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            'displayName': 'Test User',
            'mail': 'test@example.com',
            'id': 'test-user-id'
        }).encode('utf-8')
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response
        
        manager = OutlookOAuthTokenManager(
            client_id="test-client-id",
            client_secret="test-secret",
            redirect_uri="http://localhost:8080/callback",
            token_storage_path=token_path
        )
        
        # Load tokens and update cache
        token_data = manager.load_tokens()
        manager._update_cache(token_data)
        
        client = OutlookGraphAPIClient(manager)
        profile = client.get_user_profile()
        
        assert profile['displayName'] == 'Test User'
        assert profile['mail'] == 'test@example.com'
        print("✓ Graph API client request test passed")
    finally:
        os.unlink(token_path)


def test_token_buffer_time():
    """Test that tokens are refreshed before expiration."""
    manager = OutlookOAuthTokenManager(
        client_id="test-client-id",
        client_secret="test-secret",
        redirect_uri="http://localhost:8080/callback"
    )
    
    token_data = {
        'access_token': 'expiring-soon-token',
        'expires_in': 200
    }
    
    manager._update_cache(token_data)
    
    is_valid = manager._is_token_valid()
    assert is_valid is False
    print("✓ Token buffer time test passed")


def run_all_tests():
    """Run all unit tests."""
    print("\n=== Running OAuth Outlook Token Refresh Tests ===\n")
    
    test_token_manager_initialization()
    test_token_expiry_detection()
    test_valid_token_detection()
    test_token_cache_update()
    test_token_save_and_load()
    test_refresh_token_request()
    test_graph_api_client_request()
    test_token_buffer_time()
    
    print("\n=== All tests passed! ===\n")


if __name__ == "__main__":
    run_all_tests()
