import React from 'react';
import { Play, Clock, Star } from 'lucide-react';

const ResourceCard = ({ resource }) => {
  if (!resource) return null;
  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold">{resource.title}</h4>
          <p className="text-sm text-gray-600">{resource.provider}</p>
        </div>
        <Star className="w-5 h-5 text-yellow-500" />
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <Clock className="w-4 h-4" />
        <span>{resource.duration || resource.duration_minutes || '—'}</span>
      </div>
      <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
        <Play className="w-4 h-4" />
        Start Learning
      </button>
    </div>
  );
};

export default ResourceCard;