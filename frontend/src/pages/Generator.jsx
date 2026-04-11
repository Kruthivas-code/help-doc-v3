import { useState } from "react";
import { useAuth, API } from "@/App";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  ArrowLeft, Sparkles, Copy, Check, Loader2, Code2, FileText, BookOpen
} from "lucide-react";

const Generator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [docType, setDocType] = useState("api");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const languages = [
    { value: "python", label: "Python" },
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "java", label: "Java" },
  ];

  const docTypes = [
    { value: "api", label: "API Reference", icon: Code2 },
    { value: "guide", label: "Guide", icon: BookOpen },
    { value: "readme", label: "README", icon: FileText },
  ];

  const handleGenerate = async () => {
    if (!code.trim()) return;
    
    setGenerating(true);
    setResult("");
    
    try {
      const response = await axios.post(`${API}/generate`, {
        code,
        language,
        doc_type: docType
      });
      setResult(response.data.documentation);
    } catch (error) {
      console.error("Generation failed:", error);
      alert(error.response?.data?.detail || "Failed to generate documentation");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exampleCode = `def calculate_fibonacci(n: int) -> list[int]:
    """
    Calculate Fibonacci sequence up to n numbers.
    """
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib`;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" data-testid="generator-page">
      {/* Header */}
      <header className="h-14 border-b border-slate-800/50 flex items-center justify-between px-4 bg-slate-950 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          
          <div className="h-5 w-px bg-slate-800" />
          
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-white font-medium">AI Generator</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input Panel */}
        <div className="w-1/2 border-r border-slate-800/50 flex flex-col">
          <div className="p-6 border-b border-slate-800/50">
            <h2 className="text-lg font-semibold text-white mb-4">Code Input</h2>
            
            {/* Options */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-2">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-slate-700"
                  data-testid="language-select"
                >
                  {languages.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-2">Doc Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-slate-700"
                  data-testid="doctype-select"
                >
                  {docTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Doc Type Pills */}
            <div className="flex gap-2">
              {docTypes.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => setDocType(t.value)}
                    className={`h-8 px-3 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                      docType === t.value
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                    data-testid={`doctype-pill-${t.value}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Code Input */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/50">
              <span className="text-xs text-slate-500">Paste your code</span>
              <button
                onClick={() => setCode(exampleCode)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                data-testid="load-example"
              >
                Load example
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here..."
              className="flex-1 w-full px-6 py-4 bg-transparent text-slate-300 placeholder:text-slate-600 font-mono text-sm leading-relaxed resize-none focus:outline-none"
              data-testid="code-input"
            />
          </div>

          {/* Generate Button */}
          <div className="p-4 border-t border-slate-800/50">
            <button
              onClick={handleGenerate}
              disabled={generating || !code.trim()}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              data-testid="generate-button"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Documentation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowPreview(true)}
                className={`text-sm font-medium transition-colors ${
                  showPreview ? 'text-white' : 'text-slate-500 hover:text-white'
                }`}
                data-testid="preview-tab"
              >
                Preview
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className={`text-sm font-medium transition-colors ${
                  !showPreview ? 'text-white' : 'text-slate-500 hover:text-white'
                }`}
                data-testid="markdown-tab"
              >
                Markdown
              </button>
            </div>
            
            {result && (
              <button
                onClick={handleCopy}
                className="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm flex items-center gap-2 transition-colors"
                data-testid="copy-button"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {result ? (
              showPreview ? (
                <div className="p-6 page-transition">
                  <article className="doc-content" data-testid="generated-preview">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result}
                    </ReactMarkdown>
                  </article>
                </div>
              ) : (
                <pre className="p-6 text-sm text-slate-300 font-mono whitespace-pre-wrap" data-testid="generated-markdown">
                  {result}
                </pre>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-slate-500 text-sm">
                    Generated documentation will appear here
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Generator;
