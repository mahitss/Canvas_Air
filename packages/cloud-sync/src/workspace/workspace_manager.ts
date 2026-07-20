import { IWorkspaceManager } from "../interfaces";
import { WorkspaceMetadata } from "../domain";
import { WorkspaceException } from "../errors";

export class WorkspaceManager implements IWorkspaceManager {
  private readonly workspaces = new Map<string, WorkspaceMetadata>();
  private activeWorkspaceId: string | null = null;

  public async createWorkspace(name: string): Promise<WorkspaceMetadata> {
    if (!name) {
      throw new WorkspaceException("Workspace name cannot be empty");
    }

    const id = `ws-${Math.random().toString(36).substr(2, 9)}`;
    const meta: WorkspaceMetadata = {
      id,
      name,
      isFavorite: false,
      isArchived: false,
      lastOpenedAt: Date.now(),
      updatedAt: Date.now()
    };

    this.workspaces.set(id, meta);
    return meta;
  }

  public async openWorkspace(id: string): Promise<void> {
    const ws = this.workspaces.get(id);
    if (!ws) {
      throw new WorkspaceException(`Workspace ID not found: ${id}`);
    }
    if (ws.isArchived) {
      throw new WorkspaceException(`Cannot open archived workspace: ${id}`);
    }

    ws.lastOpenedAt = Date.now();
    this.activeWorkspaceId = id;
  }

  public async renameWorkspace(id: string, newName: string): Promise<void> {
    if (!newName) {
      throw new WorkspaceException("New name cannot be empty");
    }
    const ws = this.workspaces.get(id);
    if (!ws) {
      throw new WorkspaceException(`Workspace ID not found: ${id}`);
    }
    ws.name = newName;
    ws.updatedAt = Date.now();
  }

  public async archiveWorkspace(id: string): Promise<void> {
    const ws = this.workspaces.get(id);
    if (!ws) {
      throw new WorkspaceException(`Workspace ID not found: ${id}`);
    }
    ws.isArchived = true;
    ws.updatedAt = Date.now();
  }

  public async deleteWorkspace(id: string): Promise<void> {
    if (this.activeWorkspaceId === id) {
      this.activeWorkspaceId = null;
    }
    this.workspaces.delete(id);
  }

  public async toggleFavorite(id: string): Promise<void> {
    const ws = this.workspaces.get(id);
    if (!ws) {
      throw new WorkspaceException(`Workspace ID not found: ${id}`);
    }
    ws.isFavorite = !ws.isFavorite;
    ws.updatedAt = Date.now();
  }

  public async getRecentWorkspaces(): Promise<WorkspaceMetadata[]> {
    return Array.from(this.workspaces.values())
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  }

  public getActiveWorkspaceId(): string | null {
    return this.activeWorkspaceId;
  }
}
