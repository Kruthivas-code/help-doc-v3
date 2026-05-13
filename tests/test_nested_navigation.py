"""
Backend API Tests for Nested Navigation Structure
Tests: Navigation config API with nested groups (up to 3 levels deep)
"""
import pytest
import requests
import os
import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://docs-engine-1.preview.emergentagent.com').rstrip('/')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', 'test_session_1768652984547')


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check passed: {data}")


class TestNestedNavigationConfig:
    """Tests for nested navigation structure in project config"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def test_project(self, auth_headers):
        """Create a test project for navigation config tests"""
        project_data = {
            "name": "TEST_Nav_Project",
            "slug": f"test-nav-project-{int(time.time())}",
            "description": "Project for nested navigation testing"
        }
        response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=project_data)
        assert response.status_code == 200, f"Failed to create project: {response.text}"
        project = response.json()
        print(f"✓ Created test project: {project['id']}")
        yield project
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=auth_headers)
        print(f"✓ Cleaned up test project: {project['id']}")
    
    def test_get_default_config(self, auth_headers, test_project):
        """Test GET /api/projects/{id}/config returns default config"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{test_project['id']}/config",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "project_id" in data
        assert data["project_id"] == test_project["id"]
        # Default navigation should be None or empty
        print(f"✓ Get default config passed: navigation={data.get('navigation')}")
    
    def test_save_simple_navigation(self, auth_headers, test_project):
        """Test PUT /api/projects/{id}/config saves simple navigation structure"""
        simple_nav = {
            "groups": [
                {
                    "group": "Getting Started",
                    "pages": [
                        {"page": "introduction", "title": "Introduction"},
                        {"page": "quickstart", "title": "Quick Start"}
                    ],
                    "groups": []
                }
            ]
        }
        
        config_data = {
            "site_title": "Test Docs",
            "navigation": simple_nav
        }
        
        response = requests.put(
            f"{BASE_URL}/api/projects/{test_project['id']}/config",
            headers=auth_headers,
            json=config_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["navigation"] == simple_nav
        print(f"✓ Save simple navigation passed")
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{test_project['id']}/config",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["navigation"] == simple_nav
        print(f"✓ Simple navigation persisted correctly")
    
    def test_save_nested_navigation_2_levels(self, auth_headers, test_project):
        """Test PUT /api/projects/{id}/config saves 2-level nested navigation"""
        nested_nav = {
            "groups": [
                {
                    "group": "API Reference",
                    "pages": [
                        {"page": "overview", "title": "Overview"}
                    ],
                    "groups": [
                        {
                            "group": "Authentication",
                            "pages": [
                                {"page": "auth-basics", "title": "Auth Basics"},
                                {"page": "oauth", "title": "OAuth 2.0"}
                            ],
                            "groups": []
                        },
                        {
                            "group": "Endpoints",
                            "pages": [
                                {"page": "users", "title": "Users API"},
                                {"page": "projects", "title": "Projects API"}
                            ],
                            "groups": []
                        }
                    ]
                }
            ]
        }
        
        config_data = {
            "site_title": "Test Docs 2-Level",
            "navigation": nested_nav
        }
        
        response = requests.put(
            f"{BASE_URL}/api/projects/{test_project['id']}/config",
            headers=auth_headers,
            json=config_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["navigation"] == nested_nav
        
        # Verify nested structure
        assert len(data["navigation"]["groups"]) == 1
        assert len(data["navigation"]["groups"][0]["groups"]) == 2
        assert data["navigation"]["groups"][0]["groups"][0]["group"] == "Authentication"
        assert data["navigation"]["groups"][0]["groups"][1]["group"] == "Endpoints"
        print(f"✓ Save 2-level nested navigation passed")
        
        # Verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{test_project['id']}/config",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["navigation"] == nested_nav
        print(f"✓ 2-level nested navigation persisted correctly")
    
    def test_save_nested_navigation_3_levels(self, auth_headers, test_project):
        """Test PUT /api/projects/{id}/config saves 3-level nested navigation (max depth)"""
        nested_nav_3_levels = {
            "groups": [
                {
                    "group": "Documentation",
                    "pages": [
                        {"page": "intro", "title": "Introduction"}
                    ],
                    "groups": [
                        {
                            "group": "Level 2 - Guides",
                            "pages": [
                                {"page": "guide-1", "title": "Guide 1"}
                            ],
                            "groups": [
                                {
                                    "group": "Level 3 - Advanced",
                                    "pages": [
                                        {"page": "advanced-1", "title": "Advanced Topic 1"},
                                        {"page": "advanced-2", "title": "Advanced Topic 2"}
                                    ],
                                    "groups": []
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        config_data = {
            "site_title": "Test Docs 3-Level",
            "navigation": nested_nav_3_levels
        }
        
        response = requests.put(
            f"{BASE_URL}/api/projects/{test_project['id']}/config",
            headers=auth_headers,
            json=config_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["navigation"] == nested_nav_3_levels
        
        # Verify 3-level nested structure
        level1 = data["navigation"]["groups"][0]
        assert level1["group"] == "Documentation"
        
        level2 = level1["groups"][0]
        assert level2["group"] == "Level 2 - Guides"
        
        level3 = level2["groups"][0]
        assert level3["group"] == "Level 3 - Advanced"
        assert len(level3["pages"]) == 2
        
        print(f"✓ Save 3-level nested navigation passed")
        
        # Verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{test_project['id']}/config",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["navigation"] == nested_nav_3_levels
        print(f"✓ 3-level nested navigation persisted correctly")
    
    def test_save_complex_navigation_structure(self, auth_headers, test_project):
        """Test saving complex navigation with multiple groups and mixed nesting"""
        complex_nav = {
            "groups": [
                {
                    "group": "Getting Started",
                    "pages": [
                        {"page": "introduction", "title": "Introduction"},
                        {"page": "installation", "title": "Installation"}
                    ],
                    "groups": []
                },
                {
                    "group": "API Reference",
                    "pages": [],
                    "groups": [
                        {
                            "group": "REST API",
                            "pages": [
                                {"page": "rest-overview", "title": "REST Overview"}
                            ],
                            "groups": [
                                {
                                    "group": "Endpoints",
                                    "pages": [
                                        {"page": "users-endpoint", "title": "Users"},
                                        {"page": "projects-endpoint", "title": "Projects"}
                                    ],
                                    "groups": []
                                }
                            ]
                        },
                        {
                            "group": "GraphQL API",
                            "pages": [
                                {"page": "graphql-overview", "title": "GraphQL Overview"},
                                {"page": "graphql-queries", "title": "Queries"},
                                {"page": "graphql-mutations", "title": "Mutations"}
                            ],
                            "groups": []
                        }
                    ]
                },
                {
                    "group": "Guides",
                    "pages": [
                        {"page": "best-practices", "title": "Best Practices"},
                        {"page": "troubleshooting", "title": "Troubleshooting"}
                    ],
                    "groups": []
                }
            ]
        }
        
        config_data = {
            "site_title": "Complex Docs",
            "site_description": "Documentation with complex nested navigation",
            "navigation": complex_nav
        }
        
        response = requests.put(
            f"{BASE_URL}/api/projects/{test_project['id']}/config",
            headers=auth_headers,
            json=config_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert len(data["navigation"]["groups"]) == 3
        assert data["navigation"]["groups"][0]["group"] == "Getting Started"
        assert data["navigation"]["groups"][1]["group"] == "API Reference"
        assert data["navigation"]["groups"][2]["group"] == "Guides"
        
        # Verify nested groups in API Reference
        api_ref = data["navigation"]["groups"][1]
        assert len(api_ref["groups"]) == 2
        assert api_ref["groups"][0]["group"] == "REST API"
        assert api_ref["groups"][1]["group"] == "GraphQL API"
        
        # Verify 3rd level in REST API
        rest_api = api_ref["groups"][0]
        assert len(rest_api["groups"]) == 1
        assert rest_api["groups"][0]["group"] == "Endpoints"
        
        print(f"✓ Save complex navigation structure passed")
        
        # Verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{test_project['id']}/config",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["navigation"] == complex_nav
        print(f"✓ Complex navigation persisted correctly")
    
    def test_update_navigation_preserves_other_config(self, auth_headers, test_project):
        """Test that updating navigation preserves other config fields"""
        # First set some config
        initial_config = {
            "site_title": "My Docs",
            "site_description": "My documentation site",
            "primary_color": "#ff5500",
            "theme": "dark",
            "toc_enabled": True,
            "search_enabled": True
        }
        
        response1 = requests.put(
            f"{BASE_URL}/api/projects/{test_project['id']}/config",
            headers=auth_headers,
            json=initial_config
        )
        assert response1.status_code == 200
        
        # Now update only navigation
        nav_update = {
            "navigation": {
                "groups": [
                    {"group": "New Section", "pages": [{"page": "new-page", "title": "New Page"}], "groups": []}
                ]
            }
        }
        
        response2 = requests.put(
            f"{BASE_URL}/api/projects/{test_project['id']}/config",
            headers=auth_headers,
            json=nav_update
        )
        assert response2.status_code == 200
        data = response2.json()
        
        # Verify navigation was updated
        assert data["navigation"]["groups"][0]["group"] == "New Section"
        
        # Verify other fields are preserved
        assert data["site_title"] == "My Docs"
        assert data["site_description"] == "My documentation site"
        assert data["primary_color"] == "#ff5500"
        assert data["theme"] == "dark"
        
        print(f"✓ Update navigation preserves other config fields")


class TestPublicProjectNavigation:
    """Tests for public project endpoint with navigation data"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def public_test_project(self, auth_headers):
        """Create a test project with navigation for public access testing"""
        timestamp = int(time.time())
        project_data = {
            "name": "TEST_Public_Nav_Project",
            "slug": f"test-public-nav-{timestamp}",
            "description": "Project for public navigation testing"
        }
        response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=project_data)
        assert response.status_code == 200, f"Failed to create project: {response.text}"
        project = response.json()
        
        # Set up navigation config
        nav_config = {
            "site_title": "Public Test Docs",
            "navigation": {
                "groups": [
                    {
                        "group": "Getting Started",
                        "pages": [{"page": "intro", "title": "Introduction"}],
                        "groups": [
                            {
                                "group": "Nested Section",
                                "pages": [{"page": "nested-page", "title": "Nested Page"}],
                                "groups": []
                            }
                        ]
                    }
                ]
            }
        }
        
        config_response = requests.put(
            f"{BASE_URL}/api/projects/{project['id']}/config",
            headers=auth_headers,
            json=nav_config
        )
        assert config_response.status_code == 200
        
        print(f"✓ Created public test project: {project['slug']}")
        yield project
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=auth_headers)
        print(f"✓ Cleaned up public test project")
    
    def test_public_project_returns_navigation(self, public_test_project):
        """Test GET /api/public/projects/{slug} returns navigation data"""
        response = requests.get(
            f"{BASE_URL}/api/public/projects/{public_test_project['slug']}"
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "project" in data
        assert "config" in data
        assert "documents" in data
        
        # Verify navigation is included in config
        assert data["config"] is not None
        assert "navigation" in data["config"]
        
        nav = data["config"]["navigation"]
        assert nav is not None
        assert "groups" in nav
        assert len(nav["groups"]) == 1
        assert nav["groups"][0]["group"] == "Getting Started"
        
        # Verify nested structure
        assert len(nav["groups"][0]["groups"]) == 1
        assert nav["groups"][0]["groups"][0]["group"] == "Nested Section"
        
        print(f"✓ Public project returns navigation data correctly")
    
    def test_public_project_not_found(self):
        """Test GET /api/public/projects/{slug} returns 404 for non-existent project"""
        response = requests.get(
            f"{BASE_URL}/api/public/projects/non-existent-project-slug-12345"
        )
        assert response.status_code == 404
        print(f"✓ Public project returns 404 for non-existent slug")


class TestProjectCRUD:
    """Basic Project CRUD tests to ensure core functionality works"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    def test_get_projects(self, auth_headers):
        """Test GET /api/projects returns list"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get projects passed: {len(data)} projects found")
    
    def test_create_and_delete_project(self, auth_headers):
        """Test project create and delete cycle"""
        project_data = {
            "name": "TEST_CRUD_Project",
            "slug": f"test-crud-{int(time.time())}",
            "description": "Test project for CRUD"
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=project_data)
        assert create_response.status_code == 200
        project = create_response.json()
        assert project["name"] == project_data["name"]
        assert "id" in project
        print(f"✓ Create project passed: {project['id']}")
        
        # Get
        get_response = requests.get(f"{BASE_URL}/api/projects/{project['id']}", headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.json()["id"] == project["id"]
        print(f"✓ Get project passed")
        
        # Update
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project['id']}",
            headers=auth_headers,
            json={"name": "TEST_CRUD_Updated"}
        )
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "TEST_CRUD_Updated"
        print(f"✓ Update project passed")
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=auth_headers)
        assert delete_response.status_code == 200
        print(f"✓ Delete project passed")
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/projects/{project['id']}", headers=auth_headers)
        assert verify_response.status_code == 404
        print(f"✓ Project deletion verified")


class TestConfigEndpointAuth:
    """Test authentication requirements for config endpoints"""
    
    def test_get_config_requires_auth(self):
        """Test GET /api/projects/{id}/config requires authentication"""
        response = requests.get(f"{BASE_URL}/api/projects/some-project-id/config")
        assert response.status_code == 401
        print(f"✓ Get config requires authentication")
    
    def test_put_config_requires_auth(self):
        """Test PUT /api/projects/{id}/config requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/projects/some-project-id/config",
            json={"site_title": "Test"}
        )
        assert response.status_code == 401
        print(f"✓ Put config requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
