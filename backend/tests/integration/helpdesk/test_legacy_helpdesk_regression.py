import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.role import Role, RoleName, UserRole

client = TestClient(app)

def override_get_current_user():
    user = User(user_id=1, first_name="Test", last_name="User", phone_number="1234567890", email="test@test.com")
    role = Role(role_id=4, role_name=RoleName.flat_owner)
    assignment = UserRole(user_id=1, role_id=4)
    assignment.role = role
    user.roles = [assignment]
    return user

@pytest.fixture(autouse=True)
def _isolated_resident_override():
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.pop(get_current_user, None)

def test_create_complaint():
    response = client.post(
        "/api/helpdesk/complaints",
        json={
            "title": "Test Issue",
            "category": "Maintenance",
            "description": "Test description",
            "priority": "Normal"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Issue"
    assert data["status"] == "Open"
    assert "id" in data

def test_get_complaints():
    response = client.get("/api/helpdesk/complaints")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "id" in data[0]

def test_resident_cannot_update_complaint_status():
    # First create one
    create_resp = client.post(
        "/api/helpdesk/complaints",
        json={
            "category": "Electrical",
            "description": "Lights out"
        }
    )
    assert create_resp.status_code == 201
    complaint_id = create_resp.json()["id"]

    # Update it
    update_resp = client.patch(
        f"/api/helpdesk/complaints/{complaint_id}",
        json={"status": "In Progress", "expected_version": create_resp.json()["version"]}
    )
    assert update_resp.status_code == 403
