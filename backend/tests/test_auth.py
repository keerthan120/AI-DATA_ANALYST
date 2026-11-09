import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_auth_registration_and_login():
    test_email = "analyst_2026_test@example.com"
    test_password = "SecurePassword123"

    # Register
    reg_resp = client.post("/api/auth/register", json={
        "email": test_email,
        "password": test_password,
        "full_name": "Test Analyst"
    })
    # Either 200 or 400 if user exists from previous test run
    assert reg_resp.status_code in [200, 400]
    if reg_resp.status_code == 200:
        data = reg_resp.json()
        assert data["user"]["email"] == test_email
        assert "token" in data

    # Login
    login_resp = client.post("/api/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["user"]["email"] == test_email
    assert "token" in login_data

def test_auth_forgot_and_reset_password():
    test_email = "reset_test_2026_user@example.com"
    old_pw = "OldPassword123"
    new_pw = "NewPassword456"

    # Register user (ignore if already registered)
    client.post("/api/auth/register", json={"email": test_email, "password": old_pw})

    # Forgot password request
    forgot_resp = client.post("/api/auth/forgot-password", json={"email": test_email})
    assert forgot_resp.status_code == 200
    forgot_data = forgot_resp.json()
    assert forgot_data["success"] is True
    reset_token = forgot_data.get("reset_token")
    assert reset_token is not None

    # Reset password with token and email
    reset_resp = client.post("/api/auth/reset-password", json={
        "email": test_email,
        "reset_token": reset_token,
        "new_password": new_pw
    })
    assert reset_resp.status_code == 200
    assert reset_resp.json()["success"] is True

    # Confirm login works with new password
    new_login = client.post("/api/auth/login", json={"email": test_email, "password": new_pw})
    assert new_login.status_code == 200
    assert new_login.json()["user"]["email"] == test_email
