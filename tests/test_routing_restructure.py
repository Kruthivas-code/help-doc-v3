"""
Backend API Tests for Routing Restructure
Tests the new /api/public/default-project endpoint and verifies existing public/auth endpoints still work.

Features tested:
1. GET /api/public/default-project - new endpoint to fetch default project without slug
2. GET /api/health - backend health check
3. GET /api/public/projects/{slug} - existing public project endpoint
4. Auth endpoints still require authentication
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://docs-platform-6.preview.emergentagent.com').rstrip('/')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', 'test_session_1768652984547')


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_returns_healthy(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check passed: status={data['status']}")
    
    def test_root_api_endpoint(self):
        """Test /api/ returns API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "DocuMint" in data["message"]
        print(f"✓ Root API endpoint passed: {data['message']}")


class TestPublicDefaultProject:
    """Tests for the new /api/public/default-project endpoint"""
    
    def test_default_project_returns_200(self):
        """Test /api/public/default-project returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        print("✓ Default project endpoint returns 200")
    
    def test_default_project_returns_project_data(self):
        """Test /api/public/default-project returns project object"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        # Verify project field exists and has required fields
        assert "project" in data
        project = data["project"]
        assert "id" in project
        assert "name" in project
        assert "slug" in project
        assert "user_id" in project
        print(f"✓ Default project returned: {project['name']} (slug: {project['slug']})")
    
    def test_default_project_returns_config(self):
        """Test /api/public/default-project returns config object"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        # Verify config field exists
        assert "config" in data
        config = data["config"]
        if config:
            assert "project_id" in config
            print(f"✓ Config returned for project_id: {config['project_id']}")
        else:
            print("✓ Config is null (no config set for project)")
    
    def test_default_project_returns_documents(self):
        """Test /api/public/default-project returns documents array"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        # Verify documents field exists and is a list
        assert "documents" in data
        documents = data["documents"]
        assert isinstance(documents, list)
        print(f"✓ Documents returned: {len(documents)} documents")
        
        # If documents exist, verify structure
        if len(documents) > 0:
            doc = documents[0]
            assert "id" in doc
            assert "title" in doc
            assert "slug" in doc
            assert "content" in doc
            assert "project_id" in doc
            print(f"  First document: {doc['title']} (slug: {doc['slug']})")
    
    def test_default_project_no_auth_required(self):
        """Test /api/public/default-project does not require authentication"""
        # Make request without any auth headers
        response = requests.get(
            f"{BASE_URL}/api/public/default-project",
            headers={}  # No auth headers
        )
        assert response.status_code == 200
        print("✓ Default project endpoint accessible without authentication")
    
    def test_default_project_documents_have_content(self):
        """Test documents returned have actual content"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        documents = data.get("documents", [])
        if len(documents) > 0:
            # Check at least one document has content
            has_content = any(doc.get("content", "").strip() for doc in documents)
            assert has_content, "At least one document should have content"
            print("✓ Documents have content")
        else:
            pytest.skip("No documents to verify content")


class TestPublicProjectBySlug:
    """Tests for existing /api/public/projects/{slug} endpoint"""
    
    def test_public_project_by_slug_returns_200(self):
        """Test /api/public/projects/{slug} returns 200 for existing project"""
        # First get the default project to get a valid slug
        default_response = requests.get(f"{BASE_URL}/api/public/default-project")
        if default_response.status_code != 200:
            pytest.skip("No default project available")
        
        slug = default_response.json()["project"]["slug"]
        
        response = requests.get(f"{BASE_URL}/api/public/projects/{slug}")
        assert response.status_code == 200
        print(f"✓ Public project by slug '{slug}' returns 200")
    
    def test_public_project_by_slug_returns_same_data(self):
        """Test /api/public/projects/{slug} returns same data as default-project"""
        # Get default project
        default_response = requests.get(f"{BASE_URL}/api/public/default-project")
        if default_response.status_code != 200:
            pytest.skip("No default project available")
        
        default_data = default_response.json()
        slug = default_data["project"]["slug"]
        
        # Get by slug
        slug_response = requests.get(f"{BASE_URL}/api/public/projects/{slug}")
        assert slug_response.status_code == 200
        slug_data = slug_response.json()
        
        # Compare project IDs
        assert default_data["project"]["id"] == slug_data["project"]["id"]
        print("✓ Both endpoints return same project data")
    
    def test_public_project_nonexistent_slug_returns_404(self):
        """Test /api/public/projects/{slug} returns 404 for non-existent slug"""
        response = requests.get(f"{BASE_URL}/api/public/projects/nonexistent-slug-12345")
        assert response.status_code == 404
        print("✓ Non-existent slug correctly returns 404")
    
    def test_public_project_no_auth_required(self):
        """Test /api/public/projects/{slug} does not require authentication"""
        default_response = requests.get(f"{BASE_URL}/api/public/default-project")
        if default_response.status_code != 200:
            pytest.skip("No default project available")
        
        slug = default_response.json()["project"]["slug"]
        
        response = requests.get(
            f"{BASE_URL}/api/public/projects/{slug}",
            headers={}  # No auth headers
        )
        assert response.status_code == 200
        print("✓ Public project by slug accessible without authentication")


class TestAuthEndpointsStillProtected:
    """Verify authenticated endpoints still require auth"""
    
    def test_projects_list_requires_auth(self):
        """Test GET /api/projects requires authentication"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 401
        print("✓ GET /api/projects correctly requires authentication")
    
    def test_project_config_requires_auth(self):
        """Test GET /api/projects/{id}/config requires authentication"""
        # Use a dummy project ID
        response = requests.get(f"{BASE_URL}/api/projects/some-project-id/config")
        assert response.status_code == 401
        print("✓ GET /api/projects/{id}/config correctly requires authentication")
    
    def test_documents_list_requires_auth(self):
        """Test GET /api/projects/{id}/documents requires authentication"""
        response = requests.get(f"{BASE_URL}/api/projects/some-project-id/documents")
        assert response.status_code == 401
        print("✓ GET /api/projects/{id}/documents correctly requires authentication")
    
    def test_auth_me_requires_auth(self):
        """Test GET /api/auth/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ GET /api/auth/me correctly requires authentication")


class TestAuthenticatedEndpointsWork:
    """Verify authenticated endpoints work with valid token"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    def test_projects_list_with_auth(self, auth_headers):
        """Test GET /api/projects works with valid auth"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/projects with auth returns {len(data)} projects")
    
    def test_auth_me_with_auth(self, auth_headers):
        """Test GET /api/auth/me works with valid auth"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        print(f"✓ GET /api/auth/me with auth returns user: {data['email']}")


class TestDocumentNavigationData:
    """Test that navigation data is properly returned for public docs"""
    
    def test_default_project_has_navigation_config(self):
        """Test default project returns navigation in config"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        config = data.get("config")
        if config and config.get("navigation"):
            nav = config["navigation"]
            # Navigation can have tabs, dropdowns, anchors, groups, or pages
            has_nav_structure = any([
                nav.get("tabs"),
                nav.get("dropdowns"),
                nav.get("anchors"),
                nav.get("groups"),
                nav.get("pages")
            ])
            if has_nav_structure:
                print(f"✓ Navigation config present with structure")
            else:
                print("✓ Navigation config present but empty")
        else:
            print("✓ No navigation config (will use auto-generated from documents)")
    
    def test_documents_have_order_field(self):
        """Test documents have order field for sorting"""
        response = requests.get(f"{BASE_URL}/api/public/default-project")
        assert response.status_code == 200
        data = response.json()
        
        documents = data.get("documents", [])
        if len(documents) > 0:
            for doc in documents:
                assert "order" in doc, f"Document {doc['title']} missing order field"
            print(f"✓ All {len(documents)} documents have order field")
        else:
            pytest.skip("No documents to verify")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
