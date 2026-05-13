from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from supabase import create_client, Client
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Supabase client for storage
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# GitHub OAuth config
GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', '')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '')
GITHUB_CALLBACK_URL = os.environ.get('GITHUB_CALLBACK_URL', '')

# Create the main app without a prefix
app = FastAPI(title="DocuMint - AI Documentation Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    slug: str
    description: Optional[str] = ""
    logo_url: Optional[str] = None
    primary_color: str = "#6366f1"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = ""
    logo_url: Optional[str] = None
    primary_color: str = "#6366f1"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None

class ProjectConfig(BaseModel):
    """Extended project configuration for public site"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    # Site Details
    site_title: str = ""
    site_description: str = ""
    favicon_url: Optional[str] = None
    # Theme
    theme: str = "default"  # default, almond, minimal, dark, mint, maple
    layout: str = "sidebar"  # sidebar, header, minimal
    # Branding
    primary_color: str = "#6366f1"
    light_color: str = "#ffffff"
    dark_color: str = "#0f172a"
    logo_light_url: Optional[str] = None
    logo_dark_url: Optional[str] = None
    logo_link: str = "/"
    # Styling / Background
    background_color: Optional[str] = None
    background_image_url: Optional[str] = None
    background_pattern: str = "none"  # none, dots, grid
    # Top Navigation (site-level links + CTA)
    navbar: Optional[dict] = None  # {links: [{label, href}], primary: {type, label, href}}
    # Left Sidebar Navigation (docs hierarchy)
    navigation: Optional[dict] = None  # {dropdowns: [], anchors: [], groups: [], pages: []}
    # Footer
    footer: Optional[dict] = None  # {columns: [{title, links: [{label, href}]}], social: [{icon, href}]}
    # Banner
    banner: Optional[dict] = None  # {text, link, dismissible}
    # Features
    top_nav_enabled: bool = True
    search_enabled: bool = True
    toc_enabled: bool = True
    # Meta
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectConfigUpdate(BaseModel):
    site_title: Optional[str] = None
    site_description: Optional[str] = None
    favicon_url: Optional[str] = None
    theme: Optional[str] = None
    layout: Optional[str] = None
    primary_color: Optional[str] = None
    light_color: Optional[str] = None
    dark_color: Optional[str] = None
    logo_light_url: Optional[str] = None
    logo_dark_url: Optional[str] = None
    logo_link: Optional[str] = None
    background_color: Optional[str] = None
    background_image_url: Optional[str] = None
    background_pattern: Optional[str] = None
    navbar: Optional[dict] = None
    navigation: Optional[dict] = None
    footer: Optional[dict] = None
    banner: Optional[dict] = None
    top_nav_enabled: Optional[bool] = None
    search_enabled: Optional[bool] = None
    toc_enabled: Optional[bool] = None

class Asset(BaseModel):
    """File/media asset stored in Supabase"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    name: str
    folder: str = "/"  # /, /images, /logo
    file_type: str  # image, video, document
    mime_type: str
    size: int
    url: str
    thumbnail_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    title: str
    slug: str
    content: str = ""
    order: int = 0
    parent_id: Optional[str] = None
    icon: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DocumentCreate(BaseModel):
    title: str
    slug: str
    content: str = ""
    order: int = 0
    parent_id: Optional[str] = None
    icon: Optional[str] = None

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    order: Optional[int] = None
    parent_id: Optional[str] = None
    icon: Optional[str] = None

class Generation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    code_input: str
    language: str
    generated_doc: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GenerateDocRequest(BaseModel):
    code: str
    language: str = "python"
    doc_type: str = "api"  # api, guide, readme

# ==================== VERSION CONTROL MODELS ====================

class DocumentVersion(BaseModel):
    """A named snapshot of a document"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    project_id: str
    version_name: str  # User-defined name like "v1.0", "Before Refactor"
    content: str
    title: str
    created_by: str  # user_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreateVersionRequest(BaseModel):
    version_name: str

class RestoreVersionRequest(BaseModel):
    version_id: str

# ==================== GITHUB INTEGRATION MODELS ====================

class GitHubAccount(BaseModel):
    """User's connected GitHub account"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    github_id: int
    github_username: str
    avatar_url: Optional[str] = None
    access_token: str  # Encrypted in production
    scopes: List[str] = []
    connected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GitHubRepo(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    private: bool
    html_url: str
    default_branch: str

class GitHubRepoLink(BaseModel):
    """Link between a project and a GitHub repo"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    user_id: str
    repo_owner: str
    repo_name: str
    repo_full_name: str
    branch: str = "main"
    docs_path: str = "docs"  # Path in repo where docs are stored
    auto_sync: bool = False
    last_synced: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LinkRepoRequest(BaseModel):
    repo_owner: str
    repo_name: str
    branch: str = "main"
    docs_path: str = "docs"
    auto_sync: bool = False

class ImportFromGitHubRequest(BaseModel):
    repo_owner: str
    repo_name: str
    branch: str = "main"
    path: str = ""  # Path to import from

class ExportToGitHubRequest(BaseModel):
    repo_owner: str
    repo_name: str
    branch: str = "main"
    path: str = "docs"  # Path to export to
    commit_message: str = "Update documentation"

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    """Get current user from session token in cookies or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry with timezone awareness
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Find user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

async def get_optional_user(request: Request) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent auth API
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth API error: {e}")
            raise HTTPException(status_code=500, detail="Authentication service error")
    
    email = data.get("email")
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")
    
    # Only allow @emergent.sh email addresses for admin access
    if not email or not email.endswith("@emergent.sh"):
        raise HTTPException(
            status_code=403, 
            detail="Access denied. Only emergent.sh accounts are allowed to access the admin panel."
        )
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = User(
            user_id=user_id,
            email=email,
            name=name,
            picture=picture
        )
        user_dict = user.model_dump()
        user_dict["created_at"] = user_dict["created_at"].isoformat()
        await db.users.insert_one(user_dict)
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at
    )
    session_dict = session.model_dump()
    session_dict["expires_at"] = session_dict["expires_at"].isoformat()
    session_dict["created_at"] = session_dict["created_at"].isoformat()
    
    # Remove old sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_dict)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "token": session_token  # Return as 'token' for frontend
    }

