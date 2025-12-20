import React, { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { ArrowRight, Calendar, RefreshCcw, ArrowLeft } from "lucide-react";
import { getResumeHistory, loadResumeById } from "../../utils/api";

const JOB_ROLES = [
  "Backend Developer",
  "Backend Developer (Python/Django)",
  "Backend Developer (Python/FastAPI)",
  "Backend Developer (Node.js/Express)",
  "Backend Developer (Node.js/NestJS)",
  "Backend Developer (Java/Spring Boot)",
  "Backend Developer (Go/Golang)",
  "Backend Developer (Ruby on Rails)",

  "Frontend Developer",
  "Frontend Developer (React)",
  "Frontend Developer (Next.js)",
  "Frontend Developer (Angular)",
  "Frontend Developer (Vue.js)",

  "Full Stack Developer",
  "Full Stack Developer (MERN)",
  "Full Stack Developer (MEAN)",
  "Full Stack Developer (Django + React)",
  "Full Stack Developer (Next.js + Node)",
  
  "Android Developer",
  "Android Developer (Kotlin)",
  "Android Developer (Java)",
  "iOS Developer (Swift)",
  "React Native Developer",
  "Flutter Developer",

  "Data Analyst",
  "Data Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "AI Engineer",
  "Big Data Engineer",
  "Computer Vision Engineer",

  "DevOps Engineer",
  "Cloud Engineer",
  "Cloud Engineer (AWS)",
  "Cloud Engineer (Azure)",
  "Cloud Engineer (GCP)",
  "Site Reliability Engineer (SRE)",

  "Cyber Security Analyst",
  "Penetration Tester",
  "Security Engineer",
  "Network Security Engineer",

  "Product Manager",
  "Business Analyst",
  "Scrum Master",
  "IT Project Manager",

  "UI/UX Designer",
  "Product Designer",

  "System Administrator",
  "Network Engineer",
  "Embedded Systems Engineer",
  "Robotics Engineer",

  "Software Engineer",
  "Software Architect",
  "Solutions Architect",

  "Game Developer",
  "Game Designer",
  "Game Producer",
];

export default function ConversationalCreator({ formData, setFormData, onGenerate, onBack }) {
  const { profileData, setProfileData } = useAppContext();

  const [local, setLocal] = useState(
    formData || { targetRole: "", level: "Entry-level", timeline: 6 }
  );

  const [warning, setWarning] = useState("");
  const [history, setHistory] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (profileData && profileData.target_role && !local.targetRole) {
      setLocal((prev) => {
        const updated = { ...prev, targetRole: profileData.target_role };
      
        setFormData?.(updated);
        return updated;
      });
    }

    if (!profileData || Object.keys(profileData).length === 0) {
      setWarning("No parsed resume / LinkedIn found in your account.");
    } else {
      setWarning("");
    }
  }, [profileData]);

  useEffect(() => {
    let mounted = true;
    async function fetchHistory() {
      setLoadingHistory(true);
      try {
        const res = await getResumeHistory();
        if (mounted && res?.resumes) {
          const list = [...res.resumes].sort(
            (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)
          );
          setHistory(list);

        }
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    }
    fetchHistory();
    return () => (mounted = false);
  }, []);

  const handleChange = (k, v) => {
    setLocal((prev) => {
      const updated = { ...prev, [k]: v };
      setFormData?.(updated);
      return updated;
    });
  };

  const handleSelectResume = async (id) => {
    setSelectedResumeId(id);
    if (!id) return; 

    try {
      const res = await loadResumeById(id);
      const parsed = res?.parsed_json || res;

      if (parsed) {
        setProfileData(parsed); 
        
        setLocal((prev) => {

          const suggestedRole = parsed.target_role || parsed.user_target_role || prev.targetRole;
          const suggestedLevel = parsed.career_level || prev.level;

          const updated = {
            ...prev, 
            targetRole: suggestedRole,
            level: suggestedLevel
          };
          
          setFormData?.(updated);
          return updated;
        });
      }
    } catch (e) {
      console.error("Failed to load resume:", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!local.targetRole.trim()) return alert("Please enter a target role.");

    try {
      setLoading(true);
      await onGenerate(selectedResumeId); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6 max-w-2xl mx-auto mt-6">
      

      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600"
          title="Go Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-800">Create Learning Roadmap</h2>
      </div>

      {warning && (
        <div className="bg-yellow-50 p-4 text-sm text-yellow-800 border border-yellow-100 rounded-lg flex items-start gap-2">
           <span>⚠️</span> 
           <span>{warning}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
    
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Target Role</label>
          <input
            list="job-roles-list"
            value={local.targetRole}
            onChange={(e) => handleChange("targetRole", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Type or select a role (e.g. Data Engineer)"
            autoComplete="off"
          />
          <datalist id="job-roles-list">
            {JOB_ROLES.map((role) => (
              <option key={role} value={role} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Current Level</label>
            <select
              value={local.level}
              onChange={(e) => handleChange("level", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              <option>Entry-level</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Timeline (Months)</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={24}
                value={local.timeline}
                onChange={(e) => handleChange("timeline", Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pl-10 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
              <Calendar size={16} className="absolute left-3 top-3.5 text-gray-400" />
            </div>
          </div>
        </div>

        
        <div className="pt-2">
          <label className="text-sm font-semibold text-gray-700 block mb-1">
            Reference Resume
          </label>
          <select
            value={selectedResumeId || ""}
            onChange={(e) => handleSelectResume(e.target.value || null)}
            disabled={loadingHistory}
            className="w-full border border-gray-300 px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white transition outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Create without specific resume --</option>
            {history.map((item) => (
              <option key={item.resume_id} value={item.resume_id}>
                {item.file_path ? `📄 ${item.file_path}` : `📅 Uploaded ${new Date(item.uploaded_at).toLocaleDateString()}`}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Selecting a resume will optimize the roadmap based on your specific skills gap.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-md ${
            loading 
              ? "bg-blue-400 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5"
          }`}
        >
          {loading ? <RefreshCcw size={20} className="animate-spin" /> : <ArrowRight size={20} />} 
          {loading ? "Generating Your Plan..." : "Generate Roadmap"}
        </button>
      </form>
    </div>
  );
}