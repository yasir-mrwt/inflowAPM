import { apiRequest } from "@/lib/auth-api";

export type Project = { id: string; name: string; user_id: string; created_at: string };
export type CreatedProject = Project & { api_key: string };

export async function listProjectsRequest(): Promise<Project[]> {
  const response = await apiRequest<{ success: boolean; total_count: number; data: Project[] }>("/api/v1/projects?all=true");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createProjectRequest(name: string): Promise<CreatedProject> {
  const response = await apiRequest<{ success: boolean; data: CreatedProject }>("/api/v1/projects", { method: "POST", body: JSON.stringify({ name }) });
  return response.data;
}