@api_router.get("/auth/me")
async def get_me(request: Request, user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    # Get session token from request
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "token": session_token  # Return token for cross-domain auth
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== PROJECT ROUTES ====================

def is_admin(user: User) -> bool:
    """Check if user is an emergent.sh admin"""
    return user.email and user.email.endswith("@emergent.sh")

async def get_project_with_admin_check(project_id: str, user: User):
    """Get project - admins can access any project, others only their own"""
    if is_admin(user):
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    else:
        project = await db.projects.find_one(
            {"id": project_id, "user_id": user.user_id},
            {"_id": 0}
        )
    return project

@api_router.get("/projects", response_model=List[Project])
async def get_projects(user: User = Depends(get_current_user)):
    """Get all projects - emergent.sh admins see all projects"""
    # Emergent.sh users are admins - they see all projects
    if is_admin(user):
        projects = await db.projects.find(
            {},  # No filter - show all
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    else:
        # Non-admin users only see their own projects
        projects = await db.projects.find(
            {"user_id": user.user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    
    for p in projects:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
        if isinstance(p.get("updated_at"), str):
            p["updated_at"] = datetime.fromisoformat(p["updated_at"])
    
    return projects

@api_router.post("/projects", response_model=Project)
async def create_project(data: ProjectCreate, user: User = Depends(get_current_user)):
    """Create a new project"""
    # Check if slug already exists
    existing = await db.projects.find_one(
        {"user_id": user.user_id, "slug": data.slug}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Project with this slug already exists")
    
    project = Project(
        user_id=user.user_id,
        **data.model_dump()
    )
    
    project_dict = project.model_dump()
    project_dict["created_at"] = project_dict["created_at"].isoformat()
    project_dict["updated_at"] = project_dict["updated_at"].isoformat()
    
    await db.projects.insert_one(project_dict)
    return project

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, user: User = Depends(get_current_user)):
    """Get a specific project"""
    project = await get_project_with_admin_check(project_id, user)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if isinstance(project.get("created_at"), str):
        project["created_at"] = datetime.fromisoformat(project["created_at"])
    if isinstance(project.get("updated_at"), str):
        project["updated_at"] = datetime.fromisoformat(project["updated_at"])
    
    return Project(**project)

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    user: User = Depends(get_current_user)
):
    """Update a project"""
    project = await get_project_with_admin_check(project_id, user)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": update_data}
    )
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    if isinstance(updated.get("updated_at"), str):
        updated["updated_at"] = datetime.fromisoformat(updated["updated_at"])
    
    return Project(**updated)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: User = Depends(get_current_user)):
    """Delete a project and all its documents"""
    project = await get_project_with_admin_check(project_id, user)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete all documents
    await db.documents.delete_many({"project_id": project_id})
    # Delete project
    await db.projects.delete_one({"id": project_id})
    
    return {"message": "Project deleted successfully"}

# ==================== DOCUMENT ROUTES ====================

@api_router.get("/projects/{project_id}/documents", response_model=List[Document])
async def get_documents(project_id: str, user: User = Depends(get_current_user)):
    """Get all documents for a project"""
    # Verify project access (admins can access any project)
    project = await get_project_with_admin_check(project_id, user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    documents = await db.documents.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("order", 1).to_list(500)
    
    for doc in documents:
        if isinstance(doc.get("created_at"), str):
            doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        if isinstance(doc.get("updated_at"), str):
            doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    
    return documents

@api_router.post("/projects/{project_id}/documents", response_model=Document)
async def create_document(
    project_id: str,
    data: DocumentCreate,
    user: User = Depends(get_current_user)
):
    """Create a new document"""
    # Verify project access (admins can access any project)
    project = await get_project_with_admin_check(project_id, user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if document with this slug already exists in this project
    existing_doc = await db.documents.find_one(
        {"project_id": project_id, "slug": data.slug}
    )
    if existing_doc:
        raise HTTPException(status_code=400, detail=f"Document with slug '{data.slug}' already exists in this project")
    
    document = Document(
        project_id=project_id,
        **data.model_dump()
    )
    
    doc_dict = document.model_dump()
    doc_dict["created_at"] = doc_dict["created_at"].isoformat()
    doc_dict["updated_at"] = doc_dict["updated_at"].isoformat()
    
    await db.documents.insert_one(doc_dict)
    return document

@api_router.get("/projects/{project_id}/documents/{doc_id}", response_model=Document)
async def get_document(
    project_id: str,
    doc_id: str,
    user: User = Depends(get_current_user)
):
    """Get a specific document"""
    # Verify project access (admins can access any project)
    project = await get_project_with_admin_check(project_id, user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    doc = await db.documents.find_one(
        {"id": doc_id, "project_id": project_id},
        {"_id": 0}
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    if isinstance(doc.get("updated_at"), str):
        doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    
    return Document(**doc)

@api_router.put("/projects/{project_id}/documents/{doc_id}", response_model=Document)
async def update_document(
    project_id: str,
    doc_id: str,
    data: DocumentUpdate,
    user: User = Depends(get_current_user)
):
    """Update a document"""
    # Verify project access (admins can access any project)
    project = await get_project_with_admin_check(project_id, user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    doc = await db.documents.find_one(
        {"id": doc_id, "project_id": project_id}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.documents.update_one(
        {"id": doc_id},
        {"$set": update_data}
    )
    
    updated = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    if isinstance(updated.get("updated_at"), str):
        updated["updated_at"] = datetime.fromisoformat(updated["updated_at"])
    
    return Document(**updated)

@api_router.delete("/projects/{project_id}/documents/{doc_id}")
async def delete_document(
    project_id: str,
    doc_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a document"""
    # Verify project access (admins can access any project)
    project = await get_project_with_admin_check(project_id, user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = await db.documents.delete_one(
        {"id": doc_id, "project_id": project_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted successfully"}

# ==================== AI GENERATION ROUTES ====================

@api_router.post("/generate")
async def generate_documentation(
    data: GenerateDocRequest,
    user: User = Depends(get_current_user)
):
    """Generate documentation from code using AI"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    # Build prompt based on doc type
    prompts = {
        "api": f"""You are a technical documentation expert. Analyze the following {data.language} code and generate comprehensive API documentation in Markdown format.

Include:
- Overview/Description
- Function/Method signatures with parameters and return types
- Usage examples with code snippets
- Error handling notes
- Any important notes or warnings

Code:
```{data.language}
{data.code}
```

Generate clean, professional documentation in Markdown format. Use proper headings, code blocks, and tables where appropriate.""",
        
        "guide": f"""You are a technical writer. Create a step-by-step guide based on this {data.language} code.

Include:
- Introduction explaining what this code does
- Prerequisites (dependencies, environment setup)
- Step-by-step instructions with code examples
- Common pitfalls and how to avoid them
- Best practices

Code:
```{data.language}
{data.code}
```

Generate a comprehensive guide in Markdown format.""",
        
        "readme": f"""You are a developer advocate. Create a README.md for this {data.language} project/module.

Include:
- Project name and badges (placeholder)
- Brief description
- Features list
- Installation instructions
- Quick start example
- API reference (brief)
- Contributing guidelines placeholder
- License placeholder

Code:
```{data.language}
{data.code}
```

Generate a professional README in Markdown format."""
    }
    
    prompt = prompts.get(data.doc_type, prompts["api"])
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"gen_{uuid.uuid4().hex[:8]}",
            system_message="You are an expert technical documentation writer. Generate clear, comprehensive, and well-structured documentation."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Store generation
        generation = Generation(
            user_id=user.user_id,
            code_input=data.code,
            language=data.language,
            generated_doc=response
        )
        gen_dict = generation.model_dump()
        gen_dict["created_at"] = gen_dict["created_at"].isoformat()
        await db.generations.insert_one(gen_dict)
        
        return {
            "id": generation.id,
            "documentation": response
        }
        
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@api_router.get("/generations", response_model=List[Generation])
async def get_generations(user: User = Depends(get_current_user)):
    """Get all generations for current user"""
    generations = await db.generations.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    for g in generations:
        if isinstance(g.get("created_at"), str):
            g["created_at"] = datetime.fromisoformat(g["created_at"])
    
    return generations

# ==================== PROJECT CONFIG ROUTES ====================

@api_router.get("/projects/{project_id}/config", response_model=ProjectConfig)
async def get_project_config(project_id: str, user: User = Depends(get_current_user)):
    """Get project configuration"""
    project = await get_project_with_admin_check(project_id, user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    config = await db.project_configs.find_one({"project_id": project_id}, {"_id": 0})
    if not config:
        # Create default config
        config = ProjectConfig(project_id=project_id, site_title=project.get("name", ""))
        config_dict = config.model_dump()
        config_dict["updated_at"] = config_dict["updated_at"].isoformat()
        await db.project_configs.insert_one(config_dict)
        return config
    
    if isinstance(config.get("updated_at"), str):
        config["updated_at"] = datetime.fromisoformat(config["updated_at"])
    return ProjectConfig(**config)

@api_router.put("/projects/{project_id}/config", response_model=ProjectConfig)
async def update_project_config(
    project_id: str,
    data: ProjectConfigUpdate,
    user: User = Depends(get_current_user)
):
    """Update project configuration"""
    project = await get_project_with_admin_check(project_id, user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.project_configs.update_one(
        {"project_id": project_id},
        {"$set": update_data},
        upsert=True
    )
    
    config = await db.project_configs.find_one({"project_id": project_id}, {"_id": 0})
    if isinstance(config.get("updated_at"), str):
        config["updated_at"] = datetime.fromisoformat(config["updated_at"])
    return ProjectConfig(**config)

# ==================== ASSET/STORAGE ROUTES ====================

@api_router.get("/projects/{project_id}/assets", response_model=List[Asset])
async def get_assets(project_id: str, folder: str = "/", user: User = Depends(get_current_user)):
    """Get all assets for a project"""
    project = await get_project_with_admin_check(project_id, user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    query = {"project_id": project_id}
    if folder != "/":
        query["folder"] = folder
    
    assets = await db.assets.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for a in assets:
        if isinstance(a.get("created_at"), str):
            a["created_at"] = datetime.fromisoformat(a["created_at"])
    return assets

@api_router.post("/projects/{project_id}/assets", response_model=Asset)
async def upload_asset(
    project_id: str,
    file: UploadFile = File(...),
    folder: str = Form("/"),
    user: User = Depends(get_current_user)
):
    """Upload an asset to Supabase storage"""
    project = await get_project_with_admin_check(project_id, user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not supabase:
        raise HTTPException(status_code=500, detail="Storage not configured")
    
    # Determine file type
    mime_type = file.content_type or "application/octet-stream"
    if mime_type.startswith("image/"):
        file_type = "image"
    elif mime_type.startswith("video/"):
        file_type = "video"
    else:
        file_type = "document"
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Generate unique filename
    ext = Path(file.filename).suffix if file.filename else ""
    unique_name = f"{uuid.uuid4().hex}{ext}"
    storage_path = f"{project_id}{folder}{unique_name}"
    
    try:
        # Upload to Supabase Storage
        bucket_name = "docs-images"
        
        # Try to create bucket if it doesn't exist
        try:
            supabase.storage.create_bucket(bucket_name, {"public": True})
        except:
            pass  # Bucket may already exist
        
        # Upload file
        result = supabase.storage.from_(bucket_name).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": mime_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(storage_path)
        
        # Create asset record
        asset = Asset(
            project_id=project_id,
            name=file.filename or unique_name,
            folder=folder,
            file_type=file_type,
            mime_type=mime_type,
            size=file_size,
            url=public_url
        )
        
        asset_dict = asset.model_dump()
        asset_dict["created_at"] = asset_dict["created_at"].isoformat()
        await db.assets.insert_one(asset_dict)
        
        return asset
        
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.delete("/projects/{project_id}/assets/{asset_id}")
async def delete_asset(project_id: str, asset_id: str, user: User = Depends(get_current_user)):
    """Delete an asset"""
    project = await get_project_with_admin_check(project_id, user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    asset = await db.assets.find_one({"id": asset_id, "project_id": project_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Delete from Supabase
    if supabase:
        try:
            storage_path = f"{project_id}{asset['folder']}{asset['name']}"
            supabase.storage.from_("docs-images").remove([storage_path])
        except:
            pass  # Continue even if storage delete fails
    
    # Delete from DB
    await db.assets.delete_one({"id": asset_id})
    return {"message": "Asset deleted"}

@api_router.get("/projects/{project_id}/folders")
async def get_folders(project_id: str, user: User = Depends(get_current_user)):
    """Get folder structure for a project"""
    project = await get_project_with_admin_check(project_id, user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get unique folders from assets
    pipeline = [
        {"$match": {"project_id": project_id}},
        {"$group": {"_id": "$folder", "count": {"$sum": 1}}}
    ]
    folders = await db.assets.aggregate(pipeline).to_list(100)
    
    # Always include default folders
    default_folders = [
        {"path": "/", "name": "Root", "count": 0},
        {"path": "/images", "name": "images", "count": 0},
        {"path": "/logo", "name": "logo", "count": 0}
    ]
    
    # Merge with actual folder counts
    folder_map = {f["_id"]: f["count"] for f in folders}
    for df in default_folders:
        df["count"] = folder_map.get(df["path"], 0)
    
    return default_folders

# ==================== VERSION CONTROL ROUTES ====================

@api_router.get("/projects/{project_id}/documents/{doc_id}/versions")
async def list_document_versions(
    project_id: str,
    doc_id: str,
    user: User = Depends(get_current_user)
):
    """List all versions of a document"""
    project = await db.projects.find_one({"id": project_id, "user_id": user.user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    doc = await db.documents.find_one({"id": doc_id, "project_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    versions = await db.document_versions.find(
        {"document_id": doc_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for v in versions:
        if isinstance(v.get("created_at"), str):
            v["created_at"] = datetime.fromisoformat(v["created_at"])
    
    return {"versions": versions}

@api_router.post("/projects/{project_id}/documents/{doc_id}/versions")
async def create_document_version(
    project_id: str,
    doc_id: str,
    data: CreateVersionRequest,
    user: User = Depends(get_current_user)
):
    """Create a named version/snapshot of the current document state"""
    project = await db.projects.find_one({"id": project_id, "user_id": user.user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    doc = await db.documents.find_one({"id": doc_id, "project_id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Create version snapshot
    version = DocumentVersion(
        document_id=doc_id,
        project_id=project_id,
        version_name=data.version_name,
        content=doc.get("content", ""),
        title=doc.get("title", ""),
        created_by=user.user_id
    )
    
    version_dict = version.model_dump()
    version_dict["created_at"] = version_dict["created_at"].isoformat()
    await db.document_versions.insert_one(version_dict)
    
    return {"message": "Version created", "version": version}

@api_router.get("/projects/{project_id}/documents/{doc_id}/versions/{version_id}")
async def get_document_version(
    project_id: str,
    doc_id: str,
    version_id: str,
    user: User = Depends(get_current_user)
):
    """Get a specific version of a document"""
    project = await db.projects.find_one({"id": project_id, "user_id": user.user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    version = await db.document_versions.find_one(
        {"id": version_id, "document_id": doc_id},
        {"_id": 0}
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if isinstance(version.get("created_at"), str):
        version["created_at"] = datetime.fromisoformat(version["created_at"])
    
    return version

@api_router.post("/projects/{project_id}/documents/{doc_id}/restore")
async def restore_document_version(
    project_id: str,
    doc_id: str,
    data: RestoreVersionRequest,
    user: User = Depends(get_current_user)
):
    """Restore a document to a previous version"""
    project = await db.projects.find_one({"id": project_id, "user_id": user.user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    version = await db.document_versions.find_one(
        {"id": data.version_id, "document_id": doc_id},
        {"_id": 0}
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Create a backup version before restoring
    current_doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if current_doc:
        backup_version = DocumentVersion(
            document_id=doc_id,
            project_id=project_id,
            version_name=f"Auto-backup before restore to '{version.get('version_name', 'unknown')}'",
            content=current_doc.get("content", ""),
            title=current_doc.get("title", ""),
            created_by=user.user_id
        )
        backup_dict = backup_version.model_dump()
        backup_dict["created_at"] = backup_dict["created_at"].isoformat()
        await db.document_versions.insert_one(backup_dict)
    
    # Restore the content
    await db.documents.update_one(
        {"id": doc_id},
        {
            "$set": {
                "content": version.get("content", ""),
                "title": version.get("title", ""),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": f"Document restored to version '{version.get('version_name')}'"}

@api_router.delete("/projects/{project_id}/documents/{doc_id}/versions/{version_id}")
async def delete_document_version(
    project_id: str,
    doc_id: str,
    version_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a specific version"""
    project = await db.projects.find_one({"id": project_id, "user_id": user.user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = await db.document_versions.delete_one(
        {"id": version_id, "document_id": doc_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return {"message": "Version deleted"}

# ==================== GITHUB INTEGRATION ROUTES ====================

@api_router.get("/github/auth")
async def github_auth_url(request: Request, user: User = Depends(get_current_user)):
    """Get GitHub OAuth authorization URL"""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub integration not configured")
    
    # Generate state for CSRF protection
    state = f"{user.user_id}_{uuid.uuid4().hex[:8]}"
    
    # Store state temporarily
    await db.github_states.insert_one({
        "state": state,
        "user_id": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    # Build authorization URL
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_CALLBACK_URL}"
        f"&scope=repo,read:user"
        f"&state={state}"
    )
    
    return {"auth_url": auth_url, "state": state}

@api_router.get("/github/callback")
async def github_callback(code: str, state: str):
    """Handle GitHub OAuth callback"""
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub integration not configured")
    
    # Verify state
    state_doc = await db.github_states.find_one({"state": state})
    if not state_doc:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    # Check expiry
    expires_at = datetime.fromisoformat(state_doc["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="State expired")
    
    user_id = state_doc["user_id"]
    
    # Delete used state
    await db.github_states.delete_one({"state": state})
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code
            },
            headers={"Accept": "application/json"}
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            error = token_data.get("error_description", "Unknown error")
            raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {error}")
        
        # Get user info from GitHub
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get GitHub user info")
        
        github_user = user_response.json()
    
    # Store or update GitHub account link
    github_account = {
        "user_id": user_id,
        "github_id": github_user["id"],
        "github_username": github_user["login"],
        "avatar_url": github_user.get("avatar_url"),
        "access_token": access_token,  # In production, encrypt this
        "scopes": token_data.get("scope", "").split(","),
        "connected_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.github_accounts.update_one(
        {"user_id": user_id},
        {"$set": github_account},
        upsert=True
    )
    
    # Return HTML that closes the popup and notifies parent
    return Response(
        content=f"""
        <html>
        <head><title>GitHub Connected</title></head>
        <body>
            <script>
                window.opener.postMessage({{ type: 'github-connected', username: '{github_user["login"]}' }}, '*');
                window.close();
            </script>
            <p>GitHub connected! You can close this window.</p>
        </body>
        </html>
        """,
        media_type="text/html"
    )

@api_router.get("/github/status")
async def github_status(user: User = Depends(get_current_user)):
    """Check if user has GitHub connected"""
    account = await db.github_accounts.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "access_token": 0}  # Don't expose token
    )
    
    if not account:
        return {"connected": False}
    
    return {
        "connected": True,
        "github_username": account.get("github_username"),
        "avatar_url": account.get("avatar_url"),
        "connected_at": account.get("connected_at")
    }

@api_router.delete("/github/disconnect")
async def github_disconnect(user: User = Depends(get_current_user)):
    """Disconnect GitHub account"""
    await db.github_accounts.delete_one({"user_id": user.user_id})
    await db.github_repo_links.delete_many({"user_id": user.user_id})
    return {"message": "GitHub disconnected"}

@api_router.get("/github/repos")
async def list_github_repos(
    page: int = 1,
    per_page: int = 30,
    user: User = Depends(get_current_user)
):
    """List user's GitHub repositories"""
    account = await db.github_accounts.find_one({"user_id": user.user_id})
    if not account:
        raise HTTPException(status_code=400, detail="GitHub not connected")
    
    access_token = account["access_token"]
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/user/repos",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            },
            params={
                "page": page,
                "per_page": per_page,
                "sort": "updated",
                "direction": "desc"
            }
        )
        
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="GitHub token expired. Please reconnect.")
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch repositories")
        
        repos = response.json()
        
        # Filter to relevant fields
        return {
            "repositories": [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "full_name": r["full_name"],
                    "description": r.get("description"),
                    "private": r["private"],
                    "html_url": r["html_url"],
                    "default_branch": r["default_branch"]
                }
                for r in repos
            ],
            "page": page,
            "per_page": per_page
        }

@api_router.get("/github/repos/{owner}/{repo}/contents")
async def list_repo_contents(
    owner: str,
    repo: str,
    path: str = "",
    branch: str = "main",
    user: User = Depends(get_current_user)
):
    """List contents of a GitHub repository path"""
    account = await db.github_accounts.find_one({"user_id": user.user_id})
    if not account:
        raise HTTPException(status_code=400, detail="GitHub not connected")
    
    access_token = account["access_token"]
    
    async with httpx.AsyncClient() as client:
        url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
        response = await client.get(
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            },
            params={"ref": branch}
        )
        
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Path not found")
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch contents")
        
        return response.json()

@api_router.post("/projects/{project_id}/github/import")
async def import_from_github(
    project_id: str,
    data: ImportFromGitHubRequest,
    user: User = Depends(get_current_user)
):
    """Import markdown files from a GitHub repository into a project"""
    project = await db.projects.find_one({"id": project_id, "user_id": user.user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    account = await db.github_accounts.find_one({"user_id": user.user_id})
    if not account:
        raise HTTPException(status_code=400, detail="GitHub not connected")
    
    access_token = account["access_token"]
    imported_docs = []
    
    async with httpx.AsyncClient() as client:
        # Get contents of the path
        url = f"https://api.github.com/repos/{data.repo_owner}/{data.repo_name}/contents/{data.path}"
        response = await client.get(
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            },
            params={"ref": data.branch}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch repository contents")
        
        contents = response.json()
        if not isinstance(contents, list):
            contents = [contents]
        
        # Filter for markdown files
        md_files = [f for f in contents if f["type"] == "file" and f["name"].endswith((".md", ".mdx"))]
        
        for order, file_info in enumerate(md_files):
            # Fetch file content
            file_response = await client.get(
                file_info["url"],
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json"
                }
            )
            
            if file_response.status_code == 200:
                file_data = file_response.json()
                content = base64.b64decode(file_data["content"]).decode("utf-8")
                
                # Create document
                filename = file_info["name"]
                title = filename.replace(".md", "").replace(".mdx", "").replace("-", " ").replace("_", " ").title()
                slug = filename.replace(".md", "").replace(".mdx", "").lower().replace(" ", "-")
                
                # Check if document with this slug already exists
                existing = await db.documents.find_one({
                    "project_id": project_id,
                    "slug": slug
                })
                
                if existing:
                    # Update existing
                    await db.documents.update_one(
                        {"id": existing["id"]},
                        {
                            "$set": {
                                "content": content,
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                    imported_docs.append({"slug": slug, "action": "updated"})
                else:
                    # Create new
                    doc = Document(
                        project_id=project_id,
                        title=title,
                        slug=slug,
                        content=content,
                        order=order
                    )
                    doc_dict = doc.model_dump()
                    doc_dict["created_at"] = doc_dict["created_at"].isoformat()
                    doc_dict["updated_at"] = doc_dict["updated_at"].isoformat()
                    await db.documents.insert_one(doc_dict)
                    imported_docs.append({"slug": slug, "action": "created"})
    
    return {
        "message": f"Imported {len(imported_docs)} documents",
        "documents": imported_docs
    }

@api_router.post("/projects/{project_id}/github/export")
async def export_to_github(
    project_id: str,
    data: ExportToGitHubRequest,
    user: User = Depends(get_current_user)
):
    """Export project documents to a GitHub repository"""
    project = await db.projects.find_one({"id": project_id, "user_id": user.user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    account = await db.github_accounts.find_one({"user_id": user.user_id})
    if not account:
        raise HTTPException(status_code=400, detail="GitHub not connected")
    
    access_token = account["access_token"]
    
    # Get all documents
    documents = await db.documents.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("order", 1).to_list(500)
    
    exported_files = []
    
    async with httpx.AsyncClient() as client:
        for doc in documents:
            file_path = f"{data.path}/{doc['slug']}.md"
            content_b64 = base64.b64encode(doc["content"].encode()).decode()
            
            # Check if file exists to get SHA for update
            existing_response = await client.get(
                f"https://api.github.com/repos/{data.repo_owner}/{data.repo_name}/contents/{file_path}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                params={"ref": data.branch}
            )
            
            payload = {
                "message": f"{data.commit_message}: {doc['title']}",
                "content": content_b64,
                "branch": data.branch
            }
            
            if existing_response.status_code == 200:
                payload["sha"] = existing_response.json()["sha"]
            
            # Create or update file
            put_response = await client.put(
                f"https://api.github.com/repos/{data.repo_owner}/{data.repo_name}/contents/{file_path}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                json=payload
            )
            
            if put_response.status_code in [200, 201]:
                action = "updated" if existing_response.status_code == 200 else "created"
                exported_files.append({"file": file_path, "action": action})
            else:
                logger.error(f"Failed to export {file_path}: {put_response.text}")
                exported_files.append({"file": file_path, "action": "failed", "error": put_response.text})
    
    return {
        "message": f"Exported {len([f for f in exported_files if f['action'] != 'failed'])} documents",
        "files": exported_files
    }

@api_router.post("/projects/{project_id}/github/link")
async def link_github_repo(
    project_id: str,
    data: LinkRepoRequest,
    user: User = Depends(get_current_user)
):
    """Link a project to a GitHub repository for syncing"""
    project = await db.projects.find_one({"id": project_id, "user_id": user.user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    account = await db.github_accounts.find_one({"user_id": user.user_id})
    if not account:
        raise HTTPException(status_code=400, detail="GitHub not connected")
    
    link = GitHubRepoLink(
        project_id=project_id,
        user_id=user.user_id,
        repo_owner=data.repo_owner,
        repo_name=data.repo_name,
        repo_full_name=f"{data.repo_owner}/{data.repo_name}",
        branch=data.branch,
        docs_path=data.docs_path,
        auto_sync=data.auto_sync
    )
    
    link_dict = link.model_dump()
    link_dict["created_at"] = link_dict["created_at"].isoformat()
    
    await db.github_repo_links.update_one(
        {"project_id": project_id},
        {"$set": link_dict},
        upsert=True
    )
    
    return {"message": "Repository linked", "link": link}

@api_router.get("/projects/{project_id}/github/link")
async def get_github_link(
    project_id: str,
    user: User = Depends(get_current_user)
):
    """Get the GitHub repo link for a project"""
    project = await db.projects.find_one({"id": project_id, "user_id": user.user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    link = await db.github_repo_links.find_one(
        {"project_id": project_id},
        {"_id": 0}
    )
    
    if not link:
        return {"linked": False}
    
    return {"linked": True, "link": link}

@api_router.delete("/projects/{project_id}/github/link")
async def unlink_github_repo(
    project_id: str,
    user: User = Depends(get_current_user)
):
    """Unlink a project from GitHub repository"""
    project = await db.projects.find_one({"id": project_id, "user_id": user.user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.github_repo_links.delete_one({"project_id": project_id})
    return {"message": "Repository unlinked"}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "DocuMint API - AI Documentation Platform"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== PUBLIC ROUTES (No Auth) ====================

@api_router.get("/public/default-project")
async def get_default_project():
    """Get the default project for public docs - no auth required.
    This is for single-project documentation platforms like Emergent Docs.
    
    Priority for selecting default project:
    1. Project with slug matching DEFAULT_PROJECT_SLUG env var
    2. Project named "Emergent"
    3. Most recently updated project
    """
    project = None
    
    # First, check for env var configuration
    default_slug = os.environ.get('DEFAULT_PROJECT_SLUG', '')
    if default_slug:
        project = await db.projects.find_one({"slug": default_slug}, {"_id": 0})
    
    # If not found, look for "Emergent" project
    if not project:
        project = await db.projects.find_one({"name": "Emergent"}, {"_id": 0})
    
    # Fallback to most recently updated project
    if not project:
        project = await db.projects.find_one({}, {"_id": 0}, sort=[("updated_at", -1)])
    
    if not project:
        raise HTTPException(status_code=404, detail="No documentation project found")
    
    # Get config
    config = await db.project_configs.find_one({"project_id": project["id"]}, {"_id": 0})
    if config and isinstance(config.get("updated_at"), str):
        config["updated_at"] = datetime.fromisoformat(config["updated_at"])
    
    # Get documents
    documents = await db.documents.find(
        {"project_id": project["id"]},
        {"_id": 0}
    ).sort("order", 1).to_list(500)
    
    for doc in documents:
        if isinstance(doc.get("created_at"), str):
            doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        if isinstance(doc.get("updated_at"), str):
            doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    
    return {
        "project": project,
        "config": config,
        "documents": documents
    }

@api_router.get("/public/projects/{project_slug}")
async def get_public_project(project_slug: str):
    """Get public project data by slug - no auth required"""
    project = await db.projects.find_one({"slug": project_slug}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get config
    config = await db.project_configs.find_one({"project_id": project["id"]}, {"_id": 0})
    if config and isinstance(config.get("updated_at"), str):
        config["updated_at"] = datetime.fromisoformat(config["updated_at"])
    
    # Get documents
    documents = await db.documents.find(
        {"project_id": project["id"]},
        {"_id": 0}
    ).sort("order", 1).to_list(500)
    
    for doc in documents:
        if isinstance(doc.get("created_at"), str):
            doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        if isinstance(doc.get("updated_at"), str):
            doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    
    return {
        "project": project,
        "config": config,
        "documents": documents
    }

# ==================== MINTLIFY CONVERSION ====================

class MintlifyConvertRequest(BaseModel):
    content: str
    section_title: Optional[str] = None

@api_router.post("/mintlify/convert")
async def convert_mintlify_format(data: MintlifyConvertRequest):
    """Convert Mintlify markdown syntax to platform-accepted format using AI."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    
    system_message = """You are a documentation format converter. Your task is to convert Mintlify-specific markdown syntax to our platform's MDX format.

MINTLIFY CALLOUT CONVERSIONS:
1. <Note>content</Note> → <Callout type="info">content</Callout>
2. <Warning>content</Warning> → <Callout type="warning">content</Callout>
3. <Tip>content</Tip> → <Callout type="success">content</Callout>
4. <Info>content</Info> → <Callout type="info">content</Callout>
5. <Check>content</Check> → <Callout type="success">content</Callout>

CARDGROUP WITH COLUMNS CONVERSION (CRITICAL):
Mintlify uses <CardGroup cols={n}> for card columns. Convert to our <Columns> component:

Mintlify format:
```
<CardGroup cols={3}>
  <Card title="Card 1" icon="icon1" href="/link1">
    Description 1
  </Card>
  <Card title="Card 2" icon="icon2" href="/link2">
    Description 2
  </Card>
</CardGroup>
```

Convert to our platform format:
```
<Columns cols={3}>
  <Card title="Card 1" icon="icon1" href="/link1">
    Description 1
  </Card>
  <Card title="Card 2" icon="icon2" href="/link2">
    Description 2
  </Card>
</Columns>
```

IMPORTANT: 
- <CardGroup cols={n}> → <Columns cols={n}>
- </CardGroup> → </Columns> (when it was a cols CardGroup)
- Keep Card components inside exactly as they are
- Preserve all attributes: title, icon, href, color

ACCORDION CONVERSIONS (CRITICAL - maintain exact structure):
Mintlify uses:
```
<AccordionGroup>
  <Accordion title="Title 1" icon="icon1">
    Content 1
  </Accordion>
  <Accordion title="Title 2" icon="icon2">
    Content 2
  </Accordion>
</AccordionGroup>
```

Convert to our platform format:
```
<AccordionGroup>
  <Accordion title="Title 1" icon="icon1">
    Content 1
  </Accordion>
  <Accordion title="Title 2" icon="icon2">
    Content 2
  </Accordion>
</AccordionGroup>
```

The AccordionGroup and Accordion structure should be PRESERVED. Just ensure:
- AccordionGroup wraps multiple Accordions
- Each Accordion has title="" attribute
- Optional icon="" attribute is preserved
- Content inside Accordion is preserved

Also handle <Expandable> the same as <Accordion>:
<Expandable title="..."> → <Accordion title="...">

IMAGE TAG CONVERSIONS (1-to-1 replacement):
For EVERY <img> tag found, convert to markdown image syntax:
- <img src="url" alt="text" /> → ![text](url)
- <img src="url" /> → ![image](url)
- Keep the EXACT same URL, just change the syntax

For markdown images, keep them as-is:
- ![alt](url) → ![alt](url) (no change needed)

OTHER CONVERSIONS:
- <Frame>...</Frame> → Remove Frame tags, keep inner content
- <Snippet file="..."/> → Remove (not supported)
- <ResponseField name="x" type="y">desc</ResponseField> → **x** (`y`): desc
- <ParamField ...> → Similar to ResponseField

PLATFORM SUPPORTED COMPONENTS:
- <Steps>, <Step title="...">
- <Columns cols={n}>, <Card title="..." icon="..." href="..." color="...">
- <CardGroup> (without cols attribute - keep as is)
- <Tabs>, <Tab label="...">
- <AccordionGroup>, <Accordion title="..." icon="...">
- <Callout type="info|warning|error|success">
- <CodeGroup> (for tabbed code blocks)
- Standard markdown: headings, lists, code blocks, tables, links, images

RULES:
1. Preserve ALL content - only change syntax
2. Keep markdown formatting intact
3. Convert every <img> tag to markdown ![alt](src) syntax
4. Preserve AccordionGroup/Accordion structure with title and icon attributes
5. Return ONLY the converted markdown, no explanations
6. Do NOT add any commentary or wrap in code blocks"""

    user_prompt = f"""Convert the following Mintlify markdown to platform format.

Section: {data.section_title or 'Unknown'}

IMPORTANT: 
- Convert ALL <img src="..."> tags to markdown ![](url) format
- Preserve AccordionGroup and Accordion structure with title/icon attributes

Content:
{data.content}

Return ONLY the converted markdown, nothing else."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"mintlify-convert-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=user_prompt))
        
        # Clean up response - remove markdown code block if present
        converted = response.strip()
        if converted.startswith("```markdown"):
            converted = converted[11:]
        if converted.startswith("```mdx"):
            converted = converted[6:]
        if converted.startswith("```"):
            converted = converted[3:]
        if converted.endswith("```"):
            converted = converted[:-3]
        converted = converted.strip()
        
        return {"converted": converted, "original": data.content}
    
    except Exception as e:
        logger.error(f"Mintlify conversion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

# ==================== IMAGE SEARCH ====================

class ImageSearchRequest(BaseModel):
    query: str
    page: int = 1
    per_page: int = 12

@api_router.post("/images/search")
async def search_stock_images(data: ImageSearchRequest):
    """Search for stock images from Unsplash API."""
    import aiohttp
    
    # Use Unsplash demo access key or environment variable
    unsplash_key = os.environ.get('UNSPLASH_ACCESS_KEY', 'demo')
    
    try:
        async with aiohttp.ClientSession() as session:
            # Search Unsplash
            params = {
                'query': data.query,
                'page': data.page,
                'per_page': data.per_page,
                'orientation': 'landscape'
            }
            headers = {'Authorization': f'Client-ID {unsplash_key}'}
            
            async with session.get(
                'https://api.unsplash.com/search/photos',
                params=params,
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    images = []
                    for photo in result.get('results', []):
                        images.append({
                            'id': photo['id'],
                            'url': photo['urls']['regular'],
                            'thumb': photo['urls']['thumb'],
                            'small': photo['urls']['small'],
                            'alt': photo.get('alt_description') or photo.get('description') or data.query,
                            'author': photo['user']['name'],
                            'author_url': photo['user']['links']['html'],
                            'source': 'unsplash'
                        })
                    return {
                        'images': images,
                        'total': result.get('total', 0),
                        'total_pages': result.get('total_pages', 0),
                        'page': data.page
                    }
                else:
                    # Fallback to placeholder images if API fails
                    return {
                        'images': [
                            {
                                'id': f'placeholder-{i}',
                                'url': f'https://picsum.photos/800/600?random={i}&q={data.query}',
                                'thumb': f'https://picsum.photos/200/150?random={i}&q={data.query}',
                                'small': f'https://picsum.photos/400/300?random={i}&q={data.query}',
                                'alt': f'{data.query} image {i}',
                                'author': 'Lorem Picsum',
                                'author_url': 'https://picsum.photos',
                                'source': 'picsum'
                            }
                            for i in range(1, min(data.per_page + 1, 13))
                        ],
                        'total': 100,
                        'total_pages': 10,
                        'page': data.page
                    }
    except Exception as e:
        logger.error(f"Image search error: {str(e)}")
        # Return placeholder images on error
        return {
            'images': [
                {
                    'id': f'placeholder-{i}',
                    'url': f'https://picsum.photos/800/600?random={i}',
                    'thumb': f'https://picsum.photos/200/150?random={i}',
                    'small': f'https://picsum.photos/400/300?random={i}',
                    'alt': f'{data.query} image {i}',
                    'author': 'Lorem Picsum',
                    'author_url': 'https://picsum.photos',
                    'source': 'picsum'
                }
                for i in range(1, 13)
            ],
            'total': 100,
            'total_pages': 10,
            'page': data.page
        }

# ==================== SEO ROUTES (NO /api PREFIX) ====================

@api_router.get("/seo/robots.txt", include_in_schema=False)
async def api_robots_txt():
    """API endpoint to serve robots.txt"""
    content = """User-agent: *
Allow: /
Sitemap: https://help.emergent.sh/sitemap.xml
"""
    return Response(content=content, media_type="text/plain")


@api_router.get("/seo/sitemap.xml", include_in_schema=False)
async def api_sitemap_xml():
    """API endpoint to serve sitemap.xml"""
    from xml.etree.ElementTree import Element, SubElement, tostring
    
    try:
        project = await db.projects.find_one({"is_default": True}, {"_id": 0})
        if not project:
            project = await db.projects.find_one({}, {"_id": 0})
        
        if not project:
            return Response(
                content="<?xml version='1.0' encoding='UTF-8'?><urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'></urlset>",
                media_type="application/xml"
            )
        
        documents = await db.documents.find(
            {"project_id": project["id"]},
            {"_id": 0, "slug": 1, "updated_at": 1}
        ).to_list(1000)
        
        base_url = 'https://help.emergent.sh'
        
        urlset = Element('urlset')
        urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
        
        url_elem = SubElement(urlset, 'url')
        SubElement(url_elem, 'loc').text = base_url + '/'
        SubElement(url_elem, 'changefreq').text = 'daily'
        SubElement(url_elem, 'priority').text = '1.0'
        
        for doc in documents:
            url_elem = SubElement(urlset, 'url')
            SubElement(url_elem, 'loc').text = f"{base_url}/{doc['slug']}"
            
            if doc.get('updated_at'):
                updated = doc['updated_at']
                if isinstance(updated, str):
                    lastmod_date = updated.split('T')[0]
                else:
                    lastmod_date = updated.strftime('%Y-%m-%d')
                SubElement(url_elem, 'lastmod').text = lastmod_date
            
            SubElement(url_elem, 'changefreq').text = 'weekly'
            SubElement(url_elem, 'priority').text = '0.8'
        
        xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml_str += tostring(urlset, encoding='unicode')
        
        return Response(content=xml_str, media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error generating sitemap: {str(e)}")
        return Response(
            content="<?xml version='1.0' encoding='UTF-8'?><urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'></urlset>",
            media_type="application/xml"
        )


# ==================== NON-API SEO ROUTES (Root Level) ====================
# These routes work if ingress allows them, otherwise use /api/seo/* endpoints

@api_router.get("/seo/robots.txt", include_in_schema=False)
async def api_robots_txt():
    """API endpoint to serve robots.txt"""
    content = """User-agent: *
Allow: /
Sitemap: https://help.emergent.sh/sitemap.xml
"""
    return Response(content=content, media_type="text/plain")


@api_router.get("/seo/sitemap.xml", include_in_schema=False)
async def api_sitemap_xml():
    """API endpoint to serve sitemap.xml"""
    from xml.etree.ElementTree import Element, SubElement, tostring
    
    try:
        project = await db.projects.find_one({"is_default": True}, {"_id": 0})
        if not project:
            project = await db.projects.find_one({}, {"_id": 0})
        
        if not project:
            return Response(
                content="<?xml version='1.0' encoding='UTF-8'?><urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'></urlset>",
                media_type="application/xml"
            )
        
        documents = await db.documents.find(
            {"project_id": project["id"]},
            {"_id": 0, "slug": 1, "updated_at": 1}
        ).to_list(1000)
        
        base_url = 'https://help.emergent.sh'
        
        urlset = Element('urlset')
        urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
        
        url_elem = SubElement(urlset, 'url')
        SubElement(url_elem, 'loc').text = base_url + '/'
        SubElement(url_elem, 'changefreq').text = 'daily'
        SubElement(url_elem, 'priority').text = '1.0'
        
        for doc in documents:
            url_elem = SubElement(urlset, 'url')
            SubElement(url_elem, 'loc').text = f"{base_url}/{doc['slug']}"
            
            if doc.get('updated_at'):
                updated = doc['updated_at']
                if isinstance(updated, str):
                    lastmod_date = updated.split('T')[0]
                else:
                    lastmod_date = updated.strftime('%Y-%m-%d')
                SubElement(url_elem, 'lastmod').text = lastmod_date
            
            SubElement(url_elem, 'changefreq').text = 'weekly'
            SubElement(url_elem, 'priority').text = '0.8'
        
        xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml_str += tostring(urlset, encoding='unicode')
        
        return Response(content=xml_str, media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error generating sitemap: {str(e)}")
        return Response(
            content="<?xml version='1.0' encoding='UTF-8'?><urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'></urlset>",
            media_type="application/xml"
        )


# ==================== NON-API SEO ROUTES (Root Level) ====================
# These routes work if ingress allows them, otherwise use /api/seo/* endpoints

@app.get("/robots.txt", include_in_schema=False)
async def robots_txt():
    """Serve robots.txt for SEO"""
    content = """User-agent: *
Allow: /
Sitemap: https://help.emergent.sh/sitemap.xml
"""
    return Response(content=content, media_type="text/plain")


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml():
    """Generate sitemap.xml for SEO"""
    from xml.etree.ElementTree import Element, SubElement, tostring
    
    try:
        # Get the default project and its documents
        project = await db.projects.find_one({"is_default": True}, {"_id": 0})
        if not project:
            # Fallback to any project
            project = await db.projects.find_one({}, {"_id": 0})
        
        if not project:
            return Response(content="<?xml version='1.0' encoding='UTF-8'?><urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'></urlset>", media_type="application/xml")
        
        # Get all documents for this project
        documents = await db.documents.find(
            {"project_id": project["id"]},
            {"_id": 0, "slug": 1, "updated_at": 1}
        ).to_list(1000)
        
        # Build sitemap XML - use production URL
        base_url = 'https://help.emergent.sh'
        
        urlset = Element('urlset')
        urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
        
        # Add homepage
        url_elem = SubElement(urlset, 'url')
        SubElement(url_elem, 'loc').text = base_url + '/'
        SubElement(url_elem, 'changefreq').text = 'daily'
        SubElement(url_elem, 'priority').text = '1.0'
        
        # Add each document
        for doc in documents:
            url_elem = SubElement(urlset, 'url')
            SubElement(url_elem, 'loc').text = f"{base_url}/{doc['slug']}"
            
            # Add last modified date if available
            if doc.get('updated_at'):
                updated = doc['updated_at']
                if isinstance(updated, str):
                    lastmod_date = updated.split('T')[0]
                else:
                    lastmod_date = updated.strftime('%Y-%m-%d')
                SubElement(url_elem, 'lastmod').text = lastmod_date
            
            SubElement(url_elem, 'changefreq').text = 'weekly'
            SubElement(url_elem, 'priority').text = '0.8'
        
        # Convert to string
        xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml_str += tostring(urlset, encoding='unicode')
        
        return Response(content=xml_str, media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error generating sitemap: {str(e)}")
        return Response(
            content="<?xml version='1.0' encoding='UTF-8'?><urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'></urlset>",
            media_type="application/xml"
        )

# Include the router in the main app
app.include_router(api_router)

# CORS configuration - must specify exact origins when credentials are enabled
ALLOWED_ORIGINS = [
    "https://docs-engine-1.preview.emergentagent.com",
    "https://devdocs-engine.emergent.host",
    "https://help.emergent.sh",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add any additional origins from environment
env_origins = os.environ.get('CORS_ORIGINS', '')
if env_origins and env_origins != '*':
    ALLOWED_ORIGINS.extend([o.strip() for o in env_origins.split(',') if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
