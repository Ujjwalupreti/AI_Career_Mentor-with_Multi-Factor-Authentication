import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import {
  getRoadmaps,
  getRoadmapDetail,
  generateRoadmap,
  deleteRoadmap,
} from "../utils/api";
import MyPathsView from "../components/pathbuilder/MyPathsView";
import ConversationalCreator from "../components/pathbuilder/ConversationalCreator";
import RoadmapViewer from "../components/pathbuilder/RoadmapViewer";
import GenerationProgressModal from "../components/pathbuilder/GenerationProgressModal";

const PathBuilderPage = () => {
  const { currentRoadmap, setCurrentRoadmap, profileData } = useAppContext();
  const [view, setView] = useState("mypaths");
  const [roadmaps, setRoadmaps] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState([]);
  const [formData, setFormData] = useState({
    targetRole: "",
    level: "Entry-level",
    timeline: 6,
  });

  const fetchRoadmaps = async () => {
    try {
      const res = await getRoadmaps();
      setRoadmaps(res?.roadmaps || []);
    } catch (err) {
      console.error("Failed to fetch roadmaps:", err);
    }
  };

  useEffect(() => {
    fetchRoadmaps();
    if (profileData?.target_role && !formData.targetRole) {
      setFormData((f) => ({ ...f, targetRole: profileData.target_role }));
    }
  }, [profileData]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this roadmap permanently?")) return;
    try {
      await deleteRoadmap(id);
      await fetchRoadmaps();
      if (currentRoadmap && currentRoadmap.roadmap_id === id) {
        setCurrentRoadmap(null);
        setView("mypaths");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleOpen = async (roadmap) => {
    try {
      const detail = await getRoadmapDetail(roadmap.roadmap_id);
      setCurrentRoadmap(detail);
      setView("roadmap");
    } catch (err) {
      console.error("Failed to load roadmap:", err);
      alert("Failed to load roadmap details.");
    }
  };

  const handleGenerate = async () => {
    if (!formData.targetRole) return alert("Please enter a target role first.");

    setGenerating(true);
    setGenerationSteps([
      { label: "Analyzing resume & profile", status: "progress" },
      { label: "Building curriculum", status: "pending" },
      { label: "Generating skills & jobs", status: "pending" },
      { label: "Saving roadmap", status: "pending" },
    ]);

    const updateStep = (index, newStatus) => {
      setGenerationSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, status: newStatus } : s))
      );
    };

    try {
      await new Promise((r) => setTimeout(r, 700));
      updateStep(0, "completed");
      updateStep(1, "progress");

      
      const payload = await generateRoadmap(
  formData.targetRole, 
  formData.timeline, 
  formData.level,
  formData.location 
);

      updateStep(1, "completed");
      updateStep(2, "progress");

      const roadmap = payload.roadmap || payload;
      updateStep(2, "completed");
      updateStep(3, "progress");

      
      await new Promise((r) => setTimeout(r, 600));
      updateStep(3, "completed");

      setCurrentRoadmap(roadmap);
      await fetchRoadmaps();
      setView("roadmap");
    } catch (err) {
      console.error("Roadmap generation failed:", err);
      alert("Roadmap generation failed!");
    } finally {
      setTimeout(() => {
        setGenerating(false);
      }, 600);
    }
  };

  
  const handleRegenerate = async (oldRoadmap) => {
    if (!window.confirm("Regenerate a fresh roadmap using the same settings?")) return;

    setGenerating(true);
    setGenerationSteps([
      { label: "Starting regeneration...", status: "progress" },
      { label: "Building new curriculum", status: "pending" },
      { label: "Generating skills & jobs", status: "pending" },
      { label: "Finalizing", status: "pending" },
    ]);

    const updateStep = (index, newStatus) => {
      setGenerationSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, status: newStatus } : s))
      );
    };

    try {
      updateStep(0, "completed");
      updateStep(1, "progress");

      const oldMeta = oldRoadmap.metadata || {};
      const targetRole = oldRoadmap.target_role || oldMeta.target_role || oldRoadmap.metadata?.target_role || formData.targetRole;
      const timeline = oldMeta.timeline_months || oldRoadmap.timeline_months || formData.timeline;
      const level = oldMeta.career_level || oldRoadmap.career_level || formData.level;

      if (!targetRole) {
        alert("Could not find target role. Cannot regenerate.");
        setGenerating(false);
        return;
      }

      const payload = await generateRoadmap(targetRole, timeline, level);
      updateStep(1, "completed");
      updateStep(2, "progress");

      
      try {
        await deleteRoadmap(oldRoadmap.roadmap_id);
      } catch (e) {
        
        console.warn("Failed to delete old roadmap during regeneration:", e);
      }

      updateStep(2, "completed");
      updateStep(3, "progress");

      const newRoadmap = payload.roadmap || payload;
      await new Promise((r) => setTimeout(r, 500));
      updateStep(3, "completed");

      setCurrentRoadmap(newRoadmap);
      await fetchRoadmaps();
      setView("roadmap");
    } catch (err) {
      console.error("Roadmap regeneration failed:", err);
      alert("Roadmap regeneration failed!");
    } finally {
      setTimeout(() => {
        setGenerating(false);
      }, 600);
    }
  };

  return (
    <div className="space-y-6">
      {generating && <GenerationProgressModal generationSteps={generationSteps} />}

      {view === "mypaths" && (
        <MyPathsView
          roadmaps={roadmaps}
          onRefresh={fetchRoadmaps}
          onDelete={handleDelete}
          onOpen={handleOpen}
          setView={setView}
        />
      )}

      {view === "create" && (
        <ConversationalCreator formData={formData} setFormData={setFormData} onGenerate={handleGenerate} onBack={() => setView("mypaths")}/>
      )}

      {view === "roadmap" && currentRoadmap && (
        <RoadmapViewer setView={setView} currentRoadmap={currentRoadmap} onRegenerate={handleRegenerate} />
      )}
    </div>
  );
};

export default PathBuilderPage;