#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class DocuMintAPITester:
    def __init__(self, base_url="https://docs-engine-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = "test_session_1768642715563"
        self.test_user_id = "test-user-1768642715563"
        self.test_project_id = "1025f1c6-82c6-4c25-a2f0-0966fbc29a34"
        self.test_doc_id = "7e7b6d7e-b56e-478f-88a6-59b3f864aff2"
        self.test_doc_slug = "getting-started"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def get_headers(self):
        """Get headers with authorization"""
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, description=""):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = self.get_headers()

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        if description:
            print(f"   {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        
        # Test root endpoint
        self.run_test("Root Endpoint", "GET", "", 200, description="Basic API health check")
        
        # Test health endpoint
        self.run_test("Health Endpoint", "GET", "health", 200, description="Detailed health status")

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test /auth/me with valid token
        success, user_data = self.run_test(
            "Get Current User", 
            "GET", 
            "auth/me", 
            200, 
            description="Verify session token authentication"
        )
        
        if success and user_data:
            print(f"   User: {user_data.get('name', 'Unknown')} ({user_data.get('email', 'No email')})")
            return user_data
        
        return None

    def test_projects_crud(self):
        """Test project CRUD operations"""
        print("\n=== PROJECT CRUD TESTS ===")
        
        # Get all projects
        success, projects = self.run_test(
            "Get All Projects", 
            "GET", 
            "projects", 
            200, 
            description="Fetch user's projects"
        )
        
        if success:
            print(f"   Found {len(projects)} projects")
        
        # Get specific project
        success, project = self.run_test(
            "Get Specific Project", 
            "GET", 
            f"projects/{self.test_project_id}", 
            200, 
            description=f"Fetch project {self.test_project_id}"
        )
        
        if success and project:
            print(f"   Project: {project.get('name', 'Unknown')} - {project.get('description', 'No description')}")
        
        # Test creating a new project
        new_project_data = {
            "name": f"Test Project {datetime.now().strftime('%H%M%S')}",
            "slug": f"test-project-{datetime.now().strftime('%H%M%S')}",
            "description": "Test project created by automated testing"
        }
        
        success, created_project = self.run_test(
            "Create New Project", 
            "POST", 
            "projects", 
            200, 
            data=new_project_data,
            description="Create a new documentation project"
        )
        
        created_project_id = None
        if success and created_project:
            created_project_id = created_project.get('id')
            print(f"   Created project ID: {created_project_id}")
        
        # Test updating project (if we created one)
        if created_project_id:
            update_data = {
                "description": "Updated description by automated testing"
            }
            self.run_test(
                "Update Project", 
                "PUT", 
                f"projects/{created_project_id}", 
                200, 
                data=update_data,
                description="Update project description"
            )
        
        return created_project_id

    def test_documents_crud(self, project_id=None):
        """Test document CRUD operations"""
        print("\n=== DOCUMENT CRUD TESTS ===")
        
        # Use test project ID if no project provided
        if not project_id:
            project_id = self.test_project_id
        
        # Get all documents for project
        success, documents = self.run_test(
            "Get Project Documents", 
            "GET", 
            f"projects/{project_id}/documents", 
            200, 
            description=f"Fetch documents for project {project_id}"
        )
        
        if success:
            print(f"   Found {len(documents)} documents")
        
        # Get specific document
        success, document = self.run_test(
            "Get Specific Document", 
            "GET", 
            f"projects/{project_id}/documents/{self.test_doc_id}", 
            200, 
            description=f"Fetch document {self.test_doc_id}"
        )
        
        if success and document:
            print(f"   Document: {document.get('title', 'Unknown')} - {len(document.get('content', ''))} chars")
        
        # Create new document
        new_doc_data = {
            "title": f"Test Document {datetime.now().strftime('%H%M%S')}",
            "slug": f"test-doc-{datetime.now().strftime('%H%M%S')}",
            "content": "# Test Document\n\nThis is a test document created by automated testing.\n\n## Features\n\n- Markdown support\n- Code blocks\n- Lists\n\n```python\nprint('Hello, World!')\n```"
        }
        
        success, created_doc = self.run_test(
            "Create New Document", 
            "POST", 
            f"projects/{project_id}/documents", 
            200, 
            data=new_doc_data,
            description="Create a new document with markdown content"
        )
        
        created_doc_id = None
        if success and created_doc:
            created_doc_id = created_doc.get('id')
            print(f"   Created document ID: {created_doc_id}")
        
        # Update document (if we created one)
        if created_doc_id:
            update_data = {
                "content": "# Updated Test Document\n\nThis document has been updated by automated testing.\n\n## New Section\n\nAdded content to verify update functionality."
            }
            self.run_test(
                "Update Document", 
                "PUT", 
                f"projects/{project_id}/documents/{created_doc_id}", 
                200, 
                data=update_data,
                description="Update document content"
            )
        
        return created_doc_id

    def test_ai_generation(self):
        """Test AI documentation generation"""
        print("\n=== AI GENERATION TESTS ===")
        
        # Test code for generation
        test_code = '''def fibonacci(n):
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def factorial(n):
    """Calculate the factorial of n."""
    if n <= 1:
        return 1
    return n * factorial(n-1)'''
        
        # Test API documentation generation
        api_gen_data = {
            "code": test_code,
            "language": "python",
            "doc_type": "api"
        }
        
        success, api_result = self.run_test(
            "Generate API Documentation", 
            "POST", 
            "generate", 
            200, 
            data=api_gen_data,
            description="Generate API docs from Python code"
        )
        
        if success and api_result:
            doc_length = len(api_result.get('documentation', ''))
            print(f"   Generated {doc_length} characters of API documentation")
        
        # Test guide generation
        guide_gen_data = {
            "code": test_code,
            "language": "python", 
            "doc_type": "guide"
        }
        
        success, guide_result = self.run_test(
            "Generate Guide Documentation", 
            "POST", 
            "generate", 
            200, 
            data=guide_gen_data,
            description="Generate guide from Python code"
        )
        
        if success and guide_result:
            doc_length = len(guide_result.get('documentation', ''))
            print(f"   Generated {doc_length} characters of guide documentation")
        
        # Test README generation
        readme_gen_data = {
            "code": test_code,
            "language": "python",
            "doc_type": "readme"
        }
        
        success, readme_result = self.run_test(
            "Generate README Documentation", 
            "POST", 
            "generate", 
            200, 
            data=readme_gen_data,
            description="Generate README from Python code"
        )
        
        if success and readme_result:
            doc_length = len(readme_result.get('documentation', ''))
            print(f"   Generated {doc_length} characters of README documentation")

    def test_generations_history(self):
        """Test generations history endpoint"""
        print("\n=== GENERATION HISTORY TESTS ===")
        
        success, generations = self.run_test(
            "Get Generation History", 
            "GET", 
            "generations", 
            200, 
            description="Fetch user's generation history"
        )
        
        if success:
            print(f"   Found {len(generations)} previous generations")

    def cleanup_test_data(self, project_id=None, doc_id=None):
        """Clean up test data created during testing"""
        print("\n=== CLEANUP ===")
        
        if doc_id and project_id:
            self.run_test(
                "Delete Test Document", 
                "DELETE", 
                f"projects/{project_id}/documents/{doc_id}", 
                200, 
                description="Clean up test document"
            )
        
        if project_id:
            self.run_test(
                "Delete Test Project", 
                "DELETE", 
                f"projects/{project_id}", 
                200, 
                description="Clean up test project"
            )

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting DocuMint API Test Suite")
        print(f"Base URL: {self.base_url}")
        print(f"Session Token: {self.session_token[:20]}...")
        
        # Health checks
        self.test_health_check()
        
        # Authentication
        user_data = self.test_authentication()
        if not user_data:
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # Project CRUD
        created_project_id = self.test_projects_crud()
        
        # Document CRUD
        created_doc_id = self.test_documents_crud(created_project_id)
        
        # AI Generation
        self.test_ai_generation()
        
        # Generation History
        self.test_generations_history()
        
        # Cleanup
        self.cleanup_test_data(created_project_id, created_doc_id)
        
        # Print results
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                error_msg = failure.get('error', f"Expected {failure.get('expected')}, got {failure.get('actual')}")
                print(f"   - {failure['test']}: {error_msg}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = DocuMintAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())