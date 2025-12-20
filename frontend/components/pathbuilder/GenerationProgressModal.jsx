import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader } from "lucide-react";

const GenerationProgressModal = ({ generationSteps = [], onComplete }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  
  const computedProgress = useMemo(() => {
    const total = generationSteps.length || 1;
    const completed = generationSteps.filter((s) => s.status === "completed").length;
    const inProgress = generationSteps.some((s) => s.status === "progress") ? 0.5 : 0;
    return Math.min(100, Math.round(((completed + inProgress) / total) * 100));
  }, [generationSteps]);

  
  useEffect(() => {
    if (animatedProgress < computedProgress) {
      const timer = setTimeout(() => {
        setAnimatedProgress((p) => Math.min(p + 3, computedProgress));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [computedProgress, animatedProgress]);

  const current = generationSteps.find((s) => s.status === "progress");
  const allDone = computedProgress >= 100;

  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1200); 
      return () => clearTimeout(timer);
    }
  }, [allDone, onComplete]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
            {allDone ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : (
              <Loader className="w-8 h-8 text-white animate-spin" />
            )}
          </div>
          <h3 className="text-2xl font-bold mb-2 text-gray-900">
            {allDone ? "Roadmap Ready!" : "Creating Your Roadmap"}
          </h3>
          <p className="text-gray-600">
            {allDone
              ? "✨ Your personalized roadmap is complete!"
              : current
              ? `🚀 ${current.label}...`
              : "Preparing your roadmap..."}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {generationSteps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  step.status === "completed"
                    ? "bg-green-500"
                    : step.status === "progress"
                    ? "bg-blue-500"
                    : "bg-gray-200"
                }`}
              >
                {step.status === "completed" ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : step.status === "progress" ? (
                  <Loader className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-white opacity-50" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{step.label}</p>
                <p className="text-xs text-gray-500 capitalize">{step.status}</p>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-gray-700">Overall Progress</span>
            <span className="font-bold text-blue-600">{animatedProgress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-700 transition-all duration-500 ease-out"
              style={{ width: `${animatedProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerationProgressModal;
