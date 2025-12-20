import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Briefcase,
  CheckCircle,
  XCircle,
  Lightbulb,
  X,
  BookOpen,
  Info,
  Target,
  ListChecks,
  Zap,
  Mail,
  MapPin,
  Link as LinkIcon,
  User as UserIcon,
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";

const ResumeDisplayer = ({ skills = [], missing = [], experiences = [] }) => {
  const { profileData } = useAppContext();
  const navigate = useNavigate();

  const targetRole =
    profileData?.target_role || profileData?.user_target_role || "Career Goal";
  const improvement = profileData?.improvement_analysis || {};
  const summary = improvement?.summary || {};
  const skillImprovement = improvement?.skills || {};
  const expImprovementList = improvement?.experience || [];
  const projectImprovementList = improvement?.projects || [];
  const projects = profileData?.projects || [];
  const userInfo = profileData?.user_info || {};
  const resumeScore = profileData?.resume_score || {};

  const [activeTab, setActiveTab] = useState("summary");
  const [openAcc, setOpenAcc] = useState({
    skills: true,
    experience: true,
    projects: true,
  });
  const toggleAcc = (k) => setOpenAcc((p) => ({ ...p, [k]: !p[k] }));

  const getImp = (arr, key, val) =>
    arr?.find(
      (imp) =>
        imp?.[key] && val && imp[key].toLowerCase().includes(val.toLowerCase())
    );

  const summaryBlocks = useMemo(() => {
    const blocks = [];
    if (summary?.market_score || summary?.market_position)
      blocks.push({
        icon: <Target className="w-4 h-4 text-blue-600" />,
        title: "Market Fit",
        content: [
          summary?.market_score ? `Score: ${summary.market_score}` : null,
          summary?.market_position,
        ].filter(Boolean),
      });
    if (
      summary?.pros?.length ||
      summary?.cons?.length ||
      summary?.suggestions?.length
    )
      blocks.push({
        icon: <Info className="w-4 h-4 text-blue-600" />,
        title: "Summary Insights",
        pros: summary?.pros || [],
        cons: summary?.cons || [],
        suggestions: summary?.suggestions || [],
      });

    const edu = profileData?.education?.[0];
    if (edu)
      blocks.push({
        icon: <BookOpen className="w-4 h-4 text-blue-600" />,
        title: "Education",
        content: [
          [edu?.degree, edu?.branch || edu?.field, edu?.institute]
            .filter(Boolean)
            .join(" • "),
        ],
      });

    return blocks;
  }, [summary, profileData]);

  const handleGenerateRoadmap = () => {
    if (!profileData || Object.keys(profileData).length === 0) {
      alert("Please upload or view a parsed resume first!");
      return;
    }
    navigate("/pathbuilder");
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b rounded-t-xl">
        <div className="flex flex-wrap gap-2 px-2 py-2">
          {["summary", "skills", "experience", "projects"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "summary" && (
        <div className="bg-white border rounded-xl p-5 space-y-5 shadow-sm">
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <ListChecks className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-lg">
                Resume Summary & Market Performance
              </h3>

              <button
              onClick={handleGenerateRoadmap}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm ml-auto"
            >
              <Zap className="w-4 h-4" /> Generate Roadmap
            </button>
            </div>
            {summaryBlocks.length ? (
              <div className="md:grid-cols-2 gap-4 mt-5">
                {summaryBlocks.map((b, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      {b.icon}
                      <p className="font-semibold text-gray-800">{b.title}</p>
                    </div>
                    {b.content && (
                      <ul className="list-disc ml-5 text-sm text-gray-700">
                        {b.content.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    )}
                    {(b.pros?.length ||
                      b.cons?.length ||
                      b.suggestions?.length) && (
                      <div className="mt-2">
                        {["pros", "cons", "suggestions"].map(
                          (type) =>
                            b[type]?.length && (
                              <div key={type} className="mb-2">
                                <p
                                  className={`text-sm font-semibold ${
                                    type === "pros"
                                      ? "text-green-700"
                                      : type === "cons"
                                      ? "text-red-700"
                                      : "text-blue-700"
                                  }`}
                                >
                                  {type === "pros"
                                    ? "Strengths"
                                    : type === "cons"
                                    ? "Weaknesses"
                                    : "Suggestions"}
                                </p>
                                <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
                                  {b[type].map((t, i2) => (
                                    <li key={i2}>{t}</li>
                                  ))}
                                </ul>
                              </div>
                            )
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                No summary data available yet.
              </p>
            )}
          </div>
        </div>
      )}
      {activeTab === "skills" && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => toggleAcc("skills")}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-lg text-gray-900">Skills Overview</h3>
            </div>
            {openAcc.skills ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {openAcc.skills && (
            <div className="p-4 space-y-5 border-t border-gray-200">
              <div>
                <span className="font-semibold text-green-700">
                  Current Skills
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.length ? (
                    skills.map((s, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {s.name || s}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No skills found.</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <X className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-red-700">
                    Missing for {targetRole}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {missing.length ? (
                    missing.map((s, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                      >
                        {s.name || s}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No missing skills.</p>
                  )}
                </div>
              </div>

              {(skillImprovement?.pros?.length ||
                skillImprovement?.cons?.length ||
                skillImprovement?.suggestions?.length) && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    <h4 className="font-semibold text-gray-800">
                      Improvement Insights
                    </h4>
                  </div>
                  {["pros", "cons", "suggestions"].map(
                    (type) =>
                      skillImprovement[type]?.length && (
                        <div key={type} className="mb-2">
                          <p
                            className={`text-sm font-semibold ${
                              type === "pros"
                                ? "text-green-700"
                                : type === "cons"
                                ? "text-red-700"
                                : "text-blue-700"
                            }`}
                          >
                            {type === "pros"
                              ? "Strengths"
                              : type === "cons"
                              ? "Weaknesses"
                              : "Suggestions"}
                          </p>
                          <ul className="list-disc ml-5 text-sm text-gray-700">
                            {skillImprovement[type].map((t, i2) => (
                              <li key={i2}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "experience" && (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={() => toggleAcc("experience")}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-lg text-gray-900">
                Experience & Applied Projects
              </h3>
            </div>
            {openAcc.experience ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {openAcc.experience && (
            <div className="p-4 space-y-3 border-t">
              {experiences.length ? (
                experiences.map((exp, i) => {
                  const imp = getImp(expImprovementList, "role", exp.role);
                  return (
                    <div
                      key={i}
                      className="border rounded-lg p-4 hover:border-blue-300 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900">
                            {exp.role || "Developer"}
                          </h4>
                          <p className="text-sm text-blue-600 font-medium">
                            {exp.project_title || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500 italic">
                            {exp.short_description || "No description."}
                          </p>
                        </div>
                        {exp.source === "suggested" && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                            AI Suggested
                          </span>
                        )}
                      </div>

                      {[["analysis_pros", CheckCircle, "text-green-700"],
                        ["analysis_cons", XCircle, "text-red-600"]].map(
                        ([key, IconCmp, color]) =>
                          exp[key]?.length && (
                            <ul key={key} className="text-sm mt-2 space-y-1">
                              {exp[key].map((txt, j) => (
                                <li
                                  key={j}
                                  className={`flex items-start gap-2 ${color}`}
                                >
                                  <IconCmp className="w-4 h-4 mt-0.5" />
                                  <span>{txt}</span>
                                </li>
                              ))}
                            </ul>
                          )
                      )}

                      {imp && (
                        <div className="mt-3 border-t pt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold text-gray-800 text-sm">
                              Improvement Suggestions
                            </span>
                          </div>
                          {["pros", "cons", "suggestions"].map(
                            (type) =>
                              imp[type]?.length && (
                                <ul
                                  key={type}
                                  className={`list-disc ml-5 text-sm ${
                                    type === "pros"
                                      ? "text-green-700"
                                      : type === "cons"
                                      ? "text-red-700"
                                      : "text-blue-700"
                                  }`}
                                >
                                  {imp[type].map((t, i2) => (
                                    <li key={i2}>{t}</li>
                                  ))}
                                </ul>
                              )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center">
                  No experience data found.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "projects" && (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={() => toggleAcc("projects")}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-lg text-gray-900">Projects</h3>
            </div>
            {openAcc.projects ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {openAcc.projects && (
            <div className="p-4 space-y-3 border-t">
              {projects?.length ? (
                projects.map((p, i) => {
                  const pim = getImp(projectImprovementList, "title", p.title);
                  return (
                    <div
                      key={i}
                      className="border rounded-lg p-4 hover:border-blue-300 transition"
                    >
                      <h4 className="font-bold text-gray-900">{p.title}</h4>
                      {p.technologies?.length ? (
                        <p className="text-xs text-gray-600">
                          Tech: {p.technologies.join(", ")}
                        </p>
                      ) : null}

                      {[["pros", "text-green-700", CheckCircle],
                        ["cons", "text-red-600", XCircle]].map(
                        ([key, color, IconCmp]) =>
                          p[key]?.length && (
                            <ul key={key} className="text-sm mt-2 space-y-1">
                              {p[key].map((t, j) => (
                                <li
                                  key={j}
                                  className={`flex items-start gap-2 ${color}`}
                                >
                                  <IconCmp className="w-4 h-4 mt-0.5" />
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          )
                      )}

                      {pim && (
                        <div className="mt-3 border-t pt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold text-gray-800 text-sm">
                              Improvement Suggestions
                            </span>
                          </div>
                          {["pros", "cons", "suggestions"].map(
                            (type) =>
                              pim[type]?.length && (
                                <ul
                                  key={type}
                                  className={`list-disc ml-5 text-sm ${
                                    type === "pros"
                                      ? "text-green-700"
                                      : type === "cons"
                                      ? "text-red-700"
                                      : "text-blue-700"
                                  }`}
                                >
                                  {pim[type].map((t, k) => (
                                    <li key={k}>{t}</li>
                                  ))}
                                </ul>
                              )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center">
                  No projects found.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {improvement?.overall_tips?.length ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <h4 className="font-semibold text-yellow-800 mb-1">
            General Improvement Tips
          </h4>
          <ul className="list-disc ml-5 text-sm text-gray-800">
            {improvement.overall_tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default ResumeDisplayer;