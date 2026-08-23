"""
tests/integration/finance/test_finance_api.py
Integration tests for all finance API endpoints.

Covers:
  - Legacy /api/finance/transactions (GET/POST)
  - V1 /api/v1/finance/* (ledger, resident-summary, admin-summary,
    expenses, invoices/bulk, payments, statement PDF, annual-audit PDF)

Run from backend/:
    uv run pytest tests/integration/finance/ -v
"""



# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _create_transaction(client, type_="income", amount=500.00):
    """Helper: POST a transaction and return the response."""
    return client.post(
        "/api/finance/transactions",
        json={
            "unit_or_vendor": "A-101",
            "category": "Maintenance",
            "amount": amount,
            "type": type_,
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-FIN: Legacy finance transactions (/api/finance)
# ─────────────────────────────────────────────────────────────────────────────


class TestFinanceLegacy:
    def test_create_income_transaction_returns_201(self, admin_client):
        """TC-FIN-01: POST income transaction → 201 with correct shape."""
        resp = _create_transaction(admin_client, "income", 1500.00)
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "income"
        assert float(data["amount"]) == 1500.00
        assert data["unit_or_vendor"] == "A-101"
        assert "id" in data
        assert "transaction_date" in data

    def test_create_expense_transaction_returns_201(self, admin_client):
        """TC-FIN-02: POST expense transaction → 201."""
        resp = _create_transaction(admin_client, "expense", 750.00)
        assert resp.status_code == 201
        assert resp.json()["type"] == "expense"

    def test_list_transactions_returns_200(self, admin_client):
        """TC-FIN-03: GET /api/finance/transactions → 200 with list."""
        _create_transaction(admin_client)
        resp = admin_client.get("/api/finance/transactions")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "id" in data[0]

    def test_list_transactions_filter_income(self, admin_client):
        """TC-FIN-04: GET ?type=income returns only income records."""
        _create_transaction(admin_client, "income")
        _create_transaction(admin_client, "expense")
        resp = admin_client.get("/api/finance/transactions?type=income")
        assert resp.status_code == 200
        for tx in resp.json():
            assert tx["type"] == "income"

    def test_list_transactions_filter_expense(self, admin_client):
        """TC-FIN-05: GET ?type=expense returns only expense records."""
        _create_transaction(admin_client, "income")
        _create_transaction(admin_client, "expense")
        resp = admin_client.get("/api/finance/transactions?type=expense")
        assert resp.status_code == 200
        for tx in resp.json():
            assert tx["type"] == "expense"

    def test_list_transactions_pagination(self, admin_client):
        """TC-FIN-06: GET ?limit=2&offset=0 respects pagination."""
        for _ in range(3):
            _create_transaction(admin_client)
        resp = admin_client.get("/api/finance/transactions?limit=2&offset=0")
        assert resp.status_code == 200
        assert len(resp.json()) <= 2

    def test_create_transaction_zero_amount_returns_422(self, admin_client):
        """TC-FIN-07: POST with amount=0 → 422."""
        resp = admin_client.post(
            "/api/finance/transactions",
            json={"unit_or_vendor": "V-01", "category": "Test", "amount": 0, "type": "income"},
        )
        assert resp.status_code == 422

    def test_create_transaction_negative_amount_returns_422(self, admin_client):
        """TC-FIN-08: POST with negative amount → 422."""
        resp = admin_client.post(
            "/api/finance/transactions",
            json={"unit_or_vendor": "V-01", "category": "Test", "amount": -100, "type": "income"},
        )
        assert resp.status_code == 422

    def test_create_transaction_invalid_type_returns_422(self, admin_client):
        """TC-FIN-09: POST with type='refund' → 422."""
        resp = admin_client.post(
            "/api/finance/transactions",
            json={"unit_or_vendor": "V-01", "category": "Test", "amount": 100, "type": "refund"},
        )
        assert resp.status_code == 422

    def test_create_transaction_missing_fields_returns_422(self, admin_client):
        """TC-FIN-10: POST with only unit_or_vendor (missing category, amount, type) → 422."""
        resp = admin_client.post(
            "/api/finance/transactions",
            json={"unit_or_vendor": "V-01"},
        )
        assert resp.status_code == 422

    def test_finance_forbidden_for_resident(self, resident_client):
        """TC-FIN-11: POST finance transaction as flat_owner → 403."""
        resp = _create_transaction(resident_client)
        assert resp.status_code == 403

    def test_finance_list_forbidden_for_resident(self, resident_client):
        """TC-FIN-12: GET finance transactions as flat_owner → 403."""
        resp = resident_client.get("/api/finance/transactions")
        assert resp.status_code == 403

    def test_list_transactions_invalid_type_filter_returns_422(self, admin_client):
        """TC-FIN-13: GET ?type=cash (invalid value) → 422."""
        resp = admin_client.get("/api/finance/transactions?type=cash")
        assert resp.status_code == 422

    def test_list_transactions_unauthenticated_returns_401(self, unauth_client):
        """TC-FIN-14: GET transactions without auth → 401."""
        resp = unauth_client.get("/api/finance/transactions")
        assert resp.status_code in (401, 403)

    def test_transaction_response_shape(self, admin_client):
        """TC-FIN-15: Transaction response must include all expected fields."""
        resp = _create_transaction(admin_client)
        assert resp.status_code == 201
        data = resp.json()
        for field in ("id", "unit_or_vendor", "category", "amount", "type", "transaction_date"):
            assert field in data


# ─────────────────────────────────────────────────────────────────────────────
# TC-FINv1: Finance V1 endpoints (/api/v1/finance)
# ─────────────────────────────────────────────────────────────────────────────


class TestFinanceV1ResidentSummary:
    def test_resident_summary_returns_200(self, resident_client):
        """TC-FINv1-01: GET /api/v1/finance/resident-summary as resident → 200."""
        resp = resident_client.get("/api/v1/finance/resident-summary")
        assert resp.status_code == 200

    def test_resident_summary_forbidden_for_staff(self, staff_client):
        """TC-FINv1-02: GET resident-summary as staff → 403."""
        resp = staff_client.get("/api/v1/finance/resident-summary")
        assert resp.status_code == 403

    def test_resident_summary_unauthenticated_returns_401(self, unauth_client):
        """TC-FINv1-03: GET resident-summary without auth → 401."""
        resp = unauth_client.get("/api/v1/finance/resident-summary")
        assert resp.status_code in (401, 403)


class TestFinanceV1AdminSummary:
    def test_admin_summary_returns_200(self, admin_client):
        """TC-FINv1-04: GET /api/v1/finance/admin-summary as admin → 200."""
        resp = admin_client.get("/api/v1/finance/admin-summary")
        assert resp.status_code == 200

    def test_admin_summary_forbidden_for_resident(self, resident_client):
        """TC-FINv1-05: GET admin-summary as resident → 403."""
        resp = resident_client.get("/api/v1/finance/admin-summary")
        assert resp.status_code == 403


class TestFinanceV1Ledger:
    def test_ledger_returns_paginated_response(self, admin_client):
        """TC-FINv1-06: GET /api/v1/finance/ledger → 200 with paginated ledger."""
        resp = admin_client.get("/api/v1/finance/ledger")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    def test_ledger_pagination(self, admin_client):
        """TC-FINv1-07: GET /api/v1/finance/ledger?page=1&page_size=5."""
        resp = admin_client.get("/api/v1/finance/ledger?page=1&page_size=5")
        assert resp.status_code == 200
        assert len(resp.json()["items"]) <= 5

    def test_ledger_filters_direction_before_pagination(self, admin_client):
        expense = admin_client.post(
            "/api/v1/finance/expenses",
            json={
                "vendor": "Dashboard filter test",
                "category": "Repairs",
                "description": "Filtered ledger entry",
                "amount_paise": 10_000,
                "expense_date": "2026-08-23",
            },
        )
        assert expense.status_code == 201

        resp = admin_client.get(
            "/api/v1/finance/ledger?direction=debit&page=1&page_size=100"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == len(data["items"])
        assert data["total"] >= 1
        assert all(item["direction"] == "debit" for item in data["items"])

    def test_ledger_rejects_invalid_direction(self, admin_client):
        resp = admin_client.get("/api/v1/finance/ledger?direction=expense")
        assert resp.status_code == 422

    def test_ledger_unauthenticated_returns_401(self, unauth_client):
        """TC-FINv1-08: GET ledger without auth → 401."""
        resp = unauth_client.get("/api/v1/finance/ledger")
        assert resp.status_code in (401, 403)


class TestFinanceV1BulkInvoices:
    def test_bulk_invoice_rejects_due_date_before_period(self, admin_client):
        resp = admin_client.post(
            "/api/v1/finance/invoices/bulk",
            json={
                "period": "2099-12",
                "purpose": "Invalid due date",
                "amount_paise": 120_000,
                "due_date": "2099-11-30",
            },
            headers={"Idempotency-Key": "finance-invalid-date"},
        )
        assert resp.status_code == 422

    def test_bulk_invoices_report_duplicate_flats_clearly(self, admin_client):
        payload = {
            "period": "2099-12",
            "purpose": "Integration Test Maintenance",
            "amount_paise": 120_000,
            "due_date": "2099-12-15",
        }
        first = admin_client.post(
            "/api/v1/finance/invoices/bulk",
            json=payload,
            headers={"Idempotency-Key": "finance-bulk-first"},
        )
        assert first.status_code == 201
        assert first.json()["created_count"] > 0
        assert first.json()["eligible_flat_count"] == first.json()["created_count"]

        repeated = admin_client.post(
            "/api/v1/finance/invoices/bulk",
            json=payload,
            headers={"Idempotency-Key": "finance-bulk-second"},
        )
        assert repeated.status_code == 201
        assert repeated.json()["created_count"] == 0
        assert repeated.json()["duplicate_flat_count"] == first.json()["created_count"]
        assert "already invoiced" in repeated.json()["message"]


class TestFinanceV1Expenses:
    def test_create_expense_persists_matching_ledger_debit(self, admin_client):
        resp = admin_client.post(
            "/api/v1/finance/expenses",
            json={
                "category": "Cleaning",
                "amount_paise": 5000,
                "vendor": "CleanCo",
                "description": "Monthly cleaning",
                "expense_date": "2026-08-11",
            },
        )
        assert resp.status_code == 201
        ledger = admin_client.get("/api/v1/finance/ledger?direction=debit&page_size=100")
        assert ledger.status_code == 200
        assert any(
            item["description"] == "CleanCo — Monthly cleaning"
            and item["amount_paise"] == 5000
            for item in ledger.json()["items"]
        )

    def test_create_expense_rejects_whitespace_text(self, admin_client):
        resp = admin_client.post(
            "/api/v1/finance/expenses",
            json={
                "category": "   ",
                "amount_paise": 5000,
                "vendor": "CleanCo",
                "description": "Monthly cleaning",
                "expense_date": "2026-08-11",
            },
        )
        assert resp.status_code == 422

    def test_create_expense_forbidden_for_resident(self, resident_client):
        """TC-FINv1-09: POST /api/v1/finance/expenses as resident → 403."""
        resp = resident_client.post(
            "/api/v1/finance/expenses",
            json={
                "category": "Cleaning",
                "amount_paise": 5000,
                "vendor": "CleanCo",
                "description": "Monthly cleaning",
                "expense_date": "2026-08-11",
            },
        )
        assert resp.status_code == 403

    def test_create_expense_as_admin_requires_fields(self, admin_client):
        """TC-FINv1-10: POST /api/v1/finance/expenses with missing fields → 422."""
        resp = admin_client.post(
            "/api/v1/finance/expenses",
            json={},
        )
        assert resp.status_code == 422


class TestFinanceV1PDFEndpoints:
    def test_statement_returns_pdf(self, resident_client):
        """TC-FINv1-11: GET /api/v1/finance/statement → PDF content."""
        resp = resident_client.get("/api/v1/finance/statement")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"

    def test_annual_audit_forbidden_for_resident(self, resident_client):
        """TC-FINv1-12: GET /api/v1/finance/reports/annual-audit as resident → 403."""
        resp = resident_client.get("/api/v1/finance/reports/annual-audit")
        assert resp.status_code == 403

    def test_annual_audit_returns_pdf_for_admin(self, admin_client):
        """TC-FINv1-13: GET /api/v1/finance/reports/annual-audit as admin → PDF."""
        resp = admin_client.get("/api/v1/finance/reports/annual-audit?year=2025")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.headers["content-disposition"] == 'attachment; filename="annual-audit-2025.pdf"'
        assert resp.content.startswith(b"%PDF")
        assert len(resp.content) > 2_000
