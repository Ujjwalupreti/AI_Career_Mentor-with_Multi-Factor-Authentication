import React, { useState, useEffect } from "react";
import { Upload, FileText, Linkedin, Trash2, Eye, ExternalLink, Clock, Plus, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { uploadResume, importLinkedInData, getResumeHistory, loadResumeById, deleteResumeById } from "../utils/api";
import ResumeDisplayer from "../components/dashboard/ResumeDisplayer";
import LinkedInImprovementPanel from "../components/dashboard/LinkedInImprovementPanel";
import { useNavigate } from "react-router-dom";

const UploadBox = ({ icon: Icon, label, uploading, type, onChange, fileName }) => (
  <div className="relative group w-full">
    <input
      type="file"
      accept={type === "resume" ? ".pdf,.docx" : ".pdf,.json,.txt"}
      id={`upload-${type}`}
      onChange={onChange}
      className="hidden"
      disabled={uploading}
    />
    <label 
      htmlFor={`upload-${type}`} 
      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 h-full ${
        uploading ? "border-slate-200 bg-slate-50" : "border-slate-300 hover:border-blue-500 hover:bg-blue-50/50"
      }`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${uploading ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform"}`}>
        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className="w-6 h-6" />}
      </div>
      <p className="font-semibold text-slate-700">{uploading ? "Uploading..." : label}</p>
      {fileName ? (
        <span className="text-xs text-green-600 mt-1 bg-green-50 px-2 py-0.5 rounded-full font-medium">✓ {fileName}</span>
      ) : (
        <span className="text-xs text-slate-400 mt-1">Click to browse</span>
      )}
    </label>
  </div>
);


const HistoryRow = ({ item, onView, onOpen, onDelete }) => (
  <div className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all duration-200 mb-2">
    <div className="flex items-center gap-4 overflow-hidden">
      <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
        <FileText className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-slate-900 truncate">{item.file_path.split('/').pop() || "Document"}</p>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {new Date(item.uploaded_at).toLocaleDateString()}
        </p>
      </div>
    </div>
    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={onView} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Analysis">
        <Eye className="w-4 h-4" />
      </button>
      <button onClick={onOpen} className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Create Roadmap">
        <ExternalLink className="w-4 h-4" />
      </button>
      <button onClick={onDelete} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const { profileData, setProfileData } = useAppContext();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [parsingHistory, setParsingHistory] = useState([]);
  const navigate = useNavigate();

  const fetchResumeHistory = async () => {
    try {
      const res = await getResumeHistory();
      setParsingHistory(res?.resumes || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchResumeHistory(); }, [user]);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      let response;
      if (type === "resume") response = await uploadResume(file);
      else {
        const fileData = await file.text();
        response = await importLinkedInData(fileData);
      }
      setProfileData(response.parsed_json || response);
      await fetchResumeHistory();
      setUploadedFiles(prev => ({ ...prev, [type]: file.name }));
    } catch (err) { setError(err?.response?.data?.detail || "Upload failed."); } 
    finally { setUploading(false); }
  };

  const handleViewResume = async (resume) => {
    try {
      const res = await loadResumeById(resume.resume_id);
      setProfileData(res.parsed_json);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { alert("Failed to load."); }
  };

  const handleOpenRoadmap = async (resume) => {
    try {
      const res = await loadResumeById(resume.resume_id);
      setProfileData(res.parsed_json);
      navigate("/pathbuilder");
    } catch (err) { alert("Failed to open."); }
  };

  const handleDeleteHistory = async (resume_id) => {
    if (!window.confirm("Delete permanently?")) return;
    try {
      await deleteResumeById(resume_id);
      setParsingHistory(prev => prev.filter(r => r.resume_id !== resume_id));
    } catch (err) { alert("Delete failed."); }
  };

  const dataAvailable = (profileData?.experience?.length > 0 || profileData?.skills?.length > 0);

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-5xl mx-auto">
     
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your profile and documents.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium animate-fadeIn">
          {error}
        </div>
      )}
      
      
      <div>
        {profileData?.source === "linkedin" ? (
          <LinkedInImprovementPanel />
        ) : dataAvailable ? (
          <ResumeDisplayer skills={profileData?.skills} missing={profileData?.missing_skills} experiences={profileData?.experience} />
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4">
                <Upload className="w-8 h-8 text-slate-300" />
             </div>
             <h3 className="text-lg font-bold text-slate-900">No Data Yet</h3>
             <p className="text-slate-500 max-w-sm mx-auto mt-2">Upload your resume or LinkedIn profile below to generate insights.</p>
          </div>
        )}
      </div>

      
      <div className="flex flex-col gap-8">
        
        <div className="w-full space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
             <Plus className="w-5 h-5 text-blue-600"/> Upload Documents
          </h3>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <div className="grid md:grid-cols-2 gap-6">
                <UploadBox icon={FileText} label="Resume PDF" type="resume" uploading={uploading} onChange={(e) => handleFileUpload(e, "resume")} fileName={uploadedFiles.resume} />
                <UploadBox icon={Linkedin} label="LinkedIn Data" type="linkedin" uploading={uploading} onChange={(e) => handleFileUpload(e, "linkedin")} fileName={uploadedFiles.linkedin} />
             </div>
          </div>
        </div>

        
        <div className="w-full space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
             <Clock className="w-5 h-5 text-blue-600"/> Recent Documents
          </h3>
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200">
            {parsingHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                   <FileText className="w-10 h-10 mb-3 opacity-20" />
                   <p>No history found.</p>
                </div>
            ) : (
                <div className="grid gap-2">
                  {parsingHistory.map(item => (
                      <HistoryRow 
                          key={item.resume_id} 
                          item={item} 
                          onView={() => handleViewResume(item)} 
                          onOpen={() => handleOpenRoadmap(item)} 
                          onDelete={() => handleDeleteHistory(item.resume_id)} 
                      />
                  ))}
                </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;