/**
 * ImagePickerModal - Modal for selecting images from stock photos or uploading
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Search, Upload, Image, Loader2, Check, ExternalLink,
  ChevronLeft, ChevronRight, Link2, Sparkles
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Tab Button Component
const TabButton = ({ active, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active 
        ? 'bg-emerald-600 text-white' 
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {Icon && <Icon className="w-4 h-4" />}
    {children}
  </button>
);

// Image Card Component
const ImageCard = ({ image, selected, onSelect }) => (
  <button
    onClick={() => onSelect(image)}
    className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
      selected 
        ? 'border-emerald-500 ring-2 ring-emerald-500/30' 
        : 'border-transparent hover:border-slate-600'
    }`}
  >
    <img 
      src={image.thumb || image.small || image.url} 
      alt={image.alt}
      className="w-full h-32 object-cover"
      loading="lazy"
    />
    {selected && (
      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
        <div className="bg-emerald-500 rounded-full p-1">
          <Check className="w-4 h-4 text-white" />
        </div>
      </div>
    )}
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <p className="text-xs text-white truncate">{image.alt}</p>
      {image.author && (
        <p className="text-xs text-slate-400 truncate">by {image.author}</p>
      )}
    </div>
  </button>
);

// GIF Search Component using Giphy
const GifSearch = ({ onSelect, selectedImage }) => {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);

  // Fetch trending GIFs on mount
  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      // Using Giphy public beta key for demo
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=dc6zaTOxFJmzC&limit=12&rating=g`
      );
      const data = await response.json();
      setTrending(data.data.map(gif => ({
        id: gif.id,
        url: gif.images.original.url,
        thumb: gif.images.fixed_width_small.url,
        small: gif.images.fixed_width.url,
        alt: gif.title,
        source: 'giphy'
      })));
    } catch (error) {
      console.error('Failed to fetch trending GIFs:', error);
    }
    setLoading(false);
  };

  const searchGifs = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=12&rating=g`
      );
      const data = await response.json();
      setGifs(data.data.map(gif => ({
        id: gif.id,
        url: gif.images.original.url,
        thumb: gif.images.fixed_width_small.url,
        small: gif.images.fixed_width.url,
        alt: gif.title,
        source: 'giphy'
      })));
    } catch (error) {
      console.error('Failed to search GIFs:', error);
    }
    setLoading(false);
  };

  const displayGifs = query.trim() ? gifs : trending;

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchGifs()}
            placeholder="Search GIFs..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          onClick={searchGifs}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* GIF Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
          {displayGifs.map((gif) => (
            <ImageCard
              key={gif.id}
              image={gif}
              selected={selectedImage?.id === gif.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {!loading && displayGifs.length === 0 && query && (
        <p className="text-center text-slate-500 py-8">No GIFs found for "{query}"</p>
      )}

      <p className="text-xs text-slate-500 text-center">Powered by GIPHY</p>
    </div>
  );
};

// Stock Image Search Component
const StockImageSearch = ({ onSelect, selectedImage }) => {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [suggestions] = useState(['technology', 'nature', 'business', 'abstract', 'minimal', 'code']);

  const searchImages = async (searchQuery, pageNum = 1) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/images/search`, {
        query: searchQuery,
        page: pageNum,
        per_page: 12
      });
      setImages(response.data.images);
      setTotalPages(response.data.total_pages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to search images:', error);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    searchImages(query, 1);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search stock images..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* Quick Suggestions */}
      {images.length === 0 && !loading && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setQuery(suggestion);
                searchImages(suggestion, 1);
              }}
              className="px-3 py-1 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Image Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 max-h-[350px] overflow-y-auto">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                selected={selectedImage?.id === image.id}
                onSelect={onSelect}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => searchImages(query, page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <span className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => searchImages(query, page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </>
      )}

      {!loading && images.length === 0 && query && (
        <p className="text-center text-slate-500 py-8">No images found for "{query}"</p>
      )}
    </div>
  );
};

