
import React from "react";
import { Eye, Trash2, PlusCircle, Clock, ArrowRight, BookDashed } from "lucide-react";


const PathCard = ({ r, onOpen, onDelete }) => {
  const difficulty = r.overview?.difficulty_level || r.difficulty_level || "N/A";
  const duration = r.overview?.duration_total || r.duration_total || `${r.timeline_months || 0} months`;
  const overview = r.overview?.overview_summary || r.overview_summary || "No overview available.";
  const progress = r.completion_percentage || 0;

  
  const getDifficultyColor = (diff) => {
    if (diff.includes("Advanced")) return "bg-purple-50 text-purple-700 border-purple-100";
    if (diff.includes("Intermediate")) return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-green-50 text-green-700 border-green-100";
  };

  return (
    <div className="group bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col h-full">
      <div className="flex-1">
        
        <div className="mb-3">
          <h2 className="text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {r.target_role || "Untitled Role"}
          </h2>
        </div>

        <p className="text-sm text-gray-600 line-clamp-3 mb-5 leading-relaxed">
          {overview}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 mb-6 justify-between">
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock size={14} className="text-blue-500" />
            <span className="whitespace-nowrap">{duration}</span>
          </div>

          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border whitespace-nowrap ${getDifficultyColor(difficulty)}`}>
            {difficulty}
          </span>
          
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
          <span className="font-medium">Progress</span>
          <span className="font-bold text-gray-900">{progress.toFixed(0)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-400 to-blue-700 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onOpen(r)}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95"
          >
            <Eye size={16} /> View
          </button>
          <button
            onClick={() => onDelete(r.roadmap_id)}
            className="flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-all border border-red-100"
            title="Delete Roadmap"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};


const EmptyState = ({ setView }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl text-center">
    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
      <BookDashed className="w-8 h-8 text-gray-300" />
    </div>
    <h3 className="text-lg font-bold text-gray-900">No roadmaps found</h3>
    <p className="text-gray-500 max-w-sm mt-2 mb-6">
      Start by generating a personalized learning path based on your career goals.
    </p>
    <button
      onClick={() => setView("create")}
      className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-all"
    >
      Create your first roadmap <ArrowRight size={16} />
    </button>
  </div>
);

const MyPathsView = ({ roadmaps = [], setView, onOpen, onDelete }) => {
  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto px-4 sm:px-0 animate-fadeIn">
      
  
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Career Paths</h1>
           <p className="text-gray-500 mt-1">Manage and track your active learning roadmaps.</p>
        </div>
        <button
          onClick={() => setView("create")}
          className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-blue-200 transition-all duration-200 transform hover:-translate-y-0.5 font-medium"
        >
          <PlusCircle size={18} /> 
          <span>New Roadmap</span>
        </button>
      </div>

     
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(!roadmaps || roadmaps.length === 0) ? (
          <EmptyState setView={setView} />
        ) : (
          roadmaps.map((r, idx) => (
            <PathCard 
              key={r.roadmap_id || idx} 
              r={r} 
              onOpen={onOpen} 
              onDelete={onDelete} 
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MyPathsView;