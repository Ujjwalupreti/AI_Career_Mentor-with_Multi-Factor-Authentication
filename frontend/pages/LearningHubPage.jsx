import React, { useState } from "react";
import Navbar from "../components/Navbar";
import MockInterviewConsole from "../components/learning/MockInterviewConsole";
import { BookOpen, Video, Trophy, BarChart, Sparkles } from "lucide-react";

export default function LearningHubPage() {
  const tabs = [
    { id: "mock-interview", label: "Mock Interview", icon: Video },
    { id: "quizzes", label: "Quizzes", icon: BookOpen },
    { id: "practice", label: "Practice Area", icon: Trophy },
    { id: "progress", label: "My Progress", icon: BarChart },
    { id: "recommendations", label: "For You", icon: Sparkles },
  ];

  const [activeTab, setActiveTab] = useState("mock-interview");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Learning Hub</h1>
          <p className="text-slate-500 mt-1">
            Master your skills with AI-driven tools and personalized roadmaps.
          </p>
        </div>

     
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1.5 mb-8 flex flex-wrap gap-2 transition-all duration-300 ease-in-out">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-out ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-105"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-100" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div key={activeTab} className="animate-fadeIn transition-all duration-500 ease-out">
          {activeTab === "mock-interview" && (
            <MockInterviewConsole targetRole="Software Engineer" />
          )}

          {activeTab === "quizzes" && (
            <div className="p-8 border border-dashed border-slate-300 rounded-xl bg-white text-center shadow-sm">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Adaptive Quizzes</h3>
              <p className="text-slate-500">Coming soon: Test your knowledge dynamically.</p>
            </div>
          )}

          {activeTab === "practice" && (
             <div className="p-8 border border-dashed border-slate-300 rounded-xl bg-white text-center shadow-sm">
              <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Practice Arena</h3>
              <p className="text-slate-500">Coming soon: Flashcards and coding challenges.</p>
            </div>
          )}

          {activeTab === "progress" && (
            <div className="p-8 border border-dashed border-slate-300 rounded-xl bg-white text-center shadow-sm">
              <BarChart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Analytics</h3>
              <p className="text-slate-500">Coming soon: Track your growth over time.</p>
            </div>
          )}

          {activeTab === "recommendations" && (
            <div className="p-8 border border-dashed border-slate-300 rounded-xl bg-white text-center shadow-sm">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">AI Recommendations</h3>
              <p className="text-slate-500">Coming soon: Personalized resource matching.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}