// Upload Tab Component
const UploadTab = ({ onSelect, projectId }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', '/images');

      const response = await axios.post(
        `${API}/api/projects/${projectId}/assets`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const uploaded = {
        id: response.data.id,
        url: response.data.url,
        thumb: response.data.url,
        small: response.data.url,
        alt: file.name.replace(/\.[^/.]+$/, ''),
        source: 'upload'
      };
      setUploadedImage(uploaded);
      onSelect(uploaded);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image. Please try again.');
    }
    setUploading(false);
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    
    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      alert('Please enter a valid URL');
      return;
    }

    const urlImage = {
      id: `url-${Date.now()}`,
      url: urlInput,
      thumb: urlInput,
      small: urlInput,
      alt: 'External image',
      source: 'url'
    };
    setUploadedImage(urlImage);
    onSelect(urlImage);
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Upload from device</h4>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-3" />
          ) : (
            <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          )}
          <p className="text-white font-medium">
            {uploading ? 'Uploading...' : 'Click to upload'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            PNG, JPG, GIF, WebP up to 10MB
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* URL Input */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Or paste image URL</h4>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="https://example.com/image.png"
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={handleUrlSubmit}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Preview */}
      {uploadedImage && (
        <div>
          <h4 className="text-sm font-medium text-white mb-3">Preview</h4>
          <div className="relative rounded-lg overflow-hidden border border-emerald-500">
            <img 
              src={uploadedImage.url} 
              alt={uploadedImage.alt}
              className="w-full h-48 object-cover"
            />
            <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1">
              <Check className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Modal Component
export const ImagePickerModal = ({ isOpen, onClose, onInsert, projectId, mode = 'image' }) => {
  const [activeTab, setActiveTab] = useState(mode === 'gif' ? 'gif' : 'stock');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(mode === 'gif' ? 'gif' : 'stock');
      setSelectedImage(null);
    }
  }, [isOpen, mode]);

  const handleInsert = () => {
    if (!selectedImage) return;
    
    // Generate markdown or component based on image type
    let markdown;
    if (activeTab === 'gif') {
      markdown = `![${selectedImage.alt || 'GIF'}](${selectedImage.url})`;
    } else {
      // Use Figure component for better presentation
      markdown = `<Figure src="${selectedImage.url}" alt="${selectedImage.alt || 'Image'}" caption="${selectedImage.alt || ''}" />`;
    }
    
    onInsert(markdown, selectedImage);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Image className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {mode === 'gif' ? 'Insert GIF' : 'Insert Image'}
              </h2>
              <p className="text-sm text-slate-400">
                Search stock images, GIFs, or upload your own
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-slate-700 bg-slate-800/50">
          <TabButton 
            active={activeTab === 'stock'} 
            onClick={() => setActiveTab('stock')}
            icon={Sparkles}
          >
            Stock Images
          </TabButton>
          <TabButton 
            active={activeTab === 'gif'} 
            onClick={() => setActiveTab('gif')}
            icon={Image}
          >
            GIFs
          </TabButton>
          <TabButton 
            active={activeTab === 'upload'} 
            onClick={() => setActiveTab('upload')}
            icon={Upload}
          >
            Upload
          </TabButton>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 200px)' }}>
          {activeTab === 'stock' && (
            <StockImageSearch 
              onSelect={setSelectedImage} 
              selectedImage={selectedImage}
            />
          )}
          {activeTab === 'gif' && (
            <GifSearch 
              onSelect={setSelectedImage} 
              selectedImage={selectedImage}
            />
          )}
          {activeTab === 'upload' && (
            <UploadTab 
              onSelect={setSelectedImage}
              projectId={projectId}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          <div className="text-sm text-slate-400">
            {selectedImage ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Image selected
              </span>
            ) : (
              'Select an image to insert'
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!selectedImage}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              Insert Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePickerModal;
