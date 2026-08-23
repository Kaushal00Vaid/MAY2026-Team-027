from fastapi import HTTPException

from app.helpdesk import assistant


class _Response:
    def raise_for_status(self):
        return None

    def json(self):
        return {"choices": [{"message": {"content": "  Create a ticket.  "}}]}


class _Client:
    request = None

    def __init__(self, *, timeout):
        self.timeout = timeout

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def post(self, url, *, headers, json):
        type(self).request = {
            "url": url,
            "headers": headers,
            "json": json,
            "timeout": self.timeout,
        }
        return _Response()


def test_ai_pipe_client_keeps_key_in_authorization_header(monkeypatch):
    monkeypatch.setattr(assistant.settings, "AIPIPE_API_KEY", "server-secret")
    monkeypatch.setattr(assistant.settings, "AIPIPE_MODEL", "openai/gpt-4.1-nano")
    monkeypatch.setattr(assistant.httpx, "Client", _Client)

    result = assistant.complete_chat([{"role": "user", "content": "Help"}])

    assert result == "Create a ticket."
    assert _Client.request["url"] == "https://aipipe.org/openrouter/v1/chat/completions"
    assert _Client.request["headers"]["Authorization"] == "Bearer server-secret"
    assert _Client.request["json"]["model"] == "openai/gpt-4.1-nano"
    assert "server-secret" not in str(_Client.request["json"])


def test_ai_pipe_client_reports_missing_configuration(monkeypatch):
    monkeypatch.setattr(assistant.settings, "AIPIPE_API_KEY", "")

    try:
        assistant.complete_chat([{"role": "user", "content": "Help"}])
    except HTTPException as error:
        assert error.status_code == 503
        assert "not configured" in error.detail
    else:
        raise AssertionError("Expected missing AI Pipe configuration to fail")
