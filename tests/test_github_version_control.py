"""
Backend API Tests for GitHub Integration and Version Control
Tests: GitHub OAuth, GitHub Status, Repos, Import/Export, Version Control CRUD
"""
import pytest
import requests
import os
import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mdx-editor-2.preview.emergentagent.com').rstrip('/')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', 'test_session_1768713249030')

# Test data from main agent context
TEST_PROJECT_ID = "1025f1c6-82c6-4c25-a2f0-0966fbc29a34"
TEST_DOCUMENT_ID = "7e7b6d7e-b56e-478f-88a6-59b3f864aff2"


class TestGitHubOAuth:
    """GitHub OAuth endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    def test_github_auth_url_endpoint(self, auth_headers):
        """Test GET /api/github/auth returns auth_url (or error if not configured)"""
        response = requests.get(f"{BASE_URL}/api/github/auth", headers=auth_headers)
        
        # GitHub OAuth may not be configured (GITHUB_CLIENT_ID empty)
        # Should return 500/520 with "GitHub integration not configured" or 200 with auth_url
        # Note: 520 is Cloudflare's wrapper for 500 errors
        if response.status_code in [500, 520]:
            data = response.json()
            assert "detail" in data
            assert "not configured" in data["detail"].lower()
            print(f"✓ GitHub auth endpoint correctly returns {response.status_code} when not configured: {data['detail']}")
        elif response.status_code == 200:
            data = response.json()
            assert "auth_url" in data
            assert "github.com/login/oauth/authorize" in data["auth_url"]
            assert "state" in data
            print(f"✓ GitHub auth endpoint returns auth_url: {data['auth_url'][:50]}...")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_github_auth_requires_authentication(self):
        """Test GET /api/github/auth requires authentication"""
        response = requests.get(f"{BASE_URL}/api/github/auth")
        assert response.status_code == 401
        print("✓ GitHub auth endpoint correctly requires authentication")


class TestGitHubStatus:
    """GitHub connection status endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    def test_github_status_endpoint(self, auth_headers):
        """Test GET /api/github/status returns connection status"""
        response = requests.get(f"{BASE_URL}/api/github/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should return connected: false since we haven't connected GitHub
        assert "connected" in data
        assert isinstance(data["connected"], bool)
        
        if data["connected"]:
            assert "github_username" in data
            assert "avatar_url" in data
            print(f"✓ GitHub status: Connected as {data['github_username']}")
        else:
            print("✓ GitHub status: Not connected (expected)")
    
    def test_github_status_requires_authentication(self):
        """Test GET /api/github/status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/github/status")
        assert response.status_code == 401
        print("✓ GitHub status endpoint correctly requires authentication")


class TestGitHubRepos:
    """GitHub repositories listing endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    def test_github_repos_without_connection(self, auth_headers):
        """Test GET /api/github/repos returns error when not connected"""
        response = requests.get(f"{BASE_URL}/api/github/repos", headers=auth_headers)
        
        # Should return 400 since GitHub is not connected
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "not connected" in data["detail"].lower()
        print(f"✓ GitHub repos correctly returns 400 when not connected: {data['detail']}")
    
    def test_github_repos_requires_authentication(self):
        """Test GET /api/github/repos requires authentication"""
        response = requests.get(f"{BASE_URL}/api/github/repos")
        assert response.status_code == 401
        print("✓ GitHub repos endpoint correctly requires authentication")


class TestGitHubDisconnect:
    """GitHub disconnect endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    def test_github_disconnect_endpoint(self, auth_headers):
        """Test DELETE /api/github/disconnect works even when not connected"""
        response = requests.delete(f"{BASE_URL}/api/github/disconnect", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ GitHub disconnect endpoint works: {data['message']}")
    
    def test_github_disconnect_requires_authentication(self):
        """Test DELETE /api/github/disconnect requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/github/disconnect")
        assert response.status_code == 401
        print("✓ GitHub disconnect endpoint correctly requires authentication")


class TestGitHubImportExport:
    """GitHub import/export endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def test_project(self, auth_headers):
        """Create a test project for import/export tests"""
        project_data = {
            "name": "TEST_GitHub_Project",
            "slug": f"test-github-project-{os.urandom(4).hex()}",
            "description": "Project for GitHub import/export testing"
        }
        response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=project_data)
        project = response.json()
        yield project
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=auth_headers)
    
    def test_github_import_without_connection(self, auth_headers, test_project):
        """Test POST /api/projects/{id}/github/import returns error when not connected"""
        import_data = {
            "repo_owner": "test-owner",
            "repo_name": "test-repo",
            "branch": "main",
            "path": "docs"
        }
        response = requests.post(
            f"{BASE_URL}/api/projects/{test_project['id']}/github/import",
            headers=auth_headers,
            json=import_data
        )
        assert response.status_code == 400
        data = response.json()
        assert "not connected" in data["detail"].lower()
        print(f"✓ GitHub import correctly returns 400 when not connected: {data['detail']}")
    
    def test_github_export_without_connection(self, auth_headers, test_project):
        """Test POST /api/projects/{id}/github/export returns error when not connected"""
        export_data = {
            "repo_owner": "test-owner",
            "repo_name": "test-repo",
            "branch": "main",
            "path": "docs",
            "commit_message": "Test export"
        }
        response = requests.post(
            f"{BASE_URL}/api/projects/{test_project['id']}/github/export",
            headers=auth_headers,
            json=export_data
        )
        assert response.status_code == 400
        data = response.json()
        assert "not connected" in data["detail"].lower()
        print(f"✓ GitHub export correctly returns 400 when not connected: {data['detail']}")


class TestGitHubRepoLink:
    """GitHub repository linking endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def test_project(self, auth_headers):
        """Create a test project for link tests"""
        project_data = {
            "name": "TEST_Link_Project",
            "slug": f"test-link-project-{os.urandom(4).hex()}",
            "description": "Project for GitHub link testing"
        }
        response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=project_data)
        project = response.json()
        yield project
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=auth_headers)
    
    def test_github_link_get_not_linked(self, auth_headers, test_project):
        """Test GET /api/projects/{id}/github/link returns linked: false"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{test_project['id']}/github/link",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["linked"] == False
        print("✓ GitHub link GET returns linked: false for new project")
    
    def test_github_link_post_without_connection(self, auth_headers, test_project):
        """Test POST /api/projects/{id}/github/link returns error when not connected"""
        link_data = {
            "repo_owner": "test-owner",
            "repo_name": "test-repo",
            "branch": "main",
            "docs_path": "docs"
        }
        response = requests.post(
            f"{BASE_URL}/api/projects/{test_project['id']}/github/link",
            headers=auth_headers,
            json=link_data
        )
        assert response.status_code == 400
        data = response.json()
        assert "not connected" in data["detail"].lower()
        print(f"✓ GitHub link POST correctly returns 400 when not connected: {data['detail']}")
    
    def test_github_unlink_endpoint(self, auth_headers, test_project):
        """Test DELETE /api/projects/{id}/github/link works even when not linked"""
        response = requests.delete(
            f"{BASE_URL}/api/projects/{test_project['id']}/github/link",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ GitHub unlink endpoint works: {data['message']}")


class TestVersionControl:
    """Version Control endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def test_project_with_doc(self, auth_headers):
        """Create a test project with a document for version tests"""
        # Create project
        project_data = {
            "name": "TEST_Version_Project",
            "slug": f"test-version-project-{os.urandom(4).hex()}",
            "description": "Project for version control testing"
        }
        project_response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=project_data)
        project = project_response.json()
        
        # Create document
        doc_data = {
            "title": "TEST_Version_Document",
            "slug": "test-version-document",
            "content": "# Original Content\n\nThis is the original document content."
        }
        doc_response = requests.post(
            f"{BASE_URL}/api/projects/{project['id']}/documents",
            headers=auth_headers,
            json=doc_data
        )
        document = doc_response.json()
        
        yield {"project": project, "document": document}
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=auth_headers)
    
    def test_list_versions_empty(self, auth_headers, test_project_with_doc):
        """Test GET /api/projects/{id}/documents/{doc_id}/versions returns empty list"""
        project_id = test_project_with_doc["project"]["id"]
        doc_id = test_project_with_doc["document"]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "versions" in data
        assert isinstance(data["versions"], list)
        print(f"✓ List versions returns empty list for new document: {len(data['versions'])} versions")
    
    def test_create_version(self, auth_headers, test_project_with_doc):
        """Test POST /api/projects/{id}/documents/{doc_id}/versions creates version"""
        project_id = test_project_with_doc["project"]["id"]
        doc_id = test_project_with_doc["document"]["id"]
        
        version_data = {"version_name": "v1.0 - Initial Release"}
        response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions",
            headers=auth_headers,
            json=version_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert data["version"]["version_name"] == "v1.0 - Initial Release"
        assert "id" in data["version"]
        assert "content" in data["version"]
        print(f"✓ Create version passed: {data['version']['id']}")
        
        # Verify version appears in list
        list_response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions",
            headers=auth_headers
        )
        versions = list_response.json()["versions"]
        assert len(versions) == 1
        assert versions[0]["version_name"] == "v1.0 - Initial Release"
        print("✓ Version appears in list after creation")
    
    def test_create_multiple_versions(self, auth_headers, test_project_with_doc):
        """Test creating multiple versions"""
        project_id = test_project_with_doc["project"]["id"]
        doc_id = test_project_with_doc["document"]["id"]
        
        # Create first version
        requests.post(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions",
            headers=auth_headers,
            json={"version_name": "v1.0"}
        )
        
        # Update document content
        requests.put(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}",
            headers=auth_headers,
            json={"content": "# Updated Content\n\nThis is updated content."}
        )
        
        # Create second version
        requests.post(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions",
            headers=auth_headers,
            json={"version_name": "v2.0"}
        )
        
        # Verify both versions exist
        list_response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions",
            headers=auth_headers
        )
        versions = list_response.json()["versions"]
        assert len(versions) == 2
        version_names = [v["version_name"] for v in versions]
        assert "v1.0" in version_names
        assert "v2.0" in version_names
        print("✓ Multiple versions created successfully")
    
    def test_get_specific_version(self, auth_headers, test_project_with_doc):
        """Test GET /api/projects/{id}/documents/{doc_id}/versions/{version_id}"""
        project_id = test_project_with_doc["project"]["id"]
        doc_id = test_project_with_doc["document"]["id"]
        
        # Create version
        create_response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions",
            headers=auth_headers,
            json={"version_name": "Test Version"}
        )
        version_id = create_response.json()["version"]["id"]
        
        # Get specific version
        response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions/{version_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == version_id
        assert data["version_name"] == "Test Version"
        assert "content" in data
        assert "title" in data
        print(f"✓ Get specific version passed: {data['version_name']}")
    
    def test_restore_version(self, auth_headers, test_project_with_doc):
        """Test POST /api/projects/{id}/documents/{doc_id}/restore restores version"""
        project_id = test_project_with_doc["project"]["id"]
        doc_id = test_project_with_doc["document"]["id"]
        original_content = test_project_with_doc["document"]["content"]
        
        # Create version of original content
        create_response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions",
            headers=auth_headers,
            json={"version_name": "Original Version"}
        )
        version_id = create_response.json()["version"]["id"]
        
        # Update document with new content
        new_content = "# New Content\n\nThis is completely new content."
        requests.put(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}",
            headers=auth_headers,
            json={"content": new_content}
        )
        
        # Verify document has new content
        doc_response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}",
            headers=auth_headers
        )
        assert doc_response.json()["content"] == new_content
        
        # Restore to original version
        restore_response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/restore",
            headers=auth_headers,
            json={"version_id": version_id}
        )
        assert restore_response.status_code == 200
        data = restore_response.json()
        assert "message" in data
        assert "restored" in data["message"].lower()
        print(f"✓ Restore version passed: {data['message']}")
        
        # Verify document content is restored
        restored_doc = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}",
            headers=auth_headers
        ).json()
        assert restored_doc["content"] == original_content
        print("✓ Document content correctly restored to original version")
        
        # Verify auto-backup was created
        versions_response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions",
            headers=auth_headers
        )
        versions = versions_response.json()["versions"]
        auto_backup = [v for v in versions if "Auto-backup" in v["version_name"]]
        assert len(auto_backup) > 0
        print("✓ Auto-backup version created before restore")
    
    def test_delete_version(self, auth_headers, test_project_with_doc):
        """Test DELETE /api/projects/{id}/documents/{doc_id}/versions/{version_id}"""
        project_id = test_project_with_doc["project"]["id"]
        doc_id = test_project_with_doc["document"]["id"]
        
        # Create version
        create_response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions",
            headers=auth_headers,
            json={"version_name": "To Be Deleted"}
        )
        version_id = create_response.json()["version"]["id"]
        
        # Delete version
        delete_response = requests.delete(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions/{version_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert "message" in data
        print(f"✓ Delete version passed: {data['message']}")
        
        # Verify version is deleted
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions/{version_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
        print("✓ Version correctly returns 404 after deletion")
    
    def test_version_not_found(self, auth_headers, test_project_with_doc):
        """Test version endpoints return 404 for non-existent version"""
        project_id = test_project_with_doc["project"]["id"]
        doc_id = test_project_with_doc["document"]["id"]
        fake_version_id = "non-existent-version-id"
        
        # Get non-existent version
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions/{fake_version_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
        
        # Restore non-existent version
        restore_response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/restore",
            headers=auth_headers,
            json={"version_id": fake_version_id}
        )
        assert restore_response.status_code == 404
        
        # Delete non-existent version
        delete_response = requests.delete(
            f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}/versions/{fake_version_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 404
        
        print("✓ All version endpoints correctly return 404 for non-existent version")


class TestVersionControlWithExistingData:
    """Test version control with existing test data from main agent"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}
    
    def test_list_versions_existing_document(self, auth_headers):
        """Test listing versions for existing document"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/documents/{TEST_DOCUMENT_ID}/versions",
            headers=auth_headers
        )
        
        # May return 404 if project/doc doesn't exist for this user
        if response.status_code == 404:
            print(f"⚠ Test project/document not found for test user (expected if different user)")
            pytest.skip("Test data not accessible for this test user")
        
        assert response.status_code == 200
        data = response.json()
        assert "versions" in data
        print(f"✓ Existing document has {len(data['versions'])} versions")


class TestVersionControlAuthentication:
    """Test version control endpoints require authentication"""
    
    def test_list_versions_requires_auth(self):
        """Test GET versions requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/documents/{TEST_DOCUMENT_ID}/versions"
        )
        assert response.status_code == 401
        print("✓ List versions correctly requires authentication")
    
    def test_create_version_requires_auth(self):
        """Test POST versions requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/documents/{TEST_DOCUMENT_ID}/versions",
            json={"version_name": "Test"}
        )
        assert response.status_code == 401
        print("✓ Create version correctly requires authentication")
    
    def test_restore_version_requires_auth(self):
        """Test POST restore requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/documents/{TEST_DOCUMENT_ID}/restore",
            json={"version_id": "test-id"}
        )
        assert response.status_code == 401
        print("✓ Restore version correctly requires authentication")
    
    def test_delete_version_requires_auth(self):
        """Test DELETE version requires authentication"""
        response = requests.delete(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/documents/{TEST_DOCUMENT_ID}/versions/test-id"
        )
        assert response.status_code == 401
        print("✓ Delete version correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
