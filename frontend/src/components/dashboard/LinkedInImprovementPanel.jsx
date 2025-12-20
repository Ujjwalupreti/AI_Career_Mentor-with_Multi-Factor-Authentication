
import React, { useState } from "react";
import {
  Target,
  Lightbulb,
  Zap,
  ClipboardCopy,
  CheckCircle2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";

export default function LinkedInImprovementPanel() {
  const { profileData } = useAppContext();
  const parsed = profileData || {};

  const summary = parsed.summary || {};
  const alignment = parsed.career_alignment || {};
  const keywords = parsed.profile_keywords || {};
  const skills = parsed.skills_analysis || {};
  const actions = parsed.action_items || [];
  const improvementSummary = parsed.improvement_analysis?.summary || {};

  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    const payload = { profile_summary: parsed, exported_at: new Date().toISOString() };
    const jsonData = JSON.stringify(payload, null, 2);

    try {
      await navigator.clipboard.writeText(jsonData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `linkedin_feedback_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-7 space-y-10 border border-gray-200">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">LinkedIn Profile Analysis</h2>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => (window.location.href = "/pathbuilder")}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
          >
            <Zap className="w-4 h-4" /> Build Roadmap
          </button>
        </div>
      </div>

      {(skills?.present_skills?.length || skills?.missing_skills?.length) && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Skills Overview
          </h3>

          <div className="flex flex-wrap gap-2">
            {(skills.present_skills || []).map((s, i) => (
              <span
                key={i}
                className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium"
              >
                {s}
              </span>
            ))}
            {(skills.missing_skills || []).map((s, i) => (
              <span
                key={i}
                className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {(keywords?.strong_keywords?.length ||
        keywords?.weak_keywords?.length) && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Keyword Insights
          </h3>

          <div className="flex flex-wrap gap-2">
            {(keywords.strong_keywords || []).map((k, i) => (
              <span
                key={i}
                className="bg-green-100 text-green-800 px-3 py-1 text-xs rounded-full"
              >
                {k}
              </span>
            ))}
            {(keywords.weak_keywords || []).map((k, i) => (
              <span
                key={i}
                className="bg-red-100 text-red-800 px-3 py-1 text-xs rounded-full"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Action Plan
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            {actions.map((a, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border-l-4 ${
                  a.priority === "High"
                    ? "border-red-500 bg-red-50"
                    : a.priority === "Medium"
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-blue-500 bg-blue-50"
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{a.category}</p>
                <p className="text-sm text-gray-700 mt-1">{a.task}</p>
                {a.why && (
                  <p className="text-xs text-gray-500 mt-1 italic">{a.why}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(summary?.summary_feedback ||
        improvementSummary?.pros?.length ||
        improvementSummary?.cons?.length ||
        improvementSummary?.suggestions?.length) && (
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-700" />
            <h3 className="font-semibold text-blue-900 text-lg">
              Summary Feedback
            </h3>
          </div>

          {summary?.summary_feedback && (
            <p className="text-sm text-gray-800 leading-relaxed">
              {summary.summary_feedback}
            </p>
          )}

          {improvementSummary?.pros?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-green-700">Strengths</p>
              <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1 mt-1">
                {improvementSummary.pros.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {improvementSummary?.cons?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-red-700">Weaknesses</p>
              <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1 mt-1">
                {improvementSummary.cons.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {improvementSummary?.suggestions?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-blue-700">Suggestions</p>
              <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1 mt-1">
                {improvementSummary.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {alignment?.gaps?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Career Alignment
          </h3>

          <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
            {alignment.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}