import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../utils/api';
import { Home, Search, Plus, User, LogOut, LogIn, History, X, Trash2, Shield, RotateCcw } from 'lucide-react';

const Navbar = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      console.log('Loading history...');
      const res = await API.getHistory();
      console.log('History response:', res);
      
      // Add protection to ensure history persists even if main pins are deleted
      const protectedHistory = res.slice(0, 20).map(pin => ({
        ...pin,
        // This ensures history items are independent of main pins
        isProtectedHistory: true,
        // Store all necessary data for reuse
        historyBackup: {
          image: pin.image,
          title: pin.title,
          description: pin.description,
          username: pin.username,
          createdAt: pin.createdAt,
          // Store image file data for reuse
          imageFile: pin.imageFile || null
        }
      }));
      
      setHistory(protectedHistory);
      setFilteredHistory(protectedHistory);
    } catch (err) {
      console.log('Failed to load history:', err);
      setHistory([]);
      setFilteredHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredHistory(history);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredHistory(
        history.filter(pin =>
          pin.title.toLowerCase().includes(query) ||
          (pin.description && pin.description.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, history]);

  // Load history when dropdown opens
  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory]);

  const handleReuse = async (pin) => {
    console.log('Reusing pin from history:', pin);
    
    try {
      // Use backup data to ensure pin can be reused even if deleted from main
      const pinToReuse = pin.historyBackup ? { ...pin, ...pin.historyBackup } : pin;
      
      // If image file is not available, try to fetch it
      let imageFile = null;
      if (!pinToReuse.imageFile) {
        // Create a blob from the image URL for reuse
        const response = await fetch(`${API_URL}${pinToReuse.image}`);
        const blob = await response.blob();
        imageFile = new File([blob], `reused-${pinToReuse.title}.jpg`, { type: 'image/jpeg' });
      }
      
      navigate('/create', { 
        state: { 
          reusePin: {
            ...pinToReuse,
            fromHistory: true,
            // Ensure image path is preserved
            image: pinToReuse.historyBackup?.image || pinToReuse.image,
            // Pass the image file for immediate reuse
            imageFile: imageFile || pinToReuse.imageFile
          }
        } 
      });
      setShowHistory(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error reusing pin:', error);
      // Fallback: navigate without image file
      navigate('/create', { 
        state: { 
          reusePin: {
            ...pin,
            fromHistory: true,
            image: pin.historyBackup?.image || pin.image
          }
        } 
      });
      setShowHistory(false);
      setSearchQuery('');
    }
  };

  const handleDeleteFromHistory = async (pinId, e) => {
    e.stopPropagation(); // Prevent triggering reuse
    if (!confirm('Remove this pin from your history? This will not delete the original pin.')) return;
    
    try {
      // Remove from local state immediately
      setHistory(prev => prev.filter(pin => pin._id !== pinId));
      setFilteredHistory(prev => prev.filter(pin => pin._id !== pinId));
      
      console.log('Pin removed from history view only');
    } catch (err) {
      console.error('Failed to delete from history:', err);
      // Still remove from local state for better UX
      setHistory(prev => prev.filter(pin => pin._id !== pinId));
      setFilteredHistory(prev => prev.filter(pin => pin._id !== pinId));
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const clearAllHistory = async () => {
    if (!confirm('Clear all your pin history? This will not delete your actual pins, only remove them from this history view.')) return;
    
    try {
      // Clear local state only
      setHistory([]);
      setFilteredHistory([]);
      
      console.log('All history cleared from view');
    } catch (err) {
      console.error('Failed to clear history:', err);
      // Still clear local state for better UX
      setHistory([]);
      setFilteredHistory([]);
    }
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2 hover:scale-105 transition-transform">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
              P
            </div>
            <span className="text-2xl font-bold text-purple-600">PinHub</span>
          </Link>

          {/* DESKTOP SEARCH BAR */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search pins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-full bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </form>
          </div>

          {/* NAV ICONS */}
          <div className="flex items-center gap-4">

            {/* HOME */}
            <Link 
              to="/" 
              className="p-2 hover:bg-gray-100 rounded-full transition hover:scale-110"
              title="Home"
            >
              <Home size={24} />
            </Link>

            {/* EXPLORE */}
            <Link 
              to="/explore" 
              className="p-2 hover:bg-gray-100 rounded-full transition hover:scale-110"
              title="Explore"
            >
              <Search size={24} />
            </Link>

            {/* CREATE PIN */}
            {user && (
              <Link 
                to="/create" 
                className="p-2 hover:bg-gray-100 rounded-full transition hover:scale-110"
                title="Create Pin"
              >
                <Plus size={24} />
              </Link>
            )}

            {/* PIN HISTORY DROPDOWN WITH SEARCH */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 hover:bg-gray-100 rounded-full transition hover:scale-110 relative group"
                  title="Pin History"
                >
                  <History size={24} />
                  {history.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {history.length > 9 ? '9+' : history.length}
                    </span>
                  )}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                    History ({history.length})
                  </div>
                </button>

                {/* DROPDOWN */}
                {showHistory && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => {
                        setShowHistory(false);
                        setSearchQuery('');
                      }}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-purple-100 p-4 z-50 animate-fadeIn">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-purple-700 text-lg">Pin History</h3>
                        <div className="flex gap-2">
                          {history.length > 0 && (
                            <button
                              onClick={clearAllHistory}
                              className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition"
                              title="Clear All History"
                            >
                              Clear All
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowHistory(false);
                              setSearchQuery('');
                            }}
                            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                            title="Close"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>

                      {/* PROTECTION MESSAGE */}
                      <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                          <Shield size={14} className="text-green-600" />
                          <div>
                            <p className="text-xs text-green-700 font-semibold">
                              Protected History
                            </p>
                            <p className="text-xs text-green-600">
                              Pins remain here even if deleted from main pages
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* REUSE INFO */}
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <RotateCcw size={12} className="text-blue-600" />
                          <p className="text-xs text-blue-700">
                            Click any pin to reuse it without recreating from scratch
                          </p>
                        </div>
                      </div>

                      {/* SEARCH INPUT */}
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="text"
                            placeholder="Search your protected history..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 transition"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* RESULTS */}
                      {loading ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                          <span className="ml-2 text-gray-500">Loading protected history...</span>
                        </div>
                      ) : filteredHistory.length === 0 ? (
                        <div className="text-center py-8">
                          <History size={48} className="mx-auto text-gray-300 mb-3" />
                          <p className="text-gray-500">
                            {searchQuery ? 'No pins match your search' : 'No history yet'}
                          </p>
                          {!searchQuery && (
                            <p className="text-sm text-gray-400 mt-1">
                              Your recently viewed pins will appear here
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          <div className="flex justify-between items-center px-1">
                            <p className="text-xs text-gray-500">
                              {filteredHistory.length} protected pins
                            </p>
                            <p className="text-xs text-purple-600">
                              Click to reuse • 🗑️ Remove from history
                            </p>
                          </div>
                          {filteredHistory.map((pin, i) => (
                            <div
                              key={pin._id || i}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition cursor-pointer group border border-transparent hover:border-purple-200 relative"
                              onClick={() => handleReuse(pin)}
                            >
                              <img
                                src={`${API_URL}${pin.image}`}
                                alt={pin.title}
                                className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/48?text=Image';
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-800 truncate">
                                  {pin.title || 'Untitled Pin'}
                                </p>
                                {pin.description && (
                                  <p className="text-xs text-gray-500 truncate">
                                    {pin.description}
                                  </p>
                                )}
                                <p className="text-xs text-purple-600 mt-1">
                                  {pin.username || pin.userId?.username || 'Unknown User'}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                    🛡️ Protected
                                  </span>
                                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    Reusable
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button 
                                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-full transition hover:scale-110"
                                  title="Reuse this pin without recreating"
                                >
                                  <RotateCcw size={14} />
                                </button>
                                <button 
                                  onClick={(e) => handleDeleteFromHistory(pin._id, e)}
                                  className="bg-red-500 text-white p-2 rounded-full transition hover:scale-110 hover:bg-red-600"
                                  title="Remove from history view only"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PROFILE */}
            {user && (
              <Link 
                to="/profile" 
                className="p-2 hover:bg-gray-100 rounded-full transition hover:scale-110"
                title="Profile"
              >
                <User size={24} />
              </Link>
            )}

            {/* AUTH BUTTON */}
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-full transition font-medium hover:scale-105"
                title="Logout"
              >
                <LogOut size={20} />
                <span className="hidden md:inline">Logout</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition font-medium hover:scale-105 shadow-lg"
                title="Login"
              >
                <LogIn size={20} />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;