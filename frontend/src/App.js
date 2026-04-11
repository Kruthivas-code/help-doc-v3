import { useState, useEffect, useRef, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import axios from "axios";
import { HelmetProvider } from 'react-helmet-async';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Configure axios - use both cookies AND Authorization header for cross-domain support
axios.defaults.withCredentials = true;

// Add auth token to all requests if available
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth Context
export const AuthContext = createContext(null);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// Pages
import Dashboard from "@/pages/Dashboard";
import DocsView from "@/pages/DocsView";
import Editor from "@/pages/Editor";
import Generator from "@/pages/Generator";
import PublicDocs from "@/pages/PublicDocs";
import AdminLogin from "@/pages/AdminLogin";

// Auth Callback - Silent processing
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        try {
          const response = await axios.post(`${API}/auth/session`, {
            session_id: sessionIdMatch[1]
          });
          // Store token in localStorage for cross-domain support
          if (response.data.token) {
            localStorage.setItem('auth_token', response.data.token);
          }
          navigate("/admin/dashboard", { replace: true, state: { user: response.data } });
        } catch (error) {
          console.error("Auth error:", error);
          navigate("/admin", { replace: true });
        }
      } else {
        navigate("/admin", { replace: true });
      }
    };
    processAuth();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Authenticating...</span>
      </div>
    </div>
  );
};

// Protected Route - redirects to /admin if not authenticated
const ProtectedRoute = ({ children }) => {
  const { checkAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(!location.state?.user);

  useEffect(() => {
    if (location.state?.user) return;
    checkAuth()
      .then(() => setIsChecking(false))
      .catch(() => navigate("/admin", { replace: true }));
  }, [location.state, checkAuth, navigate]);

  if (isChecking && !location.state?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return children;
};

// SEO File Server Component
const SEOFileServer = ({ file }) => {
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('text/plain');

  useEffect(() => {
    const fetchSEOFile = async () => {
      try {
        const response = await axios.get(`${API}/seo/${file}`, {
          withCredentials: false,
          headers: { 'Accept': file === 'sitemap.xml' ? 'application/xml' : 'text/plain' }
        });
        setContent(response.data);
        setContentType(file === 'sitemap.xml' ? 'application/xml' : 'text/plain');
      } catch (error) {
        console.error(`Failed to fetch ${file}:`, error);
        setContent(file === 'robots.txt' 
          ? 'User-agent: *\nAllow: /\nSitemap: https://help.emergent.sh/sitemap.xml\n'
          : '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
        );
      }
    };
    fetchSEOFile();
  }, [file]);

  return (
    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', margin: 0 }}>
      {content}
    </pre>
  );
};

// Router
function AppRouter() {
  const location = useLocation();
  
  // Handle auth callback
  if (location.hash?.includes('session_id=')) return <AuthCallback />;

  // Serve SEO files
  if (location.pathname === '/robots.txt') {
    return <SEOFileServer file="robots.txt" />;
  }
  if (location.pathname === '/sitemap.xml') {
    return <SEOFileServer file="sitemap.xml" />;
  }

  return (
    <Routes>
      {/* Public Documentation Routes - Main site */}
      <Route path="/" element={<PublicDocs />} />
      <Route path="/:docSlug" element={<PublicDocs />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/admin/docs/:projectId" element={<ProtectedRoute><DocsView /></ProtectedRoute>} />
      <Route path="/admin/docs/:projectId/:docSlug" element={<ProtectedRoute><DocsView /></ProtectedRoute>} />
      <Route path="/admin/editor/:projectId" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
      <Route path="/admin/editor/:projectId/:docId" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
      <Route path="/admin/generator" element={<ProtectedRoute><Generator /></ProtectedRoute>} />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Auth Provider
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      // Store token from response for cross-domain support
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }
      setUser(response.data);
      setLoading(false);
      return response.data;
    } catch (error) {
      setUser(null);
      localStorage.removeItem('auth_token');
      setLoading(false);
      throw error;
    }
  };

  const login = () => {
    const redirectUrl = window.location.origin + '/admin/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const logout = async () => {
    try { await axios.post(`${API}/auth/logout`); } catch (e) {}
    localStorage.removeItem('auth_token');  // Clear token on logout
    setUser(null);
    window.location.href = "/admin";
  };

  useEffect(() => {
    checkAuth().catch(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <div className="App min-h-screen bg-slate-950">
        <BrowserRouter>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </BrowserRouter>
      </div>
    </HelmetProvider>
  );
}

export default App;
