"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { createProjectRequest, listProjectsRequest, type Project } from "@/lib/project-api";

type LoadStatus = "loading" | "ready" | "error";
type NewProjectCredential = { projectId: string; projectName: string; apiKey: string };
type ProjectsContextValue = {
  projects: Project[];
  selectedProject: Project | null;
  status: LoadStatus;
  error: string;
  newCredential: NewProjectCredential | null;
  selectProject: (projectId: string) => void;
  createProject: (name: string) => Promise<void>;
  dismissCredential: () => void;
  reload: () => Promise<void>;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [newCredential, setNewCredential] = useState<NewProjectCredential | null>(null);
  const storageKey = user ? `inflowapm.active-project.${user.id}` : "";

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const nextProjects = await listProjectsRequest();
      setProjects(nextProjects);
      const storedId = storageKey ? window.sessionStorage.getItem(storageKey) : null;
      setSelectedId((current) => {
        const preferred = current ?? storedId;
        return nextProjects.some((project) => project.id === preferred) ? preferred : (nextProjects[0]?.id ?? null);
      });
      setStatus("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Projects could not be loaded.");
      setStatus("error");
    }
  }, [storageKey]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const selectProject = useCallback((projectId: string) => {
    if (!projects.some((project) => project.id === projectId)) return;
    setSelectedId(projectId);
    if (storageKey) window.sessionStorage.setItem(storageKey, projectId);
  }, [projects, storageKey]);

  const createProject = useCallback(async (name: string) => {
    const created = await createProjectRequest(name);
    const { api_key, ...safeProject } = created;
    setProjects((current) => [safeProject, ...current]);
    setSelectedId(safeProject.id);
    if (storageKey) window.sessionStorage.setItem(storageKey, safeProject.id);
    setNewCredential({ projectId: safeProject.id, projectName: safeProject.name, apiKey: api_key });
    setStatus("ready");
    setError("");
  }, [storageKey]);

  const selectedProject = projects.find((project) => project.id === selectedId) ?? null;
  const dismissCredential = useCallback(() => setNewCredential(null), []);
  const value = useMemo(() => ({ projects, selectedProject, status, error, newCredential, selectProject, createProject, dismissCredential, reload: load }), [createProject, dismissCredential, error, load, newCredential, projects, selectProject, selectedProject, status]);
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects(): ProjectsContextValue {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error("useProjects must be used within ProjectsProvider");
  return context;
}
