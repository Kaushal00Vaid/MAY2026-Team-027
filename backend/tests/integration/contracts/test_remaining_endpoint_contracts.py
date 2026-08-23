"""Contract coverage for routes omitted by the original Sprint 2 test expansion."""


def test_google_login_redirects_to_google(unauth_client):
    response = unauth_client.get("/auth/google", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"].startswith(
        "https://accounts.google.com/o/oauth2/v2/auth"
    )


def test_google_callback_without_code_returns_to_sign_in(unauth_client):
    response = unauth_client.get("/auth/google/callback", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"].startswith(
        "http://localhost:5173/signin?error=oauth_cancelled"
    )


def test_helpdesk_assistant_analyzes_resident_message(resident_client, monkeypatch):
    monkeypatch.setattr(
        "app.helpdesk.work_orders.service.assistant.complete_chat",
        lambda _messages: "Turn off the local valve and create a ticket.",
    )
    response = resident_client.post(
        "/api/v1/helpdesk/assistant/analyze",
        json={"message": "Water is leaking from the kitchen pipe"},
    )

    assert response.status_code == 200
    assert response.json()["suggested_category"] == "Plumbing"
    assert response.json()["message"]
    assert "known_issue" in response.json()


def test_bulk_invoices_require_idempotency_key(admin_client):
    response = admin_client.post(
        "/api/v1/finance/invoices/bulk",
        json={
            "period": "2026-08",
            "purpose": "Monthly Maintenance",
            "amount_paise": 500_000,
            "due_date": "2026-08-31",
        },
    )

    assert response.status_code == 422


def test_payment_for_unknown_invoice_returns_not_found(resident_client):
    response = resident_client.post(
        "/api/v1/finance/payments",
        headers={"Idempotency-Key": "milestone4-payment-missing"},
        json={"invoice_id": 9_999_999, "method": "bank"},
    )

    assert response.status_code == 404


def test_receipt_for_unknown_payment_returns_not_found(resident_client):
    response = resident_client.get("/api/v1/finance/payments/9999999/receipt")

    assert response.status_code == 404
