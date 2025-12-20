import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  ExternalLink, 
  Bug, 
  RefreshCcw, 
  PlayCircle, 
  BookOpen, 
  CheckCircle, 
  Circle,
  ChevronDown, 
  ChevronUp,
  Briefcase,
  Award,
  Network,
  Clock,
  BarChart,
  Zap,
  BrainCircuit,
  FileText
} from "lucide-react";

import { useAppContext } from "../../context/AppContext";
import { updateRoadmapContent } from "../../utils/api";


const detectResourceType = (url = "") => {
  if (!url) return "link";
  const u = url.toLowerCase();
  if (u.includes("youtube.com/results") || u.includes("search_query")) return "search";
  if (u.includes("playlist") || u.includes("list=")) return "playlist";
  if (u.includes("youtube.com/watch") || u.includes("youtu.be") || u.includes("/embed/") || u.includes("vimeo.com")) return "video";
  return "link";
};

const buildEmbedUrl = (url = "") => {
  if (!url) return "";
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();


    if (u.searchParams.has("list")) {
        return `https://www.youtube.com/embed/videoseries?list=${u.searchParams.get("list")}`;
    }

  
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
        if (u.pathname.includes("/embed/")) return url;
        if (u.searchParams.has("v")) return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
        if (host.includes("youtu.be")) return `https://www.youtube.com/embed${u.pathname}`;
    }
  } catch (e) {
    console.warn("URL parse error:", e);
  }
  return "";
};

