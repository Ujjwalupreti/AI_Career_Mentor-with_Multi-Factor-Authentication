import React, { useEffect, useState, useRef } from "react";
import {
  startMockInterview,
  getMockHistory,
  deleteMockSession,
  getUserProfile,
} from "../../utils/api";
import InterviewPanel from "./InterviewPanel";
import {
  Cpu,
  Sparkles,
  History,
  RefreshCw,
  ChevronRight,
  Trash2,
  Loader2,
  User,
  Clock,
  Zap,
} from "lucide-react";

const AIBootLoader = ({ visible }) => {
  const [index, setIndex] = useState(0);
  const steps = [
    "Spinning up AI interview room…",
    "Inviting senior interviewers to the panel…",
    "Loading role-specific questions…",
    "Preparing scoring & feedback engine…",
  ];

  useEffect(() => {
    if (!visible) return;
    setIndex(0);
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % steps.length);
    }, 900);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900/90">
      <div className="relative w-[380px] rounded-2xl bg-white/5 p-6 shadow-2xl border border-white/20 backdrop-blur-xl animate-fadeIn">

        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-sky-500/40 via-indigo-500/40 to-fuchsia-500/40 blur opacity-70 -z-10"></div>
        <div className="relative mx-auto w-20 h-20 mb-4">
          <div className="absolute inset-0 rounded-full bg-sky-500 opacity-30 animate-ping"></div>
          <div className="absolute inset-1 rounded-full bg-sky-600 flex items-center justify-center animate-pulse">
            <Cpu className="w-8 h-8 text-white" />
          </div>
        </div>

        <p className="text-white text-lg font-semibold text-center mb-1">
          {steps[index]}
        </p>
        <p className="text-gray-300 text-sm text-center">
          Please wait a moment…
        </p>
      </div>
    </div>
  );
};

export default function MockInterviewConsole({ targetRole }) {
  const [difficulty, setDifficulty] = useState("medium");
  const [numInterviewers, setNumInterviewers] = useState(2);
  const [duration, setDuration] = useState(20);
  const [careerLevel, setCareerLevel] = useState("Entry-level");

  const [effectiveRole, setEffectiveRole] = useState(targetRole || "");

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [showPanel, setShowPanel] = useState(false);

  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (targetRole) {
      setEffectiveRole(targetRole);
    } else {
      (async () => {
        try {
          const p = await getUserProfile();
          setEffectiveRole(
            p.target_role || p.current_role || "Software Engineer"
          );
        } catch (err) {
          console.error("Failed to load profile:", err);
          setEffectiveRole("Software Engineer");
        }
      })();
    }
  }, [targetRole]);

  const loadHistory = async () => {
    try {
      const res = await getMockHistory();
      setSessions(res.sessions || []);
    } catch (e) {
      console.error("Failed to load mock history", e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);

    const payload = {
      target_role: effectiveRole,
      difficulty,
      num_interviewers: numInterviewers,
      duration_minutes: duration,
      career_level: careerLevel,
      present_skills: [],
      missing_skills: [],
    };

    try {
      const res = await startMockInterview(payload);
      setTimeout(() => {
        setActiveSession({
          mode: "live",
          session_id: res.session_id,
          interviewers: res.interviewers,
          first_question: res.first_question,
          session_brief: res.session_brief,
          duration: res.duration_minutes,
          remaining_seconds: res.remaining_seconds,
          target_role: effectiveRole,
          difficulty,
          career_level: careerLevel,
        });
        setShowPanel(true);
        loadHistory();
        setStarting(false);
      }, 1200);
    } catch (e) {
      console.error(e);
      alert("Could not start session.");
      setStarting(false);
    }
  };

  const openHistorySession = (s) => {
    setActiveSession({
      mode: "history",
      session_id: s.session_id,
      target_role: s.target_role,
      difficulty: s.difficulty,
      career_level: s.career_level || careerLevel,
      duration: s.duration_minutes,
      remaining_seconds: s.duration_minutes * 60,
      interviewers: [],
      fromHistory: true,
    });
    setShowPanel(true);
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this mock interview session permanently?")) {
      return;
    }
    try {
      await deleteMockSession(sessionId);
      await loadHistory();
    } catch (err) {
      console.error("Failed to delete session", err);
      alert("Could not delete session.");
    }
  };

  return (
    <>
      <AIBootLoader visible={starting} />

      <div className="bg-white border rounded-xl shadow p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-xl flex items-center gap-2">
              <Cpu className="w-6 h-6 text-blue-600" /> AI Mock Interview Studio
            </h2>
            <p className="text-sm text-gray-500">
              Practice for <span className="font-semibold">{effectiveRole}</span>{" "}
              interviews with an AI multi-interviewer panel.
            </p>
          </div>

          <button
            onClick={handleStart}
            disabled={starting}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-white 
              ${
                starting
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {starting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Start New Session
              </>
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col text-sm">
            <label className="font-medium mb-1 flex items-center gap-1">
              <User className="w-4 h-4 text-gray-500" /> Difficulty
            </label>
            <select
              className="border p-2 rounded"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="flex flex-col text-sm">
            <label className="font-medium mb-1">Career Level</label>
            <select
              className="border p-2 rounded"
              value={careerLevel}
              onChange={(e) => setCareerLevel(e.target.value)}
            >
              <option>Entry-level</option>
              <option>Junior</option>
              <option>Mid-level</option>
              <option>Senior</option>
            </select>
          </div>

          <div className="flex flex-col text-sm">
            <label className="font-medium mb-1">Interviewers</label>
            <select
              className="border p-2 rounded"
              value={numInterviewers}
              onChange={(e) => setNumInterviewers(Number(e.target.value))}
            >
              <option value={1}>1 Interviewer</option>
              <option value={2}>2 Interviewers</option>
              <option value={3}>3 Interviewers</option>
            </select>
          </div>

          <div className="flex flex-col text-sm">
            <label className="font-medium mb-1 flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-500" /> Duration
            </label>
            <select
              className="border p-2 rounded"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <h3 className="font-semibold flex items-center gap-1">
            <History className="w-4 h-4" /> Recent Sessions
          </h3>

          <button
            onClick={loadHistory}
            className="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        {sessions.length === 0 ? (
          <div className="text-gray-400 text-center py-10">
            No mock interviews yet. Start your first session above.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.session_id}
                onClick={() => openHistorySession(s)}
                className="p-4 border rounded-lg hover:border-blue-500 cursor-pointer flex justify-between items-center bg-gray-50 hover:bg-white transition"
              >
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {s.target_role}
                    {s.hire_recommendation && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          s.hire_recommendation === "strong_yes"
                            ? "bg-emerald-100 text-emerald-700"
                            : s.hire_recommendation === "no"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {s.hire_recommendation.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {s.summary || "No final summary yet."}
                  </div>
                  <div className="flex gap-2 mt-2 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border">
                      <Zap className="w-3 h-3" />
                      {s.difficulty}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border">
                      <User className="w-3 h-3" />
                      {s.num_interviewers} interviewers
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => handleDeleteSession(e, s.session_id)}
                    className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showPanel && activeSession && (
        <InterviewPanel
          session={activeSession}
          onClose={() => {
            setShowPanel(false);
            setActiveSession(null);
          }}
          onHistoryRefresh={loadHistory}
        />
      )}
    </>
  );
}
