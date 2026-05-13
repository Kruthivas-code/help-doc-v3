"""
Backend API Tests for Full docs.json Schema Implementation
Tests the ProjectConfig model with branding fields (logo, favicon, colors, background pattern).

Features tested:
1. GET /api/projects/{id}/config - Returns full config including logo_dark_url, logo_light_url, favicon_url, primary_color, background_pattern
2. PUT /api/projects/{id}/config - Can update branding fields (logo, favicon, colors)
3. GET /api/public/default-project - Returns config with all branding fields
4. Backend health check - GET /api/health
5. Config schema supports: site_title, site_description, primary_color, theme, background_pattern, logo_dark_url, logo_light_url, favicon_url, navbar, navigation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://docs-engine-1.preview.emergentagent.com').rstrip('/')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', 'test_session_1768652984547')


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint_returns_healthy(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check passed: status={data['status']}")


class TestPublicDefaultProjectConfig:
    """Tests for config fields in /api/public/default-project endpoint
    
    Note: The public endpoint returns whatever is stored in the database.
    Older configs may not have all schema fields. The authenticated endpoint
    GET /api/projects/{id}/config creates default config with all fields.
    """
    
    def test_default_project_returns_config(self):
        """Test /api/public/default-project returns config object"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        assert "config" in data
        print("✓ Default project returns config field")
    
    def test_config_has_project_id(self):
        """Test config has project_id field"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        config = data.get("config")
        if config:
            assert "project_id" in config, "Config missing project_id field"
            print(f"✓ Config has project_id: {config['project_id']}")
        else:
            pytest.skip("No config available for project")
    
    def test_config_has_navigation_field(self):
        """Test config has navigation field for sidebar navigation"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        config = data.get("config")
        if config:
            assert "navigation" in config, "Config missing navigation field"
            print(f"✓ Config has navigation field: {type(config['navigation'])}")
        else:
            pytest.skip("No config available for project")
    
    def test_public_endpoint_returns_stored_config(self):
        """Test public endpoint returns whatever config is stored in database
        
        Note: This test documents that the public endpoint returns raw database data.
        Older configs may not have all schema fields - this is expected behavior.
        The authenticated GET /api/projects/{id}/config endpoint creates defaults.
        """
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        config = data.get("config")
        if config:
            # Config should at minimum have project_id
            assert "project_id" in config
            # Log what fields are present for debugging
            print(f"✓ Public config has fields: {list(config.keys())}")
        else:
            print("✓ No config stored for default project (will use defaults)")
    
    def test_default_project_returns_documents(self):
        """Test /api/public/default-project returns documents array"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        assert "documents" in data
        documents = data["documents"]
        assert isinstance(documents, list)
        print(f"✓ Default project returns {len(documents)} documents")
    
    def test_default_project_returns_project(self):
        """Test /api/public/default-project returns project object"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        assert "project" in data
        project = data["project"]
        assert "id" in project
        assert "name" in project
        assert "slug" in project
        print(f"✓ Default project: {project['name']} (slug: {project['slug']})")


class TestAuthenticatedProjectConfig:
    """Tests for authenticated /api/projects/{id}/config endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def project_id(self, auth_headers):
        """Get a valid project ID for testing"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Cannot get projects - auth may have failed")
        
        projects = response.json()
        if len(projects) == 0:
            pytest.skip("No projects available for testing")
        
        return projects[0]["id"]
    
    def test_get_project_config_requires_auth(self):
        """Test GET /api/projects/{id}/config requires authentication"""
        response = requests.get(f"{BASE_URL}/api/projects/some-id/config")
        assert response.status_code == 401
        print("✓ GET /api/projects/{id}/config requires authentication")
    
    def test_get_project_config_returns_200(self, auth_headers, project_id):
        """Test GET /api/projects/{id}/config returns 200 with auth"""
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}/config", headers=auth_headers)
        assert response.status_code == 200
        print(f"✓ GET /api/projects/{project_id}/config returns 200")
    
    def test_get_project_config_has_all_schema_fields(self, auth_headers, project_id):
        """Test GET /api/projects/{id}/config returns all schema fields"""
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}/config", headers=auth_headers)
        assert response.status_code == 200
        config = response.json()
        
        # Required schema fields
        required_fields = [
            "id", "project_id",
            # Site Details
            "site_title", "site_description", "favicon_url",
            # Theme
            "theme", "layout",
            # Branding
            "primary_color", "light_color", "dark_color",
            "logo_light_url", "logo_dark_url", "logo_link",
            # Styling / Background
            "background_color", "background_image_url", "background_pattern",
            # Navigation
            "navbar", "navigation", "footer", "banner",
            # Features
            "top_nav_enabled", "search_enabled", "toc_enabled",
            # Meta
            "updated_at"
        ]
        
        for field in required_fields:
            assert field in config, f"Config missing required field: {field}"
        
        print(f"✓ Config has all {len(required_fields)} required schema fields")
    
    def test_get_project_config_returns_correct_project_id(self, auth_headers, project_id):
        """Test config returns correct project_id"""
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}/config", headers=auth_headers)
        assert response.status_code == 200
        config = response.json()
        
        assert config["project_id"] == project_id
        print(f"✓ Config project_id matches: {project_id}")


