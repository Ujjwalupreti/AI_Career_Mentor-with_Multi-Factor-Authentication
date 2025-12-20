import React, { useState, useEffect } from "react";
import { User, Mail, Target, TrendingUp, MapPin, Edit3, Save, X, Camera } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";
import { updateUserProfile, getUserProfile } from "../../utils/api";

const ProfileCard = ({ onClose }) => {
  const { user } = useAuth();
  const { setProfileData } = useAppContext();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [editableProfile, setEditableProfile] = useState({
    name: "",
    current_role: "",
    target_role: "",
    career_level: "",
    location: "", 
  });

  const refreshProfileData = async () => {
      try {
        const res = await getUserProfile();
        if (res) {
          setEditableProfile({
            name: res.name || "",
            target_role: res.target_role || "",
            career_level: res.career_level || "",
            current_role: res.current_role || "",
            location: res.location || "", 
          });
          setProfileData(res);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => { refreshProfileData(); }, []);

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile(editableProfile);
      await refreshProfileData();
      setEditMode(false);
    } catch (err) {
      console.error("Profile update failed:", err);
      alert("Update failed.");
    }
  };

  if (loading) return (
      <div className="bg-white rounded-2xl p-8 text-center text-slate-400 animate-pulse w-full max-w-md mx-auto">Loading...</div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden ring-1 ring-slate-900/5 transition-all">
      
      <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors backdrop-blur-md">
            <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 pb-6 relative">
        <div className="flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg">
                <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-3xl font-bold text-slate-400">
                    {editableProfile.name?.[0]?.toUpperCase() || <User className="w-10 h-10" />}
                </div>
            </div>
            
            <div className="flex gap-2 mb-1">
                {editMode ? (
                  <button onClick={handleSaveProfile} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all">
                    <Save className="w-4 h-4" /> Save
                  </button>
                ) : (
                  <button onClick={() => setEditMode(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg shadow-sm transition-all">
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                )}
            </div>
        </div>

        <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">{editableProfile.name || "New User"}</h2>
            <p className="text-sm text-slate-500 font-medium">{user?.email}</p>
        </div>

        <div className="mt-8 space-y-5">
            {editMode ? (
                 <div className="space-y-4 animate-fadeIn">
                    <InputGroup label="Full Name" value={editableProfile.name} onChange={v => setEditableProfile({...editableProfile, name: v})} />
                    <InputGroup label="Current Role" value={editableProfile.current_role} onChange={v => setEditableProfile({...editableProfile, current_role: v})} />
                    <InputGroup label="Target Role" value={editableProfile.target_role} onChange={v => setEditableProfile({...editableProfile, target_role: v})} />
                    <InputGroup label="Location" value={editableProfile.location} onChange={v => setEditableProfile({...editableProfile, location: v})} />
                 </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 animate-fadeIn">
                    <InfoRow icon={Target} label="Target Role" value={editableProfile.target_role} />
                    <InfoRow icon={TrendingUp} label="Current Role" value={editableProfile.current_role} />
                    <InfoRow icon={MapPin} label="Location" value={editableProfile.location} />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

const InputGroup = ({ label, value, onChange }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">{value || "Not set"}</p>
        </div>
    </div>
);

export default ProfileCard;