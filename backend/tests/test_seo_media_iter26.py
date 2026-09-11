"""Iteration 26 – SEO/AI-discoverability + media optimization public-endpoint tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://mdx-editor-staging.preview.emergentagent.com").rstrip("/")
PROJECT_ID = "d901b4ab-a271-4aff-b63a-bf92d73b9bb0"
FAVICON = f"{BASE_URL}/api/public/files/emergent-docs/{PROJECT_ID}/brand/favicon.png"


# ---------- Image transformation layer ----------
class TestImageTransform:
    def test_webp_transform_smaller_and_headers(self):
        orig = requests.get(FAVICON, timeout=30)
        assert orig.status_code == 200, orig.text
        assert orig.headers.get("content-type", "").startswith("image/png"), orig.headers

        r = requests.get(FAVICON, params={"w": 32, "format": "webp"}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type") == "image/webp", r.headers
        assert "Accept" in (r.headers.get("Vary") or ""), r.headers
        etag = r.headers.get("ETag")
        assert etag, r.headers
        assert len(r.content) < len(orig.content), (len(r.content), len(orig.content))

        # If-None-Match returns 304
        r2 = requests.get(
            FAVICON,
            params={"w": 32, "format": "webp"},
            headers={"If-None-Match": etag},
            timeout=30,
        )
        assert r2.status_code == 304, (r2.status_code, r2.text[:200])

    def test_content_negotiation_accept_webp(self):
        r = requests.get(FAVICON, headers={"Accept": "image/webp"}, timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type") == "image/webp", r.headers
        assert "Accept" in (r.headers.get("Vary") or "")

        # No special accept -> original png
        r2 = requests.get(FAVICON, headers={"Accept": "*/*"}, timeout=30)
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/png"), r2.headers

    def test_graceful_degrade_unknown_param(self):
        r = requests.get(FAVICON, params={"bogus": 1}, timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png"), r.headers


# ---------- Per-page markdown ----------
class TestPerPageMarkdown:
    def test_published_markdown(self):
        r = requests.get(f"{BASE_URL}/what-is-wingman.md", timeout=30, allow_redirects=True)
        assert r.status_code == 200, r.text[:300]
        assert "text/markdown" in (r.headers.get("content-type") or ""), r.headers
        assert r.text.lstrip().startswith("# What is Wingman"), r.text[:200]

    def test_missing_markdown_404(self):
        r = requests.get(f"{BASE_URL}/definitely-not-real.md", timeout=30, allow_redirects=True)
        assert r.status_code == 404, (r.status_code, r.text[:200])


# ---------- llms.txt / llms-full.txt ----------
class TestLLMsTxt:
    @pytest.mark.parametrize("path", ["/llms.txt", "/llms-full.txt"])
    def test_llms_endpoints(self, path):
        r = requests.get(f"{BASE_URL}{path}", timeout=30, allow_redirects=True)
        assert r.status_code == 200, r.text[:200]
        ct = r.headers.get("content-type") or ""
        assert "text/plain" in ct, (path, ct)
        assert "text/html" not in ct, (path, ct)


# ---------- Real 404s / valid routes ----------
class TestHtmlRoutes:
    def test_not_found_html(self):
        r = requests.get(
            f"{BASE_URL}/definitely-not-a-page-xyz",
            headers={"Accept": "text/html"},
            timeout=30,
            allow_redirects=True,
        )
        assert r.status_code == 404, r.status_code
        body = r.text
        assert "Not found" in body, body[:300]
        assert 'data-testid="not-found-page"' in body, body[:400]

    def test_valid_public_doc_200(self):
        r = requests.get(
            f"{BASE_URL}/what-is-wingman",
            headers={"Accept": "text/html"},
            timeout=30,
            allow_redirects=True,
        )
        assert r.status_code == 200

    def test_admin_route_200_not_404(self):
        r = requests.get(
            f"{BASE_URL}/admin",
            headers={"Accept": "text/html"},
            timeout=30,
            allow_redirects=True,
        )
        assert r.status_code == 200, r.status_code


# ---------- Feedback API ----------
class TestFeedback:
    def test_post_feedback_ok(self):
        r = requests.post(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/feedback",
            json={"slug": "what-is-wingman", "helpful": True, "comment": "TEST_iter26"},
            timeout=30,
        )
        assert r.status_code == 200, (r.status_code, r.text[:300])
        data = r.json()
        assert data.get("ok") is True, data
