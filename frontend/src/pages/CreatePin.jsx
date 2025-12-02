// src/pages/CreatePin.jsx - UNCHANGED LOGIC + COMPRESSION ADDED
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../utils/api';
import { Upload, Camera, AlertCircle } from 'lucide-react';
import CompressPin from '../components/CompressPin';



const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CreatePin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editPin = location.state?.reusePin;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [compressedBlob, setCompressedBlob] = useState(null); // NEW

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first to create pins');
      navigate('/login');
      return;
    }
    if (location.state?.reusePin) {
      const pin = location.state.reusePin;
      setTitle(pin.title);
      setDescription(pin.description || '');
      setPreview(`${API_URL}${pin.image}`);
    }
  }, [navigate, location]);
  
  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setCompressedBlob(null); // Reset compression
      setError('');
    }
  };

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/api/test`);
      return response.ok;
    } catch (err) {
      return false;
    }
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image && !location.state?.reusePin) {
      setError('Please upload an image');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title for your pin');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first');
        navigate('/login');
        return;
      }
      const isBackendConnected = await checkBackendConnection();
      if (!isBackendConnected) {
        setError(`Cannot connect to server. Please make sure the backend is running on ${API_URL}`);
        return;
      }

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());

      // USE COMPRESSED BLOB IF AVAILABLE
      if (compressedBlob) {
        formData.append('image', compressedBlob, 'compressed.jpg');
        formData.append('isCompressed', 'true');
        formData.append('compressedSize', compressedBlob.size);
      } else if (image) {
        formData.append('image', image);
      } else if (location.state?.reusePin) {
        try {
          const response = await fetch(`${API_URL}${location.state.reusePin.image}`);
          if (!response.ok) throw new Error('Failed to fetch image');
          const blob = await response.blob();
          const fileName = `reused-${Date.now()}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          formData.append('image', file);
        } catch (err) {
          setError('Failed to load image from existing pin');
          return;
        }
      }

      await API.createPin(formData);
      alert('Pin created successfully!');
      
      // ADD THIS LINE - Trigger real-time update in Profile
      window.dispatchEvent(new Event('pinCreated'));
      
      navigate('/');
    } catch (err) {
      console.error('Error creating pin:', err);
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError(`Cannot connect to server. Please check if the backend is running on ${API_URL}`);
      } else if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('token');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 400) {
        setError(err.response.data?.msg || 'Invalid data. Please check your inputs.');
      } else {
        setError('Failed to create pin. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    setImage(null);
    setPreview('');
    setCompressedBlob(null);
    if (location.state?.reusePin) {
      setPreview(`${API_URL}${location.state.reusePin.image}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-purple-600">Create Pin</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* IMAGE UPLOAD */}
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-purple-500 transition-colors">
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" id="image" />
            <label htmlFor="image" className="cursor-pointer block">
              {preview ? (
                <div className="relative group">
                  <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-xl shadow-lg" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage(); }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto flex items-center justify-center">
                    <Camera className="text-purple-500" size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">Click to upload image</p>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG, JPEG up to 5MB</p>
                  </div>
                </div>
              )}
            </label>
          </div>

          {location.state?.reusePin && !image && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-blue-700 font-medium">Using image from existing pin</p>
            </div>
          )}

          {/* COMPRESSION UI - ONLY IF IMAGE UPLOADED */}
          {image && !compressedBlob && (
            <CompressPin
              imageFile={image}
              onCompressed={(blob) => setCompressedBlob(blob)}
            />
          )}

          {compressedBlob && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 font-medium">Image compressed and ready!</p>
            </div>
          )}

          {/* TITLE */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              id="title"
              type="text"
              placeholder="Enter a catchy title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              required
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              id="description"
              placeholder="Describe your pin (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading || (!image && !location.state?.reusePin) || !title.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Creating Pin...
              </>
            ) : (
              <>
                <Upload size={20} />
                Create Pin
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Make sure your backend server is running on <code className="bg-gray-100 px-2 py-1 rounded">localhost:5000</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreatePin;