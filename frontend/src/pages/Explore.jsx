// src/pages/Explore.jsx ← FIXED: No more DataCloneError
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import {
  Search,
  Loader2,
  X,
  Sparkles,
  Image as ImageIcon,
  Edit2,
  Trash2,
} from 'lucide-react';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ---------- helpers ---------- */
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const buildImageUrl = (path) => `${BACKEND}${path}`;

// Function to fetch image size from URL
const fetchImageSize = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    if (response.ok) {
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength) : 0;
    }
    return 0;
  } catch (error) {
    console.error('Failed to fetch image size:', error);
    return 0;
  }
};

/* ---------- Masonry Grid ---------- */
const MasonryGrid = ({ pins, onEdit, onDelete }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
      {pins.map((pin, i) => {
        // Calculate display size - handle missing data
        let displaySize = 0;
        let isCompressed = pin.isCompressed;
        
        // Priority order for size display
        if (pin.isCompressed) {
          displaySize = pin.compressedSize || pin.actualSize || pin.size || 0;
        } else {
          displaySize = pin.size || pin.actualSize || pin.compressedSize || 0;
        }

        return (
          <div
            key={pin._id}
            ref={i === pins.length - 1 ? pin.ref : null}
            className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            {/* IMAGE */}
            <img
              src={buildImageUrl(pin.image)}
              alt={pin.title || 'Pin'}
              className="w-full h-auto object-cover rounded-t-2xl"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
              }}
            />

            {/* SIZE BADGE - IMPROVED: HANDLES MISSING SIZE DATA */}
            <div
              className={`p-3 ${isCompressed ? 'bg-green-50' : 'bg-gray-50'} border-t-2 ${
                isCompressed ? 'border-green-500' : ''
              }`}
            >
              <p className="text-xs font-bold text-center">
                Size: {formatSize(displaySize)}
                {isCompressed && (
                  <span className="text-green-600 ml-1 text-[11px]">Compressed</span>
                )}
                {displaySize === 0 && (
                  <span className="text-gray-500 ml-1 text-[11px]">(Size unknown)</span>
                )}
              </p>
            </div>

            {/* TITLE / DESC */}
            <div className="p-4">
              <h3 className="font-bold text-lg text-gray-800 truncate">
                {pin.title || 'Untitled'}
              </h3>
              {pin.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                  {pin.description}
                </p>
              )}
            </div>

            {/* ACTIONS */}
            <div className="flex justify-between items-center p-3 border-t border-gray-100">
              <button
                onClick={() => onEdit(pin)}
                className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                <Edit2 size={14} /> Edit
              </button>
              <button
                onClick={() => onDelete(pin._id)}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Explore Page ---------- */
const Explore = () => {
  const navigate = useNavigate();
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPins, setTotalPins] = useState(0);
  const observer = useRef(null);

  /* ----- load pins ----- */
  const loadPins = async (query = '', pageNum = 1, append = false) => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await API.getPins(query, pageNum);
      
      // Process pins and fetch actual sizes for those missing size data
      const pinsWithSizes = await Promise.all(
        (res.pins || []).map(async (p) => {
          const pinData = {
            ...p,
            imageUrl: buildImageUrl(p.image),
            // Ensure size fields exist with proper fallbacks
            size: p.size || 0,
            compressedSize: p.compressedSize || 0,
            isCompressed: p.isCompressed || false,
            actualSize: 0 // Initialize actual size
          };

          // If backend doesn't provide size data, fetch it from the image
          if (!p.size && !p.compressedSize) {
            try {
              const imageSize = await fetchImageSize(pinData.imageUrl);
              pinData.actualSize = imageSize;
            } catch (error) {
              console.warn(`Could not fetch size for pin ${p._id}:`, error);
              pinData.actualSize = 0;
            }
          }

          return pinData;
        })
      );

      const sorted = [...pinsWithSizes].sort((a, b) => {
        if (!a.isCompressed && b.isCompressed) return -1;
        if (a.isCompressed && !b.isCompressed) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setPins((prev) => (append ? [...prev, ...sorted] : sorted));
      setHasMore(res.hasMore === true);
      setTotalPins(res.total ?? pinsWithSizes.length);
    } catch (err) {
      console.error('Load pins failed:', err);
      alert('Failed to load pins – check the backend.');
    } finally {
      setLoading(false);
    }
  };

  /* ----- search debounce ----- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setPins([]);
      loadPins(search, 1, false);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  /* ----- infinite scroll ----- */
  const lastPinRef = useCallback(
    (node) => {
      if (loading || !hasMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((p) => p + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    if (page > 1) loadPins(search, page, true);
  }, [page, search]);

  /* ----- initial load ----- */
  useEffect(() => {
    loadPins();
  }, []);

  /* ----- handlers ----- */
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) {
      setPage(1);
      setPins([]);
      loadPins(search, 1, false);
    }
  };

  // FIXED: Only pass serializable data in navigation state
  const handleEdit = (pin) => {
    navigate('/create', { 
      state: { 
        reusePin: {
          _id: pin._id,
          title: pin.title,
          description: pin.description,
          image: pin.image,
          destination: pin.destination,
          // Only include primitive data, no functions or complex objects
        }
      } 
    });
  };

  const handleDelete = async (pinId) => {
    if (!window.confirm('Delete this pin?')) return;
    try {
      await API.deletePin(pinId);
      setPins((prev) => prev.filter((p) => p._id !== pinId));
      alert('Pin deleted!');
    } catch {
      alert('Failed to delete pin.');
    }
  };

  const compressedCount = pins.filter((p) => p.isCompressed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* SEARCH */}
        <div className="sticky top-4 bg-gradient-to-br from-purple-50 to-pink-50 z-40 p-4 backdrop-blur-lg rounded-3xl shadow-lg">
          <form onSubmit={handleSearchSubmit} className="relative max-w-xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-500" size={24} />
            <input
              type="text"
              placeholder="Search pins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 pr-12 py-4 text-lg rounded-full bg-white/90 border-none shadow-md focus:outline-none focus:ring-4 focus:ring-purple-200"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                  setPins([]);
                  loadPins('', 1, false);
                }}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            )}
          </form>
          {pins.length > 0 && (
            <div className="text-center mt-3">
              <p className="text-purple-700 font-medium flex items-center justify-center gap-2">
                <Sparkles size={16} />
                Showing {pins.length} of {totalPins} pins
                {search && ` for "${search}"`}
                {compressedCount > 0 && (
                  <span className="text-green-600 text-xs ml-2">
                    ({compressedCount} compressed)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* BANNER */}
        {!search && (
          <div className="mt-8 bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-2xl border border-purple-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold text-purple-800">
                Smart Compression
              </h3>
              <p className="text-purple-600">Compress before upload</p>
            </div>
            <button
              onClick={() => navigate('/create')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:from-purple-700 hover:to-pink-700 transition"
            >
              <ImageIcon size={18} /> Create Pin
            </button>
          </div>
        )}

        {/* GRID / EMPTY */}
        {pins.length === 0 && !loading ? (
          <div className="text-center py-24">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-dashed border-purple-300 rounded-3xl w-48 h-48 mx-auto mb-6 flex items-center justify-center">
              <Search className="text-purple-500" size={48} />
            </div>
            <h3 className="text-3xl font-bold text-gray-800">
              {search ? 'No pins found' : 'No pins yet'}
            </h3>
            <p className="text-lg text-gray-600 mt-2">
              {search ? 'Try different keywords.' : 'Be the first to create!'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/create')}
                className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-full font-bold"
              >
                Create First Pin
              </button>
            )}
          </div>
        ) : (
          <MasonryGrid
            pins={pins.map((pin, i) => ({
              ...pin,
              ref: i === pins.length - 1 ? lastPinRef : undefined,
            }))}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center items-center py-12 gap-3">
            <Loader2 className="animate-spin text-purple-600" size={32} />
            <span className="text-purple-600 font-medium">Loading...</span>
          </div>
        )}

        {/* END */}
        {!hasMore && pins.length > 0 && (
          <div className="text-center py-8">
            <p className="text-green-600 font-medium">All pins loaded!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;