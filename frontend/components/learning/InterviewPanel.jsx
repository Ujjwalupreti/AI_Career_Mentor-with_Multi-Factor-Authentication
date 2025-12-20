// src/components/learning/InterviewPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  sendMockAnswer,
  transcribeMockAudio,
  getMockReport,
} from "../../utils/api";
import {
  Mic,
  MicOff,
  SkipForward,
  Send,
  Volume2,
  VolumeX,
  XCircle,
  Loader2,
  AlertTriangle,
  Video,
  CheckCircle,
  SunMedium,
  Moon,
} from "lucide-react";

const PREFERRED_VOICE_NAMES = [
  "Google en-US Standard-B",
  "Google en-US Standard-C",
  "Google en-US Standard-D",
  "Google en-GB Standard-A",
  "Google UK English Male",
  "Google US English",
  "Microsoft Aria Online",
  "Microsoft Guy Online",
  "Microsoft Zira Desktop",
  "Microsoft David Desktop",
];

const formatTime = (s) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function InterviewPanel({ session, onClose, onHistoryRefresh }) {
  const isHistory = session.mode === "history" || session.fromHistory;

  const [theme, setTheme] = useState("dark"); 

  const [question, setQuestion] = useState(session.first_question || "");
  const [interviewers, setInterviewers] = useState(session.interviewers || []);
  const [messages, setMessages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(
    session.remaining_seconds || session.duration * 60
  );
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);

  const timerRef = useRef(null);

  const transcriptRef = useRef(null);

  const [availableVoices, setAvailableVoices] = useState([]);
  const [interviewerVoices, setInterviewerVoices] = useState({});
  const greetingPlayedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      try {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    if (!interviewers || interviewers.length === 0) return;
    if (!availableVoices || availableVoices.length === 0) return;

    const preferred = [];
    PREFERRED_VOICE_NAMES.forEach((name) => {
      const v = availableVoices.find((vv) =>
        vv.name.toLowerCase().includes(name.toLowerCase())
      );
      if (v && !preferred.includes(v)) preferred.push(v);
    });

    const googleVoices = availableVoices.filter((v) =>
      v.name.toLowerCase().includes("google")
    );
    const englishVoices = availableVoices.filter(
      (v) => v.lang && v.lang.toLowerCase().startsWith("en")
    );

    const base =
      preferred.length > 0
        ? preferred
        : googleVoices.length > 0
        ? googleVoices
        : englishVoices.length > 0
        ? englishVoices
        : availableVoices;

    const mapping = {};
    interviewers.forEach((iv, idx) => {
      const key = iv.name || `Interviewer_${idx}`;
      mapping[key] = base[idx % base.length];
    });

    setInterviewerVoices(mapping);
  }, [interviewers, availableVoices]);

  const stopAllSpeech = () => {
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}
  };

  const speak = (text, fromName) => {
    if (!voiceEnabled || !text) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    stopAllSpeech();

    const utter = new SpeechSynthesisUtterance(text);
    const voice = interviewerVoices[fromName];
    if (voice) utter.voice = voice;
    utter.rate = 1.0;
    utter.lang = "en-US";
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    if (isHistory) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          endInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
    };

  }, [isHistory]);

  useEffect(() => {
    if (isHistory) {
      (async () => {
        try {
          const res = await getMockReport(session.session_id);
          setFinalReport(res.report || null);
        } catch {
          setMessages([
            { type: "system", text: "Failed to load final report." },
          ]);
        }
      })();
      return;
    }


    if (
      greetingPlayedRef.current ||
      !interviewers ||
      interviewers.length === 0 ||
      !question
    ) {
      return;
    }

    const primaryInterviewer = interviewers[0];
    const interviewerName = primaryInterviewer?.name || "Interviewer";
    const role = primaryInterviewer?.role || "";
    const roleText = session.target_role || "this role";

    const greetingText = `Hi, I’m ${interviewerName}, ${role}. Welcome to your mock interview for the ${roleText} position. Let's begin with the first question.`;

    setMessages([
      { type: "system", text: greetingText },
      { type: "interviewer", name: interviewerName, text: question },
    ]);

    speak(greetingText + " " + question, interviewerName);
    greetingPlayedRef.current = true;
  }, [isHistory, interviewers, question, session.target_role]);

  
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, finalReport]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      audioChunks.current = [];

      mediaRecorderRef.current.ondataavailable = (e) =>
        audioChunks.current.push(e.data);

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        try {
          const res = await transcribeMockAudio(blob);
          if (res.text) setAnswerText(res.text);
        } catch {
          alert("Could not transcribe audio.");
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch {
      alert("Microphone not accessible.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const submitAnswer = async (skipped = false) => {
    if (isHistory) return;
    if (!question) return alert("Start the interview first.");
    if (!answerText && !skipped) return alert("Please type an answer.");

    setLoading(true);

    try {
      const res = await sendMockAnswer(session.session_id, answerText, {
        skipped,
        elapsed_seconds: 8,
      });

      
      setMessages((m) => [
        ...m,
        {
          type: "user",
          text: skipped ? "[Skipped]" : answerText,
        },
        {
          type: "feedback",
          summary: res.feedback.summary,
          strengths: res.feedback.strengths || [],
          improvements: res.feedback.improvements || [],
          score: res.feedback.score,
          penalty: res.penalty_seconds,
          penalty_reason: res.penalty_reason,
        },
      ]);

     
      const penalty = Number(res.penalty_seconds) || 0;
      if (penalty > 0) {
        setRemainingSeconds((prev) => Math.max(0, prev - penalty));
      }


      if (res.should_continue && res.next_question) {
        const nextIndex =
          interviewers.length > 0
            ? (currentIndex + 1) % interviewers.length
            : 0;

        setCurrentIndex(nextIndex);
        setQuestion(res.next_question);
        setAnswerText("");

        const nextName =
          interviewers[nextIndex]?.name ||
          interviewers[0]?.name ||
          "Interviewer";

        setMessages((m) => [
          ...m,
          {
            type: "interviewer",
            name: nextName,
            text: res.next_question,
          },
        ]);

        speak(res.next_question, nextName);
      } else {
        await endInterview();
      }
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        { type: "system", text: "Failed to send answer." },
      ]);
    }

    setLoading(false);
  };

  const endInterview = async () => {
    if (interviewEnded) return;
    setInterviewEnded(true);
    clearInterval(timerRef.current);
    stopAllSpeech();

    try {
      const report = await getMockReport(session.session_id);
      setFinalReport(report.report || null);
      onHistoryRefresh();
    } catch {
      setMessages((m) => [
        ...m,
        { type: "system", text: "Failed to generate final report." },
      ]);
    }
  };
  const handleCloseClick = () => {
    if (!interviewEnded && !isHistory) {
      setShowCloseWarning(true);
      return;
    }
    stopAllSpeech();
    onClose();
  };

  const confirmClose = () => {
    if (!interviewEnded && !isHistory) {
      endInterview();
    }
    stopAllSpeech();
    onClose();
  };

  useEffect(() => {
    return () => {
      stopAllSpeech();
      clearInterval(timerRef.current);
    };
  }, []);

  const activeInterviewer = interviewers[currentIndex] || interviewers[0];
  const activeName = activeInterviewer?.name || "Interviewer";
  const activeRole = activeInterviewer?.role || "";

  const bgPanel =
    theme === "dark"
      ? "bg-slate-950 border border-slate-800"
      : "bg-white border border-gray-300";

  const headerBg =
    theme === "dark" ? "bg-slate-900/80 border-slate-800" : "bg-gray-50 border-gray-200";

  const leftBg =
    theme === "dark"
      ? "bg-gradient-to-b from-slate-950 to-slate-900"
      : "bg-gradient-to-b from-white to-slate-50";

  const gridTileBase =
    theme === "dark"
      ? "border-slate-700 bg-slate-900/80"
      : "border-gray-300 bg-white";

  const gridTileActive =
    theme === "dark"
      ? "border-emerald-400 bg-slate-800/80"
      : "border-emerald-400 bg-emerald-50";

  const transcriptBg = theme === "dark" ? "bg-slate-900" : "bg-gray-50";

  return (
    <div
      className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 transition-colors duration-300 ${
        theme === "dark" ? "bg-black/60" : "bg-gray-200/70"
      }`}
    >
      <div className={`w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${bgPanel}`}>
        <div className={`flex items-center justify-between px-6 py-3 border-b ${headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className={`font-semibold text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {isHistory ? "Mock Interview – Final Report" : "Live Mock Interview"}
              </h1>
              <p className="text-[11px] text-slate-400">
                {session.target_role || "Interview"} •{" "}
                {session.career_level || "Entry-level"} •{" "}
                {session.difficulty || "medium"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`px-3 py-1 rounded-full flex items-center gap-2 text-xs ${
                theme === "dark"
                  ? "bg-slate-800 text-slate-100"
                  : "bg-white text-gray-800 border border-gray-300"
              }`}
            >
              {theme === "dark" ? (
                <>
                  <SunMedium className="w-3 h-3" /> Light Mode
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3" /> Dark Mode
                </>
              )}
            </button>

            {!isHistory && (
              <div
                className={`px-3 py-1 rounded-full text-[11px] ${
                  theme === "dark"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-white text-gray-700 border border-gray-300"
                }`}
              >
                Time left: {formatTime(remainingSeconds)}
              </div>
            )}

            {!isHistory && (
              <button
                onClick={() => setVoiceEnabled((v) => !v)}
                className={`px-3 py-1 rounded-full flex items-center gap-2 text-xs ${
                  theme === "dark"
                    ? "bg-slate-800 text-slate-100"
                    : "bg-white text-gray-800 border border-gray-300"
                }`}
              >
                {voiceEnabled ? (
                  <Volume2 className="w-3 h-3" />
                ) : (
                  <VolumeX className="w-3 h-3" />
                )}
                Voice: {voiceEnabled ? "On" : "Off"}
              </button>
            )}

            <button
              onClick={handleCloseClick}
              className="px-3 py-1 bg-red-600 text-white rounded-full flex items-center gap-1 text-xs"
            >
              <XCircle size={16} /> Close
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className={`w-2/3 border-r ${leftBg} border-slate-800 flex flex-col`}>
            <div className={`grid grid-cols-3 gap-2 p-4 border-b ${theme === "dark" ? "bg-slate-900/70 border-slate-800" : "bg-gray-50 border-gray-200"}`}>
              {interviewers.length === 0 ? (
                <div
                  className={`col-span-3 h-24 rounded-xl flex items-center justify-center text-xs ${
                    theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Interviewers will appear here once loaded.
                </div>
              ) : (
                interviewers.map((iv, idx) => (
                  <div
                    key={idx}
                    className={`relative h-32 rounded-xl border flex flex-col items-center justify-center text-xs transition-all duration-300 ${
                      idx === currentIndex
                        ? `${gridTileActive} scale-[1.04] shadow-lg`
                        : `${gridTileBase} hover:scale-[1.02]`
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center mb-1 text-white text-sm font-semibold">
                      {iv.name?.charAt(0) || "I"}
                    </div>
                    <div className={theme === "dark" ? "text-slate-100 font-semibold" : "text-gray-900 font-semibold"}>
                      {iv.name}
                    </div>
                    <div
                      className={`text-[10px] px-2 text-center line-clamp-2 ${
                        theme === "dark" ? "text-slate-300" : "text-gray-600"
                      }`}
                    >
                      {iv.role}
                    </div>
                    {idx === currentIndex && !isHistory && (
                      <div className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-900 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-900 animate-pulse" />
                        Speaking
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              {isHistory ? (
                <div className={theme === "dark" ? "text-slate-100 text-sm" : "text-gray-800 text-sm"}>
                  <p className="font-semibold mb-1">
                    This is a completed session. Final report is shown on the right.
                  </p>
                  <p className={theme === "dark" ? "text-slate-300 text-xs" : "text-gray-600 text-xs"}>
                    To practice again, close this panel and start a new live session from the console.
                  </p>
                </div>
              ) : (
                <>
  
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center text-sm font-semibold">
                      {activeName.charAt(0)}
                    </div>
                    <div>
                      <div
                        className={`text-sm font-semibold ${
                          theme === "dark" ? "text-slate-100" : "text-gray-900"
                        }`}
                      >
                        {activeName}
                      </div>
                      <div className={theme === "dark" ? "text-[11px] text-slate-300" : "text-[11px] text-gray-600"}>
                        {activeRole}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl p-5 shadow-lg border transition-all duration-300 ${
                      theme === "dark"
                        ? "bg-slate-900/90 border-slate-700"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <div className="text-[11px] font-semibold text-sky-400 mb-1">
                      Current question
                    </div>
                    <div
                      className={`text-sm mb-2 ${
                        theme === "dark" ? "text-slate-50" : "text-gray-900"
                      }`}
                    >
                      {question}
                    </div>
                    <div
                      className={`text-[10px] italic ${
                        theme === "dark" ? "text-slate-400" : "text-gray-500"
                      }`}
                    >
                      Answer as you would in a real technical interview. Use concrete examples, metrics,
                      and trade-offs.
                    </div>
                  </div>

                  
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    className={`w-full rounded-xl p-3 h-28 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none border shadow-sm ${
                      theme === "dark"
                        ? "bg-slate-900 text-slate-100 border-slate-700"
                        : "bg-white text-gray-900 border-gray-300"
                    }`}
                    placeholder="Explain your reasoning, constraints, design choices, and concrete examples…"
                  />

                
                  <div className="flex items-center gap-3">
                    {!recording ? (
                      <button
                        onClick={startRecording}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg flex items-center gap-2 text-sm"
                      >
                        <Mic className="w-4 h-4" /> Record
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm"
                      >
                        <MicOff className="w-4 h-4" /> Stop
                      </button>
                    )}

                    <button
                      disabled={loading}
                      onClick={() => submitAnswer(false)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send
                    </button>

                    <button
                      disabled={loading}
                      onClick={() => submitAnswer(true)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-60"
                    >
                      <SkipForward className="w-4 h-4" />
                      Skip Question (penalty)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

        
          <div
            ref={transcriptRef}
            className={`w-1/3 p-4 overflow-y-auto space-y-3 ${transcriptBg}`}
          >
            {!isHistory && (
              <h3
                className={`font-semibold text-xs mb-1 ${
                  theme === "dark" ? "text-slate-200" : "text-gray-700"
                }`}
              >
                Transcript & feedback
              </h3>
            )}

          
            {!isHistory &&
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`border rounded-lg p-3 text-xs animate-fadeIn ${
                    theme === "dark"
                      ? "bg-slate-800/80 border-slate-700 text-slate-100"
                      : "bg-white border-gray-300 text-gray-800"
                  }`}
                >
                  {msg.type === "system" && (
                    <div
                      className={
                        theme === "dark" ? "text-slate-300" : "text-gray-600"
                      }
                    >
                      {msg.text}
                    </div>
                  )}

                  {msg.type === "interviewer" && (
                    <>
                      <div className="font-bold text-sky-500">{msg.name}</div>
                      <div className="mt-1">{msg.text}</div>
                    </>
                  )}

                  {msg.type === "user" && (
                    <div>
                      <span className="font-semibold text-emerald-500">
                        You:
                      </span>{" "}
                      {msg.text}
                    </div>
                  )}

                  {msg.type === "feedback" && (
                    <div className="space-y-1">
                      <div className="font-bold text-fuchsia-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Feedback (Score: {msg.score ?? "N/A"}/10)
                      </div>
                      <div>{msg.summary}</div>

                      <div className="text-[11px]">
                        <strong className="text-emerald-300">
                          Strengths:
                        </strong>
                        <ul className="ml-4 list-disc">
                          {msg.strengths.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="text-[11px]">
                        <strong className="text-amber-300">
                          Improvements (how to fix):
                        </strong>
                        <ul className="ml-4 list-disc">
                          {msg.improvements.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      {msg.penalty > 0 && (
                        <div className="flex items-center gap-2 text-red-400 text-[11px] mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          Penalty: -{msg.penalty}s ({msg.penalty_reason})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

            
            {finalReport && (
              <div
                className={`mt-2 rounded-lg p-4 shadow-md border space-y-3 ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-700 text-slate-100"
                    : "bg-white border-gray-300 text-gray-800"
                }`}
              >
                <div className="font-bold text-indigo-400 mb-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Final Interview Report
                </div>

             
                <div>
                  <h4 className="text-xs font-semibold text-indigo-300 mb-1">
                    Overall Impression
                  </h4>
                  <p className="text-[11px]">
                    {finalReport.summary?.overall_impression}
                  </p>
                  <div className="mt-2 text-[11px]">
                    <span className="font-semibold text-sky-400">
                      Hire Recommendation:{" "}
                    </span>
                    <span>{finalReport.summary?.hire_recommendation}</span>
                  </div>
                </div>

               
                {Array.isArray(finalReport.summary?.strengths) &&
                  finalReport.summary.strengths.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-emerald-400 mb-1">
                        Strengths
                      </h4>
                      <ul className="list-disc ml-4 text-[11px]">
                        {finalReport.summary.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                
                {Array.isArray(finalReport.summary?.areas_for_improvement) &&
                  finalReport.summary.areas_for_improvement.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-amber-400 mb-1">
                        Areas for Improvement
                      </h4>
                      <ul className="list-disc ml-4 text-[11px]">
                        {finalReport.summary.areas_for_improvement.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

               
                {Array.isArray(finalReport.summary?.next_steps) &&
                  finalReport.summary.next_steps.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-fuchsia-400 mb-1">
                        Next Steps
                      </h4>
                      <ul className="list-disc ml-4 text-[11px]">
                        {finalReport.summary.next_steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}

        
            {isHistory && !finalReport && messages.length > 0 && (
              <div className="text-xs text-slate-200">
                {messages.map((m, i) => (
                  <div key={i}>{m.text}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      
      {!isHistory && showCloseWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl w-80 text-center">
            <AlertTriangle className="mx-auto text-amber-400" size={32} />
            <h3 className="font-semibold mt-2 text-slate-100">
              Interview not finished
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Do you want to end the interview now and generate the final
              report?
            </p>

            <div className="flex justify-between mt-4 text-xs">
              <button
                onClick={() => setShowCloseWarning(false)}
                className="px-4 py-2 border border-slate-600 text-slate-100 rounded-lg"
              >
                Continue interview
              </button>
              <button
                onClick={confirmClose}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                End & close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
