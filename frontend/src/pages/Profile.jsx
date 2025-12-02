// src/pages/Profile.jsx - COMPLETELY FIXED VERSION
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../utils/api';
import MasonryGrid from '../components/MasonryGrid';
import CompressPin from '../components/CompressPin';
import { Edit2, Trash2, Loader2, Check, X, Upload, User, Mail, Calendar, Share2, MapPin, Lock, Unlock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [pins, setPins] = useState([]);
  const [editingPin, setEditingPin] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [deletingPin, setDeletingPin] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [profileStats, setProfileStats] = useState({
    totalPins: 0,
    joinedDate: 'Recently'
  });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showShareProfile, setShowShareProfile] = useState(false);
  const [activeStat, setActiveStat] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  const navigate = useNavigate();
  
  // ✅ COMPLETELY FIXED: Get actual user data
  const getCurrentUser = () => {
    try {
      console.log('🔄 Checking for user data...');
      
      // Priority 1: Check AuthContext user (most reliable)
      if (user && user.id && user.username !== 'demo_user') {
        console.log('✅ Using AuthContext user:', user);
        return user;
      }
      
      // Priority 2: Check localStorage user
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('📦 Found localStorage user:', parsedUser);
        
        // Check if it's a real user (has proper data)
        if (parsedUser.id && parsedUser.username && parsedUser.username !== 'demo_user') {
          console.log('✅ Using localStorage user');
          return parsedUser;
        }
      }
      
      // Priority 3: Check for userId in localStorage
      const userId = localStorage.getItem('userId');
      if (userId && userId !== 'demo') {
        console.log('🔑 Found userId:', userId);
        // Create minimal user object
        return { 
          id: userId, 
          username: 'User', 
          email: 'Loading email...' 
        };
      }
      
      // Last resort: Check if we have any user-like data
      const token = localStorage.getItem('token');
      if (token) {
        console.log('🔐 User is logged in but data missing');
        return { 
          id: 'unknown', 
          username: 'Logged In User', 
          email: 'Email not available' 
        };
      }
      
      console.log('⚠️ No authenticated user found');
      return { 
        id: 'demo', 
        username: 'demo_user', 
        email: 'Please login to see your profile' 
      };
    } catch (error) {
      console.error('❌ Error getting user data:', error);
      return { 
        id: 'demo', 
        username: 'demo_user', 
        email: 'Error loading profile' 
      };
    }
  };

  const currentUser = getCurrentUser();
  
  // ✅ FIXED: Consistent user ID handling
  const getUserId = () => {
    return currentUser?.id || user?.id || localStorage.getItem('userId') || 'demo';
  };

  const userId = getUserId();
  const username = currentUser?.username || user?.username || 'demo_user';
  const userEmail = currentUser?.email || user?.email || 'Please login to see your profile';

  // Add this function to manually update when pin is created
  const incrementPinCount = () => {
    console.log('🔔 Manual pin count increment triggered');
    setProfileStats(prev => ({
      ...prev,
      totalPins: prev.totalPins + 1
    }));
  };

  useEffect(() => {
    console.log('🔔 Profile mounted, loading pins and stats...');
    console.log('👤 Current user:', { userId, username, userEmail });
    console.log('📝 AuthContext user:', user);
    console.log('💾 localStorage userId:', localStorage.getItem('userId'));
    console.log('🔐 Token exists:', !!localStorage.getItem('token'));
    
    loadPins();
    loadProfileStats();
    
    // Listen for pin creation events from other components
    const handlePinCreated = () => {
      console.log('🔔 Pin created event received!');
      setDebugInfo('Real-time update triggered');
      loadPins();
      loadProfileStats();
      incrementPinCount(); // Manual increment as fallback
    };

    // Add event listener for pin creation
    window.addEventListener('pinCreated', handlePinCreated);
    
    return () => {
      window.removeEventListener('pinCreated', handlePinCreated);
    };
  }, [userId]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadProfileStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Real-time updates when user returns to profile page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page visible, refreshing data...');
        loadPins();
        loadProfileStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadPins = async () => {
    try {
      console.log(`🔄 Loading pins for user: ${userId}`);
      
      // Don't try to load pins for demo or invalid users
      if (userId === 'demo' || userId === 'unknown') {
        console.log('❌ Demo/invalid user, skipping pin load');
        setPins([]);
        return;
      }
      
      const userPins = await API.getUserPins(userId);
      console.log(`✅ Loaded ${userPins.length} pins`);
      
      setPins(userPins.map(p => ({
        ...p,
        username: username,
        likedBy: p.likedBy || []
      })));
    } catch (err) {
      console.log('❌ Error loading pins:', err.message);
      setPins([]);
      setDebugInfo(`Pin load error: ${err.message}`);
    }
  };

  const loadProfileStats = async () => {
    try {
      console.log(`🔄 Loading profile stats for user: ${userId}`);
      
      // Don't try to load stats for demo or invalid users
      if (userId === 'demo' || userId === 'unknown') {
        console.log('❌ Demo/invalid user, skipping stats load');
        setProfileStats({
          totalPins: 0,
          joinedDate: 'Recently'
        });
        return;
      }
      
      const userPins = await API.getUserPins(userId);
      console.log(`✅ Stats: ${userPins.length} pins found`);
      
      setProfileStats({
        totalPins: userPins.length,
        joinedDate: currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'Recently'
      });
      
      // ✅ FIXED: Show actual user status
      const userStatus = userId === 'demo' ? 'DEMO USER - Please Login' : 'AUTHENTICATED USER';
      setDebugInfo(`Status: ${userStatus} | User: ${username} | ID: ${userId} | Pins: ${userPins.length}`);
    } catch (err) {
      console.log('❌ Error loading profile stats:', err.message);
      setProfileStats({
        totalPins: 0,
        joinedDate: 'Recently'
      });
      setDebugInfo(`Stats error: ${err.message} | User: ${username}`);
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadPins(), loadProfileStats()]);
    setTimeout(() => {
      setRefreshing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }, 1000);
  };

  // Clickable Stats Handler - Only Total Pins remains
  const handleTotalPinsClick = () => {
    setActiveStat('totalPins');
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setActiveStat(null);
    }, 2000);
  };

  // Edit Profile Handler - Redirect to register page
  const handleEditProfile = () => {
    setShowEditProfile(true);
    // Redirect to register page for profile update
    setTimeout(() => {
      navigate('/register');
      setShowEditProfile(false);
    }, 1000);
  };

  // Share Profile Handler - Share profile link
  const handleShareProfile = () => {
    setShowShareProfile(true);
    const profileUrl = `${window.location.origin}/profile/${username}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(profileUrl)
        .then(() => {
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setShowShareProfile(false);
          }, 2000);
        })
        .catch(() => {
          copyToClipboardFallback(profileUrl);
        });
    } else {
      copyToClipboardFallback(profileUrl);
    }
  };

  // Fallback method for copying to clipboard
  const copyToClipboardFallback = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setShowShareProfile(false);
        }, 2000);
      } else {
        alert(`Profile link: ${text}\n\nCopy this link to share your profile.`);
        setShowShareProfile(false);
      }
    } catch (err) {
      alert(`Profile link: ${text}\n\nCopy this link to share your profile.`);
      setShowShareProfile(false);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const startEdit = (pin) => {
    setEditingPin(pin._id);
    setEditTitle(pin.title);
    setEditDesc(pin.description);
    setEditImage(null);
    setEditImagePreview(`${API_URL}${pin.image}`);
    setCompressedBlob(null);
  };

  const cancelEdit = () => {
    setEditingPin(null);
    setEditTitle('');
    setEditDesc('');
    setEditImage(null);
    setEditImagePreview('');
    setCompressedBlob(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditImage(file);
      setEditImagePreview(URL.createObjectURL(file));
      setCompressedBlob(null);
    }
  };

  const removeEditImage = () => {
    setEditImage(null);
    setEditImagePreview(`${API_URL}${pins.find(p => p._id === editingPin)?.image}`);
    setCompressedBlob(null);
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);

    const formData = new FormData();
    formData.append('title', editTitle.trim());
    formData.append('description', editDesc.trim());
    if (compressedBlob) {
      formData.append('image', compressedBlob, 'compressed.jpg');
    } else if (editImage) {
      formData.append('image', editImage);
    }

    try {
      await API.updatePin(editingPin, formData);
      setShowSuccess(true);
      setTimeout(() => {
        loadPins();
        loadProfileStats();
        cancelEdit();
        setShowSuccess(false);
      }, 1500);
    } catch (err) {
      alert('Failed to update pin');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id) => {
    setDeletingPin(id);
  };

  const cancelDelete = () => {
    setDeletingPin(null);
  };

  const deletePin = async () => {
    try {
      await API.deletePin(deletingPin);
      await loadPins();
      await loadProfileStats();
      cancelDelete();
    } catch (err) {
      alert('Failed to delete pin');
    }
  };

  // Get success message based on active stat
  const getSuccessMessage = () => {
    switch (activeStat) {
      case 'totalPins':
        return `You have ${profileStats.totalPins} total pins in your collection!`;
      case 'editProfile':
        return 'Redirecting to update profile...';
      case 'shareProfile':
        return 'Profile link copied to clipboard!';
      case 'refresh':
        return 'Profile updated successfully!';
      default:
        return 'Pin updated successfully!';
    }
  };

  // Test real-time update manually
  const testRealTimeUpdate = () => {
    console.log('🧪 Testing real-time update manually');
    setDebugInfo('Manual test triggered');
    window.dispatchEvent(new Event('pinCreated'));
  };

  // Login redirect if user is not authenticated
  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* ENHANCED PROFILE HEADER */}
        <div className="bg-white/80 backdrop-blur-lg p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl shadow-2xl mb-8 sm:mb-10 text-center border border-purple-100">
          {/* Refresh Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-white/80 text-purple-600 px-4 py-2 rounded-full font-medium hover:bg-white hover:text-purple-700 transition border border-purple-200"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
          </div>

          {/* DEBUG INFO - SHOWS ACTUAL USER STATUS */}
          {debugInfo && (
            <div className={`mb-4 p-3 rounded-lg border ${
              userId === 'demo' || userId === 'unknown' 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <p className={`text-sm font-medium ${
                userId === 'demo' || userId === 'unknown' 
                  ? 'text-yellow-700' 
                  : 'text-green-700'
              }`}>
                {debugInfo}
              </p>
              <p className="text-xs mt-1 opacity-75">
                Auth: {user ? 'Logged In' : 'No User'} | 
                Token: {localStorage.getItem('token') ? 'Yes' : 'No'} |
                UserID: {userId}
              </p>
            </div>
          )}

          {/* USER AVATAR - SHOWS DIFFERENT STYLES BASED ON AUTH STATUS */}
          <div className={`w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full mx-auto flex items-center justify-center text-white text-3xl sm:text-4xl lg:text-6xl font-bold shadow-2xl ring-4 sm:ring-8 ring-white/50 mb-4 sm:mb-6 ${
            userId === 'demo' || userId === 'unknown'
              ? 'bg-gradient-to-br from-gray-400 to-gray-600'
              : 'bg-gradient-to-br from-purple-500 to-pink-500'
          }`}>
            {username?.[0]?.toUpperCase() || 'U'}
          </div>
          
          {/* USERNAME */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mt-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {username || 'Guest User'}
          </h1>
          
          {/* USER HANDLE */}
          <div className="flex justify-center items-center gap-2 sm:gap-4 mt-3 sm:mt-4">
            <User size={16} className="text-purple-500" />
            <p className="text-lg sm:text-xl lg:text-2xl text-purple-600 font-medium">
              @{username?.toLowerCase().replace(/\s+/g, '') || 'user'}
            </p>
          </div>

          {/* EMAIL - SHOWS DIFFERENT MESSAGE FOR UNAUTHENTICATED USERS */}
          <div className="flex justify-center items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
            <Mail size={14} className="text-gray-500" />
            <p className="text-sm sm:text-base lg:text-lg text-gray-600">
              {userEmail}
            </p>
          </div>

          {/* JOIN DATE */}
          <div className="flex justify-center items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
            <Calendar size={14} className="text-gray-500" />
            <p className="text-xs sm:text-sm text-gray-500">Joined {profileStats.joinedDate}</p>
          </div>

          {/* SINGLE CLICKABLE DYNAMIC STAT - TOTAL PINS ONLY */}
          <div className="flex justify-center items-center mt-6 sm:mt-8">
            <div 
              onClick={handleTotalPinsClick}
              className="text-center cursor-pointer transform transition-all duration-300 hover:scale-110 hover:-translate-y-1 active:scale-105 group w-full sm:w-auto"
            >
              <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold transition-colors duration-300 ${
                activeStat === 'totalPins' ? 'text-purple-800' : 'text-purple-600'
              } group-hover:text-purple-800`}>
                {profileStats.totalPins}
              </div>
              <div className="text-gray-600 font-medium flex items-center justify-center gap-2 group-hover:text-purple-700 transition-colors text-lg sm:text-xl">
                <MapPin size={18} />
                Total Pins
              </div>
              <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to view details
              </div>
            </div>
          </div>

          {/* DYNAMIC QUICK ACTIONS - RESPONSIVE */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
            {/* Show Login button if user is not authenticated */}
            {(userId === 'demo' || userId === 'unknown') ? (
              <button 
                onClick={handleLoginRedirect}
                className="bg-purple-600 text-white px-4 sm:px-6 py-2 rounded-full font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <User size={16} />
                Login to View Profile
              </button>
            ) : (
              <>
                <button 
                  onClick={handleEditProfile}
                  className="bg-purple-600 text-white px-4 sm:px-6 py-2 rounded-full font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Edit2 size={16} />
                  {showEditProfile ? 'Redirecting...' : 'Edit Profile'}
                </button>
                <button 
                  onClick={handleShareProfile}
                  className="border border-purple-600 text-purple-600 px-4 sm:px-6 py-2 rounded-full font-medium hover:bg-purple-50 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Share2 size={16} />
                  {showShareProfile ? 'Sharing...' : 'Share Profile'}
                </button>
              </>
            )}
          </div>

          {/* TEST REAL-TIME UPDATE BUTTON - TEMPORARY */}
          <div className="flex justify-center mt-4">
            <button 
              onClick={testRealTimeUpdate}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Test Real-time Update
            </button>
          </div>

          {/* SUCCESS MESSAGE */}
          {showSuccess && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-medium text-center">
                {getSuccessMessage()}
              </p>
            </div>
          )}
        </div>

        {/* PIN GRID SECTION - Only show if user is authenticated and has pins */}
        {(userId !== 'demo' && userId !== 'unknown') && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Pins</h2>
            {pins.length > 0 ? (
              <MasonryGrid pins={pins} onEdit={startEdit} onDelete={confirmDelete} />
            ) : (
              <div className="text-center py-12 bg-white/50 rounded-2xl">
                <p className="text-gray-500 text-lg">No pins yet. Create your first pin!</p>
                <button 
                  onClick={() => navigate('/create')}
                  className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-full font-medium hover:bg-purple-700 transition"
                >
                  Create Pin
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;