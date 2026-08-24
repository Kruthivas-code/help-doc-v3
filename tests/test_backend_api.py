"""
Backend API Tests for DocuMint Documentation Platform
Tests: Authentication, Projects, Documents, AI Generation
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mdx-editor-staging.preview.emergentagent.com').rstrip('/')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', 'test_session_1768652984547')

class TestHealthEndpoints:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check passed: {data}")
    
    def test_root_endpoint(self):
        """Test /api/ returns API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Root endpoint passed: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_auth_me_with_valid_token(self):
        """Test /api/auth/me with valid session token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        print(f"✓ Auth/me passed: {data['email']}")
    
    def test_auth_me_without_token(self):
        """Test /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Auth/me without token correctly returns 401")
    
    def test_auth_me_with_invalid_token(self):
        """Test /api/auth/me with invalid token returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401
        print("✓ Auth/me with invalid token correctly returns 401")


class TestProjectsCRUD:
    """Project CRUD operation tests"""
    
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
    
    def test_create_project(self, auth_headers):
        """Test POST /api/projects creates new project"""
        project_data = {
            "name": "TEST_Project_Create",
            "slug": f"test-project-{os.urandom(4).hex()}",
            "description": "Test project for API testing"
        }
        response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=project_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == project_data["name"]
        assert data["slug"] == project_data["slug"]
        assert "id" in data
        print(f"✓ Create project passed: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{data['id']}", headers=auth_headers)
    
    def test_get_single_project(self, auth_headers):
        """Test GET /api/projects/{id} returns project"""
        # First create a project
        project_data = {
            "name": "TEST_Project_Get",
            "slug": f"test-get-{os.urandom(4).hex()}",
            "description": "Test project"
        }
        create_response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=project_data)
        project_id = create_response.json()["id"]
        
        # Get the project
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id
        assert data["name"] == project_data["name"]
        print(f"✓ Get single project passed: {data['name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
    
    def test_update_project(self, auth_headers):
        """Test PUT /api/projects/{id} updates project"""
        # Create project
        project_data = {
            "name": "TEST_Project_Update",
            "slug": f"test-update-{os.urandom(4).hex()}",
            "description": "Original description"
        }
        create_response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=project_data)
        project_id = create_response.json()["id"]
        
        # Update project
        update_data = {"name": "TEST_Project_Updated", "description": "Updated description"}
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Project_Updated"
        assert data["description"] == "Updated description"
        print(f"✓ Update project passed: {data['name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
    
    def test_delete_project(self, auth_headers):
        """Test DELETE /api/projects/{id} deletes project"""
        # Create project
        project_data = {
            "name": "TEST_Project_Delete",
            "slug": f"test-delete-{os.urandom(4).hex()}",
            "description": "To be deleted"
        }
        create_response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=project_data)
        project_id = create_response.json()["id"]
        
        # Delete project
        response = requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print("✓ Delete project passed")


class TestDocumentsCRUD:
    """Document CRUD operation tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def test_project(self, auth_headers):
        """Create a test project for document tests"""
        project_data = {
            "name": "TEST_Doc_Project",
            "slug": f"test-doc-project-{os.urandom(4).hex()}",
            "description": "Project for document testing"
        }
        response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=project_data)
        project = response.json()
        yield project
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=auth_headers)
    
    def test_get_documents(self, auth_headers, test_project):
        """Test GET /api/projects/{id}/documents returns list"""
        response = requests.get(f"{BASE_URL}/api/projects/{test_project['id']}/documents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get documents passed: {len(data)} documents")
    
    def test_create_document(self, auth_headers, test_project):
        """Test POST /api/projects/{id}/documents creates document"""
        doc_data = {
            "title": "TEST_Document",
            "slug": "test-document",
            "content": "# Test Document\n\nThis is test content.",
            "icon": "file-text"
        }
        response = requests.post(
            f"{BASE_URL}/api/projects/{test_project['id']}/documents",
            headers=auth_headers,
            json=doc_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == doc_data["title"]
        assert data["content"] == doc_data["content"]
        assert "id" in data
        print(f"✓ Create document passed: {data['id']}")
    
    def test_create_document_with_mdx_content(self, auth_headers, test_project):
        """Test creating document with MDX-like custom components"""
        mdx_content = """# MDX Test

<Steps>
<Step title="First Step">
Content for first step
</Step>
<Step title="Second Step">
Content for second step
</Step>
</Steps>

<CardGroup>
<Card title="Card 1" icon="star">
Card content
</Card>
</CardGroup>

<Tabs>
<Tab label="Tab 1">
Tab 1 content
</Tab>
<Tab label="Tab 2">
Tab 2 content
</Tab>
</Tabs>
"""
        doc_data = {
            "title": "TEST_MDX_Document",
            "slug": "test-mdx-document",
            "content": mdx_content,
            "icon": "code"
        }
        response = requests.post(
            f"{BASE_URL}/api/projects/{test_project['id']}/documents",
            headers=auth_headers,
            json=doc_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "<Steps>" in data["content"]
        assert "<CardGroup>" in data["content"]
        assert "<Tabs>" in data["content"]
        print("✓ Create MDX document passed")
    
    def test_update_document(self, auth_headers, test_project):
        """Test PUT /api/projects/{id}/documents/{doc_id} updates document"""
        # Create document
        doc_data = {
            "title": "TEST_Doc_Update",
            "slug": "test-doc-update",
            "content": "Original content"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/projects/{test_project['id']}/documents",
            headers=auth_headers,
            json=doc_data
        )
        doc_id = create_response.json()["id"]
        
        # Update document
        update_data = {"title": "TEST_Doc_Updated", "content": "Updated content"}
        response = requests.put(
            f"{BASE_URL}/api/projects/{test_project['id']}/documents/{doc_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Doc_Updated"
        assert data["content"] == "Updated content"
        print("✓ Update document passed")
    
    def test_delete_document(self, auth_headers, test_project):
        """Test DELETE /api/projects/{id}/documents/{doc_id} deletes document"""
        # Create document
        doc_data = {
            "title": "TEST_Doc_Delete",
            "slug": "test-doc-delete",
            "content": "To be deleted"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/projects/{test_project['id']}/documents",
            headers=auth_headers,
            json=doc_data
        )
        doc_id = create_response.json()["id"]
        
        # Delete document
        response = requests.delete(
            f"{BASE_URL}/api/projects/{test_project['id']}/documents/{doc_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{test_project['id']}/documents/{doc_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
        print("✓ Delete document passed")


class TestExistingProjectDocuments:
    """Test existing project with MDX content"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    def test_get_test_project_documents(self, auth_headers):
        """Test getting documents from the test project with MDX content"""
        project_id = "cfd75577-837e-41b4-bd54-2877303b3b6c"
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}/documents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
        
        # Verify document titles
        titles = [doc["title"] for doc in data]
        assert "Getting Started" in titles
        assert "API Reference" in titles
        assert "Configuration" in titles
        print(f"✓ Test project has {len(data)} documents with MDX content")
    
    def test_document_content_has_custom_components(self, auth_headers):
        """Verify documents contain custom MDX components"""
        project_id = "cfd75577-837e-41b4-bd54-2877303b3b6c"
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}/documents", headers=auth_headers)
        docs = response.json()
        
        getting_started = next((d for d in docs if d["slug"] == "getting-started"), None)
        assert getting_started is not None
        
        content = getting_started["content"]
        assert "<Steps>" in content
        assert "<CardGroup>" in content
        assert "<Tabs>" in content
        assert "<Accordion>" in content
        print("✓ Document contains all custom MDX components")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