const TopicCard = ({ topic, onToggle, onOpenResource }) => {
  const [showResources, setShowResources] = useState(false);
  const isCompleted = topic.completed === true;

  const allResources = topic.resources || [];
  const videoResources = allResources.filter(res => {
      const type = detectResourceType(res.url);
      return type === 'video' || type === 'playlist';
  });
  const textResources = allResources.filter(res => {
      const type = detectResourceType(res.url);
      return type !== 'video' && type !== 'playlist';
  });

  return (
    <div className={`bg-white border rounded-xl p-5 shadow-sm transition-all duration-200 ${isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-200 hover:shadow-md'}`}>
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <div className={`mt-1 p-2 rounded-full ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
               {isCompleted ? <CheckCircle size={20} /> : <BookOpen size={20} />}
            </div>
            <div>
              <h3 className={`text-lg font-bold ${isCompleted ? 'text-gray-600' : 'text-gray-900'}`}>
                {topic.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                {topic.description || "Master this core concept through structured lessons and practice."}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {(topic.subtopics || []).slice(0, 4).map((sub, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 min-w-[150px]">
          <button
            onClick={onToggle}
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all w-full justify-center shadow-sm ${
              isCompleted 
                ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200" 
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {isCompleted ? (
               <> <CheckCircle size={16} /> Completed </>
            ) : (
               <> <Circle size={16} /> Mark Complete </>
            )}
          </button>
          
          {allResources.length > 0 && (
            <button 
              onClick={() => setShowResources(!showResources)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              {showResources ? "Hide Resources" : `View ${allResources.length} Resources`}
              {showResources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {showResources && (
        <div className="mt-5 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 space-y-6">
          
          {videoResources.length > 0 && (
            <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <PlayCircle size={14} /> Video Tutorials
                </h4>
                <div className="grid grid-cols-1 gap-3">
                    {videoResources.map((res, idx) => {
                        const type = detectResourceType(res.url);
                        return (
                            <div 
                                key={idx} 
                                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-red-50 hover:border-red-100 transition group cursor-pointer bg-white" 
                                onClick={() => onOpenResource(res.url)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                                        <PlayCircle size={20} />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-semibold text-gray-800 group-hover:text-red-700 truncate transition">
                                            {res.title}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">
                                            {type === 'playlist' ? 'Full Course' : 'Video'} • {res.duration || "Watch Now"}
                                        </p>
                                    </div>
                                </div>
                                <ExternalLink size={14} className="text-gray-300 group-hover:text-red-500" />
                            </div>
                        );
                    })}
                </div>
            </div>
          )}

          {textResources.length > 0 && (
            <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText size={14} /> Documentation & Articles
                </h4>
                <div className="grid grid-cols-1 gap-3">
                    {textResources.map((res, idx) => (
                        <div 
                            key={idx} 
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition group cursor-pointer bg-white" 
                            onClick={() => onOpenResource(res.url)}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                    <BookOpen size={20} />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 truncate transition">
                                        {res.title}
                                    </p>
                                    <p className="text-xs text-gray-500 capitalize">
                                        {res.type || "Article"} • Read
                                    </p>
                                </div>
                            </div>
                            <ExternalLink size={14} className="text-gray-300 group-hover:text-blue-500" />
                        </div>
                    ))}
                </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

const JobCard = ({ job }) => {
  const [expanded, setExpanded] = useState(false);
  const desc = job.description || "No description available.";
  const isLong = desc.length > 150;

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-300 transition shadow-sm hover:shadow-md">
       <div className="flex justify-between items-start mb-2">
         <div>
           <h3 className="font-bold text-lg text-gray-900">{job.role}</h3>
           <p className="text-sm text-blue-600 font-medium">{job.company}</p>
         </div>
         {job.job_portal_link && (
            <a href={job.job_portal_link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600">
               <ExternalLink size={18} />
            </a>
         )}
       </div>
       
       <div className="text-sm text-gray-600 leading-relaxed mb-3">
         {expanded ? desc : `${desc.substring(0, 150)}${isLong ? '...' : ''}`}
       </div>

       <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex gap-2">
             {isLong && (
               <button 
                 onClick={() => setExpanded(!expanded)}
                 className="text-xs font-bold text-gray-500 hover:text-gray-800 uppercase tracking-wide"
               >
                 {expanded ? "Show Less" : "Read More"}
               </button>
             )}
          </div>
          {job.job_portal_link && (
            <a 
              href={job.job_portal_link} 
              target="_blank" 
              rel="noreferrer" 
              className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-100 transition"
            >
               Apply Now
            </a>
          )}
       </div>
    </div>
  );
};

const PhaseAccordion = ({ phase, pIdx, children }) => {
  const [isOpen, setIsOpen] = useState(pIdx === 0); 

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition border-b border-gray-100"
      >
        <div className="flex items-center gap-3">
           <div className="bg-blue-100 text-blue-700 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">
             {pIdx + 1}
           </div>
           <div className="text-left">
             <h2 className="text-lg font-bold text-gray-900">{phase.phase_title}</h2>
             <p className="text-xs text-gray-500">{phase.duration_weeks || 4} Weeks • {phase.topics?.length || 0} Topics</p>
           </div>
        </div>
        {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="p-4 bg-gray-50/30 space-y-4 animate-in slide-in-from-top-2 duration-200">
           {children}
        </div>
      )}
    </div>
  );
};



const RoadmapViewer = ({ setView, currentRoadmap, onRegenerate }) => {
  const { setCurrentRoadmap } = useAppContext();
  const [activeTab, setActiveTab] = useState("overview"); // Default to Overview first for context
  const [localRoadmap, setLocalRoadmap] = useState(currentRoadmap);
  const [videoOverlay, setVideoOverlay] = useState({ open: false, src: "" });
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (currentRoadmap) setLocalRoadmap(currentRoadmap);
  }, [currentRoadmap]);


  const calculateProgress = (data) => {
    let total = 0, done = 0;
    

    (data.curriculum || []).forEach(p => (p.topics || []).forEach(t => { 
      total++; 
      if(t.completed) done++; 
    }));


    const s = data.skills || {};
    ['skills_to_focus', 'skills_to_improve'].forEach(key => {
        (s[key] || []).forEach(skill => {
            total++;
        
            if (typeof skill === 'object' && skill.completed) done++;
        });
    });

    return total === 0 ? 0 : Math.round((done / total) * 100);
  };

  const syncUpdate = (updatedRoadmap) => {
    const newPercent = calculateProgress(updatedRoadmap);
    updatedRoadmap.completion_percentage = newPercent;
    
    setLocalRoadmap(updatedRoadmap);
    setCurrentRoadmap(updatedRoadmap);
    
    const rId = updatedRoadmap.roadmap_id || updatedRoadmap.metadata?.roadmap_id;
    if (rId) {
        updateRoadmapContent(rId, updatedRoadmap, newPercent).catch(console.error);
    }
  };

  const handleTopicToggle = (phaseIdx, topicIdx) => {
    const clone = JSON.parse(JSON.stringify(localRoadmap));
    const topic = clone.curriculum[phaseIdx].topics[topicIdx];
    topic.completed = !topic.completed;
    syncUpdate(clone);
  };

  const handleSkillToggle = (category, idx) => {
    const clone = JSON.parse(JSON.stringify(localRoadmap));
    const list = clone.skills[category];
    const item = list[idx];

    if (typeof item === 'string') {
        list[idx] = { name: item, completed: true };
    } else {
        list[idx].completed = !item.completed;
    }
    
    syncUpdate(clone);
  };

  const openResource = (url) => {
    const type = detectResourceType(url);
    if (type === "video" || type === "playlist") {
       const embed = buildEmbedUrl(url);
       if (embed) {
         setVideoOverlay({ open: true, src: embed });
         return;
       }
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const overview = localRoadmap?.overview || {};
  const curriculum = Array.isArray(localRoadmap?.curriculum) ? localRoadmap.curriculum : [];
  const networking = Array.isArray(localRoadmap?.networking) ? localRoadmap.networking : [];
  const jobs = Array.isArray(localRoadmap?.related_jobs) ? localRoadmap.related_jobs : [];
  const skills = localRoadmap?.skills || {};

  return (
    <div className="space-y-6 mt-7 max-w-5xl mx-auto pb-20">
      
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between bg-gradient-to-r from-blue-600 to-blue-800 p-8 rounded-3xl shadow-xl text-white border border-blue-500/30">
        <div className="flex items-center gap-5 w-full md:w-auto">
            <button 
                onClick={() => setView("mypaths")} 
                className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-md border border-white/10 shadow-sm group"
            >
              <ArrowLeft size={24} className="text-white group-hover:-translate-x-1 transition-transform" />
            </button>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-sm">
                 {overview.target_role || "My Career Roadmap"}
              </h1>
              
              <div className="flex items-center gap-4 mt-3">
                 <div className="w-48 h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                    <div 
                        className="h-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.6)] transition-all duration-700 ease-out rounded-full" 
                        style={{ width: `${localRoadmap?.completion_percentage || 0}%` }}
                    ></div>
                 </div>
                 <span className="text-sm font-semibold text-blue-50 tracking-wide">
                    {localRoadmap?.completion_percentage || 0}% Completed
                 </span>
              </div>
            </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto justify-start md:justify-end">
            <button 
                onClick={() => onRegenerate && onRegenerate(localRoadmap)} 
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 rounded-xl font-bold hover:bg-blue-50 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
                <RefreshCcw size={18} /> Regenerate
            </button>
            <button 
                onClick={() => setShowRaw(!showRaw)} 
                className="p-2.5 bg-white/10 rounded-xl text-blue-100 hover:bg-white/20 hover:text-white transition border border-white/10"
            >
                <Bug size={20}/>
            </button>
        </div>
      </div>

      {showRaw && <pre className="bg-gray-900 text-green-400 p-4 rounded-xl overflow-auto h-64 text-xs">{JSON.stringify(localRoadmap, null, 2)}</pre>}

      <div className="flex gap-1 p-1 bg-gray-100/50 rounded-xl overflow-x-auto">
        {[
            { id: "overview", icon: PlayCircle, label: "Overview" },
            { id: "curriculum", icon: BookOpen, label: "Curriculum" },
            { id: "skills", icon: Award, label: "Skills" },
            { id: "jobs", icon: Briefcase, label: "Jobs" },
            { id: "networking", icon: Network, label: "Network" },
        ].map(tab => (
            <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
            >
                <tab.icon size={16} />
                {tab.label}
            </button>
        ))}
      </div>
      {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Journey</h2>
                  <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
                     {overview.overview_summary || "Your personalized learning path."}
                  </p>
                  {overview.motivation_quote && (
                     <blockquote className="mt-6 italic text-gray-500 border-l-4 border-blue-500 pl-4 mx-auto max-w-2xl bg-blue-50/50 py-2 pr-2 rounded-r">
                        "{overview.motivation_quote}"
                     </blockquote>
                  )}
              </div>

            
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 text-center">
                      <Clock size={24} className="text-blue-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Total Duration</p>
                      <p className="text-xl font-bold text-gray-800">{overview.duration_total || "N/A"}</p>
                  </div>
                  <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 text-center">
                      <BarChart size={24} className="text-purple-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Difficulty</p>
                      <p className="text-xl font-bold text-gray-800">{overview.difficulty_level || "N/A"}</p>
                  </div>
                  <div className="bg-green-50 p-5 rounded-xl border border-green-100 text-center">
                      <Zap size={24} className="text-green-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Est. Effort</p>
                      <p className="text-xl font-bold text-gray-800">{overview.estimated_hours || "N/A"}</p>
                  </div>
              </div>

              {overview.learning_style && overview.learning_style.length > 0 && (
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <BrainCircuit size={20} className="text-blue-500"/> Recommended Learning Style
                      </h3>
                      <div className="flex flex-wrap gap-2">
                          {overview.learning_style.map((style, idx) => (
                              <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-200">
                                  {style}
                              </span>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      )}

      
      {activeTab === "curriculum" && (
        <div className="space-y-6">
          {curriculum.length === 0 && <div className="text-center p-10 text-gray-400">No curriculum found.</div>}
          {curriculum.map((phase, pIdx) => (
             <PhaseAccordion key={pIdx} phase={phase} pIdx={pIdx}>
                {(phase.topics || []).map((topic, tIdx) => (
                    <TopicCard 
                        key={tIdx} 
                        topic={topic} 
                        onToggle={() => handleTopicToggle(pIdx, tIdx)} 
                        onOpenResource={openResource}
                    />
                ))}
             </PhaseAccordion>
          ))}
        </div>
      )}

      
      {activeTab === "skills" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['skills_to_focus', 'skills_to_improve'].map((cat) => (
                <div key={cat} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${cat === 'skills_to_focus' ? 'text-blue-700' : 'text-purple-700'}`}>
                        {cat === 'skills_to_focus' ? <Award size={20} /> : <RefreshCcw size={20} />}
                        {cat === 'skills_to_focus' ? "Priority Skills" : "Skills to Polish"}
                    </h3>
                    <div className="space-y-2">
                        {(skills[cat] || []).map((skill, idx) => {
                            const name = typeof skill === 'object' ? skill.name : skill;
                            const checked = typeof skill === 'object' ? skill.completed : false;
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => handleSkillToggle(cat, idx)}
                                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${
                                        checked ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50 border-gray-100'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                                        checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'
                                    }`}>
                                        {checked && <CheckCircle size={14} />}
                                    </div>
                                    <span className={`font-medium ${checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                        {name}
                                    </span>
                                </div>
                            );
                        })}
                        {(skills[cat] || []).length === 0 && <p className="text-gray-400 text-sm italic">No skills listed.</p>}
                    </div>
                </div>
            ))}
        </div>
      )}

      
      {activeTab === "jobs" && (
        <div className="space-y-4">
            {jobs.length === 0 && <div className="text-center p-10 text-gray-400">No jobs found matching your profile.</div>}
            {jobs.map((job, i) => <JobCard key={i} job={job} />)}
        </div>
      )}

     
      {activeTab === "networking" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {networking.map((net, i) => (
            <div key={i} className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-md transition hover:border-blue-200 group">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-gray-900">{net.platform}</h3>
                    <ExternalLink size={18} className="text-gray-300 group-hover:text-blue-500 transition" />
                </div>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">{net.advice}</p>
                {net.resource_link && (
                    <a href={net.resource_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
                        Connect Now <ArrowLeft size={14} className="rotate-180" />
                    </a>
                )}
            </div>
          ))}
        </div>
      )}

      
      {videoOverlay.open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setVideoOverlay({ open: false, src: "" })}>
           <div className="bg-black rounded-xl overflow-hidden w-full max-w-5xl aspect-video shadow-2xl relative">
               <button className="absolute top-4 right-4 text-white/50 hover:text-white z-50 bg-black/20 rounded-full p-2" onClick={(e) => { e.stopPropagation(); setVideoOverlay({ open: false, src: "" }); }}>
                 Close
               </button>
               <iframe src={videoOverlay.src} className="w-full h-full" frameBorder="0" allowFullScreen allow="autoplay" title="Video Player"></iframe>
           </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapViewer;