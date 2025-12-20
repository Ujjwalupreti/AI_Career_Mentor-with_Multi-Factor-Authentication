import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  getSkills,
  getRoadmaps,
  getLearningResources,
  getMentors,
  getUserProfile,
} from "../utils/api";

const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [resources, setResources] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [currentRoadmap, setCurrentRoadmap] = useState(null);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      if (!user) {
        setSkills([]);
        setRoadmaps([]);
        setResources([]);
        setMentors([]);
        setProfileData(null);
        setCurrentRoadmap(null);
        return;
      }

      try {
        const [skillsRes, roadmapsRes, resourcesRes, mentorsRes, profileRes] =
          await Promise.allSettled([
            getSkills(),
            getRoadmaps(),
            getLearningResources(),
            getMentors(),
            getUserProfile(),
          ]);

        if (!mounted) return;

        if (skillsRes.status === "fulfilled") setSkills(skillsRes.value || []);
        if (roadmapsRes.status === "fulfilled") setRoadmaps(roadmapsRes.value || []);
        if (resourcesRes.status === "fulfilled") setResources(resourcesRes.value || []);
        if (mentorsRes.status === "fulfilled") setMentors(mentorsRes.value || []);
        if (profileRes.status === "fulfilled") setProfileData(profileRes.value || null);

        if (roadmapsRes.status === "fulfilled" && roadmapsRes.value?.length) {
          setCurrentRoadmap(roadmapsRes.value[0]);
        }
      } catch (err) {
        console.error("AppProvider bootstrap error", err);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <AppContext.Provider
      value={{
        skills,
        setSkills,
        roadmaps,
        setRoadmaps,
        resources,
        setResources,
        mentors,
        setMentors,
        profileData,
        setProfileData,
        currentRoadmap,
        setCurrentRoadmap,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};