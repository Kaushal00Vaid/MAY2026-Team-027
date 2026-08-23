import pytest
from fastapi import HTTPException

from app.helpdesk import assistant


class _Response:
    def __init__(self, data):
        self.data = data

    def raise_for_status(self):
        return None

    def json(self):
        return self.data


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
        if "/geminiv1beta/" in url:
            return _Response(
                {"candidates": [{"content": {"parts": [{"text": "Gemini reply"}]}}]}
            )
        return _Response({"choices": [{"message": {"content": "Chat reply"}}]})


@pytest.fixture(autouse=True)
def configure_client(monkeypatch):
    monkeypatch.setattr(assistant.settings, "AIPIPE_PROVIDER", "auto")
    monkeypatch.setattr(assistant.settings, "AIPIPE_BASE_URL", "https://aipipe.org")
    monkeypatch.setattr(assistant.httpx, "Client", _Client)


@pytest.mark.parametrize(
    ("api_key", "expected_url", "expected_model"),
    [
        ("sk-openai-key", "/openai/v1/chat/completions", "gpt-5-nano"),
        (
            "sk-or-openrouter-key",
            "/openrouter/v1/chat/completions",
            "openai/gpt-5-nano",
        ),
    ],
)
def test_chat_completion_payload_matches_native_key(
    monkeypatch, api_key, expected_url, expected_model
):
    monkeypatch.setattr(assistant.settings, "AIPIPE_API_KEY", api_key)

    result = assistant.complete_chat([{"role": "user", "content": "Help"}])

    assert result == "Chat reply"
    assert _Client.request["url"] == f"https://aipipe.org{expected_url}"
    assert _Client.request["headers"]["Authorization"] == f"Bearer {api_key}"
    assert _Client.request["json"]["model"] == expected_model
    assert api_key not in str(_Client.request["json"])


def test_gemini_payload_and_response_match_native_key(monkeypatch):
    monkeypatch.setattr(assistant.settings, "AIPIPE_API_KEY", "AIzaGeminiKey")

    result = assistant.complete_chat(
        [
            {"role": "user", "content": "The lift stopped"},
            {"role": "assistant", "content": "Are you inside?"},
        ]
    )

    assert result == "Gemini reply"
    assert _Client.request["url"].endswith(
        "/geminiv1beta/models/gemini-2.5-flash-lite:generateContent"
    )
    assert _Client.request["json"]["contents"] == [
        {"role": "user", "parts": [{"text": "The lift stopped"}]},
        {"role": "model", "parts": [{"text": "Are you inside?"}]},
    ]
    assert "systemInstruction" in _Client.request["json"]


def test_ai_pipe_client_reports_missing_configuration(monkeypatch):
    monkeypatch.setattr(assistant.settings, "AIPIPE_API_KEY", "")

    with pytest.raises(HTTPException) as caught:
        assistant.complete_chat([{"role": "user", "content": "Help"}])

    assert caught.value.status_code == 503
    assert "not configured" in caught.value.detail
