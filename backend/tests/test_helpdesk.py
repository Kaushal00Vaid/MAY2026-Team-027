from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_current_user
from app.db.models.user import User

client = TestClient(app)

def override_get_current_user():
    user = User(user_id=1, first_name="Test", last_name="User", phone_number="1234567890", email="test@test.com")
    return user

app.dependency_overrides[get_current_user] = override_get_current_user

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

def test_update_complaint():
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
        json={"status": "In Progress"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "In Progress"
