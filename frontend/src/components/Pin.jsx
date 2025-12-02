// src/components/Pin.jsx - ✅ UPDATED
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Heart, Download } from 'lucide-react';

const Pin = ({ pin, onUpdate }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const { user } = useContext(AuthContext);
  const [hovered, setHovered] = useState(false);
  const isLiked = user && pin.likedBy?.includes(user.id);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      // Like functionality - you can implement later
      console.log('Like pin:', pin._id);
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-lg cursor-pointer group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={`${API_URL}${pin.image}`}
        alt={pin.title}
        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
      />

      {hovered && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
          <div className="flex gap-3 mb-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${
                isLiked ? 'bg-red-600' : 'bg-white/20 backdrop-blur-sm'
              }`}
            >
              <Heart size={18} fill={isLiked ? 'white' : 'none'} />
              {pin.likes?.length || 0}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-sm font-bold">
              <Download size={18} /> Save
            </button>
          </div>
          <h3 className="text-xl font-bold">{pin.title}</h3>
          {pin.description && <p className="text-sm opacity-90 mt-1">{pin.description}</p>}
          <div className="flex items-center gap-3 mt-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
              {pin.username?.[0].toUpperCase() || 'U'}
            </div>
            <span className="font-medium">{pin.username}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pin;