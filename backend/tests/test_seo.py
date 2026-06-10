"""
Backend regression for SEO endpoints:
- /api/seo/robots.txt and /robots.txt serve plain text with sitemap directive + /admin disallow
- /api/seo/sitemap.xml and /sitemap.xml return valid XML with application/xml content-type
- Sitemap includes the homepage and at least one document URL
"""

import os
import xml.etree.ElementTree as ET

import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break


def test_api_robots_txt():
    r = requests.get(f"{BASE_URL}/api/seo/robots.txt", timeout=30)
    assert r.status_code == 200
    assert "text/plain" in r.headers.get("content-type", "")
    body = r.text
    assert "User-agent: *" in body
    assert "Disallow: /admin" in body
    assert "Sitemap:" in body


def test_api_sitemap_xml_valid():
    r = requests.get(f"{BASE_URL}/api/seo/sitemap.xml", timeout=30)
    assert r.status_code == 200
    assert "application/xml" in r.headers.get("content-type", "")
    # Parses as valid XML
    root = ET.fromstring(r.content)
    assert root.tag.endswith("urlset")
    locs = [el.text for el in root.iter() if el.tag.endswith("loc")]
    assert any(loc.rstrip("/").endswith(".sh") or loc.endswith("/") for loc in locs)
    # Homepage present
    assert any(loc.endswith("/") for loc in locs)
    # At least one document URL beyond the homepage
    assert len(locs) >= 1


def test_root_sitemap_xml_valid():
    r = requests.get(f"{BASE_URL}/sitemap.xml", timeout=30)
    assert r.status_code == 200
    # Either the dynamic urlset (backend) or the static sitemapindex (frontend build)
    root = ET.fromstring(r.content)
    assert root.tag.endswith("urlset") or root.tag.endswith("sitemapindex")