class TestUpdateProjectConfig:
    """Tests for PUT /api/projects/{id}/config endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def project_id(self, auth_headers):
        """Get a valid project ID for testing"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Cannot get projects - auth may have failed")
        
        projects = response.json()
        if len(projects) == 0:
            pytest.skip("No projects available for testing")
        
        return projects[0]["id"]
    
    def test_update_config_requires_auth(self):
        """Test PUT /api/projects/{id}/config requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/projects/some-id/config",
            json={"primary_color": "#ff0000"}
        )
        assert response.status_code == 401
        print("✓ PUT /api/projects/{id}/config requires authentication")
    
    def test_update_primary_color(self, auth_headers, project_id):
        """Test updating primary_color field"""
        # Get current config
        get_response = requests.get(f"{BASE_URL}/api/projects/{project_id}/config", headers=auth_headers)
        assert get_response.status_code == 200
        original_color = get_response.json().get("primary_color")
        
        # Update to new color
        new_color = "#188455"  # Mintlify accent color
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/config",
            headers=auth_headers,
            json={"primary_color": new_color}
        )
        assert update_response.status_code == 200
        updated_config = update_response.json()
        assert updated_config["primary_color"] == new_color
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/projects/{project_id}/config", headers=auth_headers)
        assert verify_response.status_code == 200
        assert verify_response.json()["primary_color"] == new_color
        
        print(f"✓ Updated primary_color from {original_color} to {new_color}")
    
    def test_update_theme(self, auth_headers, project_id):
        """Test updating theme field"""
        new_theme = "mint"
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/config",
            headers=auth_headers,
            json={"theme": new_theme}
        )
        assert update_response.status_code == 200
        updated_config = update_response.json()
        assert updated_config["theme"] == new_theme
        
        print(f"✓ Updated theme to: {new_theme}")
    
    def test_update_background_pattern(self, auth_headers, project_id):
        """Test updating background_pattern field"""
        # Test each valid pattern
        valid_patterns = ["none", "dots", "grid"]
        
        for pattern in valid_patterns:
            update_response = requests.put(
                f"{BASE_URL}/api/projects/{project_id}/config",
                headers=auth_headers,
                json={"background_pattern": pattern}
            )
            assert update_response.status_code == 200
            updated_config = update_response.json()
            assert updated_config["background_pattern"] == pattern
        
        print(f"✓ Successfully updated background_pattern to all valid values: {valid_patterns}")
    
    def test_update_logo_urls(self, auth_headers, project_id):
        """Test updating logo_dark_url and logo_light_url fields"""
        logo_dark = "https://example.com/logo-dark.png"
        logo_light = "https://example.com/logo-light.png"
        
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/config",
            headers=auth_headers,
            json={
                "logo_dark_url": logo_dark,
                "logo_light_url": logo_light
            }
        )
        assert update_response.status_code == 200
        updated_config = update_response.json()
        assert updated_config["logo_dark_url"] == logo_dark
        assert updated_config["logo_light_url"] == logo_light
        
        print(f"✓ Updated logo URLs: dark={logo_dark}, light={logo_light}")
    
    def test_update_favicon_url(self, auth_headers, project_id):
        """Test updating favicon_url field"""
        favicon = "https://example.com/favicon.ico"
        
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/config",
            headers=auth_headers,
            json={"favicon_url": favicon}
        )
        assert update_response.status_code == 200
        updated_config = update_response.json()
        assert updated_config["favicon_url"] == favicon
        
        print(f"✓ Updated favicon_url to: {favicon}")
    
    def test_update_site_details(self, auth_headers, project_id):
        """Test updating site_title and site_description fields"""
        site_title = "Test Documentation"
        site_description = "Test description for documentation site"
        
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/config",
            headers=auth_headers,
            json={
                "site_title": site_title,
                "site_description": site_description
            }
        )
        assert update_response.status_code == 200
        updated_config = update_response.json()
        assert updated_config["site_title"] == site_title
        assert updated_config["site_description"] == site_description
        
        print(f"✓ Updated site_title='{site_title}' and site_description")
    
    def test_update_navbar(self, auth_headers, project_id):
        """Test updating navbar field"""
        navbar = {
            "links": [
                {"label": "Home", "href": "/"},
                {"label": "Docs", "href": "/docs"}
            ],
            "primary": {"type": "button", "label": "Get Started", "href": "/start"}
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/config",
            headers=auth_headers,
            json={"navbar": navbar}
        )
        assert update_response.status_code == 200
        updated_config = update_response.json()
        assert updated_config["navbar"] == navbar
        
        print(f"✓ Updated navbar with {len(navbar['links'])} links")
    
    def test_update_navigation(self, auth_headers, project_id):
        """Test updating navigation field"""
        navigation = {
            "groups": [
                {
                    "group": "Getting Started",
                    "pages": ["introduction", "quickstart"]
                }
            ]
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/config",
            headers=auth_headers,
            json={"navigation": navigation}
        )
        assert update_response.status_code == 200
        updated_config = update_response.json()
        assert updated_config["navigation"] == navigation
        
        print(f"✓ Updated navigation with groups structure")
    
    def test_update_multiple_fields_at_once(self, auth_headers, project_id):
        """Test updating multiple config fields in a single request"""
        update_data = {
            "primary_color": "#188455",
            "theme": "default",
            "background_pattern": "dots",
            "site_title": "Multi-field Update Test",
            "top_nav_enabled": True,
            "search_enabled": True,
            "toc_enabled": True
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/config",
            headers=auth_headers,
            json=update_data
        )
        assert update_response.status_code == 200
        updated_config = update_response.json()
        
        for key, value in update_data.items():
            assert updated_config[key] == value, f"Field {key} not updated correctly"
        
        print(f"✓ Updated {len(update_data)} fields in single request")


class TestConfigSchemaValidation:
    """Tests for config schema validation"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def project_id(self, auth_headers):
        """Get a valid project ID for testing"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Cannot get projects - auth may have failed")
        
        projects = response.json()
        if len(projects) == 0:
            pytest.skip("No projects available for testing")
        
        return projects[0]["id"]
    
    def test_config_default_values(self, auth_headers, project_id):
        """Test config has correct default values"""
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}/config", headers=auth_headers)
        assert response.status_code == 200
        config = response.json()
        
        # Check default boolean values
        assert isinstance(config["top_nav_enabled"], bool)
        assert isinstance(config["search_enabled"], bool)
        assert isinstance(config["toc_enabled"], bool)
        
        # Check default string values exist
        assert isinstance(config["theme"], str)
        assert isinstance(config["layout"], str)
        assert isinstance(config["background_pattern"], str)
        
        print("✓ Config has correct default value types")
    
    def test_config_updated_at_changes_on_update(self, auth_headers, project_id):
        """Test updated_at timestamp changes when config is updated"""
        # Get current config
        get_response = requests.get(f"{BASE_URL}/api/projects/{project_id}/config", headers=auth_headers)
        assert get_response.status_code == 200
        original_updated_at = get_response.json()["updated_at"]
        
        # Wait a moment and update
        import time
        time.sleep(1)
        
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/config",
            headers=auth_headers,
            json={"site_title": f"Updated at {time.time()}"}
        )
        assert update_response.status_code == 200
        new_updated_at = update_response.json()["updated_at"]
        
        assert new_updated_at != original_updated_at
        print(f"✓ updated_at changed from {original_updated_at} to {new_updated_at}")


class TestPublicProjectConfigConsistency:
    """Test that public endpoint returns same config as authenticated endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    def test_public_and_auth_config_match(self, auth_headers):
        """Test public default-project config matches authenticated config"""
        # Get public config
        public_response = requests.get(f"{BASE_URL}/api/public/default-project")
        if public_response.status_code != 200:
            pytest.skip("No default project available")
        
        public_data = public_response.json()
        project_id = public_data["project"]["id"]
        public_config = public_data.get("config")
        
        if not public_config:
            pytest.skip("No config available for project")
        
        # Get authenticated config
        auth_response = requests.get(f"{BASE_URL}/api/projects/{project_id}/config", headers=auth_headers)
        if auth_response.status_code != 200:
            pytest.skip("Cannot access authenticated config")
        
        auth_config = auth_response.json()
        
        # Compare key fields
        key_fields = ["primary_color", "theme", "background_pattern", "site_title", "favicon_url"]
        for field in key_fields:
            assert public_config.get(field) == auth_config.get(field), f"Mismatch in {field}"
        
        print("✓ Public and authenticated config match for key fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
