// src/pages/Home.jsx - PIN SIZE + COMPRESSED BELOW + SEARCH FIX
import { useState, useEffect } from 'react';
import { getPins, updatePin, deletePin } from '../utils/api';
import { Image, Sparkles, FileImage } from 'lucide-react';

const Home = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPin, setEditingPin] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });

  useEffect(() => {
    loadPins();
  }, []);

  const loadPins = async () => {
    setLoading(true);
    try {
      const data = await getPins();
      const allPins = data.pins || data;

      // Sort: Regular first → Compressed last
      const sortedPins = [...allPins].sort((a, b) => {
        if (!a.isCompressed && b.isCompressed) return -1;
        if (a.isCompressed && !b.isCompressed) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setPins(sortedPins);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (pin) => {
    setEditingPin(pin._id);
    setEditForm({ title: pin.title, description: pin.description });
  };

  const saveEdit = async () => {
    try {
      const formData = new FormData();
      formData.append('title', editForm.title);
      formData.append('description', editForm.description);
      await updatePin(editingPin, formData);

      setPins(pins.map(p =>
        p._id === editingPin
          ? { ...p, title: editForm.title, description: editForm.description }
          : p
      ));

      setEditingPin(null);
      setEditForm({ title: '', description: '' });
    } catch (err) {
      console.error(err);
      alert('Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this pin?')) return;
    try {
      await deletePin(id);
      setPins(pins.filter(p => p._id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-3xl font-bold text-purple-600 flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          Loading pins...
        </div>
      </div>
    );
  }

  const compressedPinsCount = pins.filter(pin => pin.isCompressed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            PinHub
          </h1>
          <p className="text-2xl text-purple-600 mt-4">Discover & Create Amazing Pins</p>

          {compressedPinsCount > 0 && (
            <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-4 max-w-md mx-auto border border-green-200">
              <div className="flex items-center justify-center gap-3">
                <Image className="text-green-600" size={24} />
                <div>
                  <p className="text-green-700 font-bold">
                    {compressedPinsCount} Optimized Pins
                  </p>
                  <p className="text-green-600 text-sm">
                    {pins.length - compressedPinsCount} regular • {compressedPinsCount} compressed
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="masonry">
          {pins.map((pin) => (
            <div
              key={pin._id}
              className="break-inside-avoid mb-6 group relative bg-white rounded-3xl shadow-xl overflow-hidden transform transition-all hover:scale-[1.02] hover:shadow-2xl"
            >
              {/* COMPRESSION BADGE */}
              {pin.isCompressed && (
                <div className="absolute top-3 left-3 z-10">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                    <Image size={12} />
                    Compressed
                  </div>
                </div>
              )}

              <img
                src={`${API_URL}${pin.image}`}
                alt={pin.title}
                className="w-full object-cover"
                onError={(e) => e.target.src = '/placeholder-image.jpg'}
              />

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                <div className="flex gap-3 pointer-events-auto">
                  <button
                    onClick={() => startEdit(pin)}
                    className="bg-white text-purple-600 px-5 py-3 rounded-full font-bold shadow-lg hover:bg-purple-50 transition flex items-center gap-2"
                  >
                    <Sparkles size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pin._id)}
                    className="bg-red-600 text-white px-5 py-3 rounded-full font-bold shadow-lg hover:bg-red-700 transition flex items-center gap-2"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="p-6">
                {editingPin === pin._id ? (
                  <div className="space-y-4">
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-purple-300 rounded-xl focus:border-purple-600 outline-none"
                      placeholder="Title"
                    />
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border-2 border-purple-300 rounded-xl resize-none focus:border-purple-600 outline-none"
                      placeholder="Description"
                    />
                    <div className="flex gap-3">
                      <button onClick={saveEdit} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition">
                        Save Changes
                      </button>
                      <button onClick={() => setEditingPin(null)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <h3 className="text-2xl font-bold text-gray-800 flex-1">{pin.title}</h3>
                      {pin.isCompressed && (
                        <Image size={16} className="text-green-500 mt-1 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-gray-600 mt-2">{pin.description}</p>

                    {/* FILE SIZE AT BOTTOM */}
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileImage size={14} />
                        {formatFileSize(pin.fileSize)}
                      </span>
                      {pin.isCompressed && (
                        <span className="text-green-600 font-medium">
                          Optimized
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* EMPTY STATE */}
        {pins.length === 0 && (
          <div className="text-center py-32">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-dashed border-purple-200 rounded-3xl w-64 h-64 mx-auto mb-8 flex items-center justify-center">
              <Sparkles className="text-purple-400" size={64} />
            </div>
            <h3 className="text-4xl font-bold text-gray-700 mb-4">No pins yet!</h3>
            <p className="text-2xl text-gray-500 mb-6">Your amazing pins will appear here</p>
            <button
              onClick={() => window.location.href = '/create'}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
            >
              Create Your First Pin
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;