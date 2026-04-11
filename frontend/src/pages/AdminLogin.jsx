/**
 * AdminLogin - Login page for admin access
 * Redirects to dashboard if already authenticated
 * Mintlify-style design with grid pattern and green accent
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Book } from "lucide-react";

const AdminLogin = () => {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="w-5 h-5 border-2 border-[#188455] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] relative flex flex-col items-center justify-center px-4" data-testid="admin-login-page">
      {/* Grid Pattern Background */}
      <div 
        className="fixed inset-0 bg-grid-pattern pointer-events-none"
        aria-hidden="true"
      />
      
      {/* Gradient Glow Effect */}
      <div 
        className="fixed inset-0 bg-radial-fade pointer-events-none"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-14 h-14 bg-[#188455] rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <Book className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Emergent Docs</h1>
            <p className="text-sm text-slate-500">Admin Portal</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm bg-slate-900/30 border border-white/10 rounded-2xl p-8 backdrop-blur-lg">
          <h2 className="text-xl font-semibold text-white text-center mb-2 tracking-tight">
            Welcome Back
          </h2>
          <p className="text-slate-400 text-sm text-center mb-8">
            Sign in to manage your documentation
          </p>

          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 h-12 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-medium transition-all duration-200 shadow-lg"
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-slate-400 hover:text-[#188455] transition-colors"
            >
              ← Back to Documentation
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-10 text-xs text-slate-600">
          Powered by Emergent
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
