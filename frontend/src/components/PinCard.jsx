// src/components/PinCard.jsx - ✅ UPDATED
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Heart, Download, Edit2, Trash2 } from 'lucide-react';

const PinCard = ({ pin, onEdit, onDelete }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const { user } = useContext(AuthContext);
  const [hovered, setHovered] = useState(false);
  const [liked, setLiked] = useState(pin.likedBy?.includes(user?.id) || false);
  const isOwner = user?.id === pin.userId?._id || user?.id === pin.userId;

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      // Like functionality - you can implement later
      setLiked(!liked);
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  return (
    <div
      className="pin-card group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={`${API_URL}${pin.image}`}
        alt={pin.title}
        className="w-full h-auto object-cover rounded-2xl"
      />

      {hovered && (
        <div className="absolute inset-0 bg-black/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleLike}
              className={`p-2 rounded-full ${liked ? 'bg-red-500 text-white' : 'bg-white/20 text-white backdrop-blur-sm'}`}
            >
              <Heart size={16} fill={liked ? 'white' : 'none'} />
            </button>
            <button className="p-2 rounded-full bg-white/20 text-white backdrop-blur-sm">
              <Download size={16} />
            </button>

            {isOwner && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(pin);
                  }}
                  className="p-2 rounded-full bg-blue-600 text-white"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(pin._id);
                  }}
                  className="p-2 rounded-full bg-red-600 text-white"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>

          <div className="text-white">
            <div className="font-bold text-lg">{pin.title}</div>
            {pin.description && <div className="text-sm opacity-90 mt-1">{pin.description}</div>}
            <div className="flex items-center gap-2 mt-2">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {pin.username?.[0]?.toUpperCase() || pin.userId?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm">{pin.username || pin.userId?.username || 'User'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PinCard;