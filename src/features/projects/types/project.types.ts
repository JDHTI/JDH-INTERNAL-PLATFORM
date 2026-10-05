export const PROJECT_STATUSES = [
  "created",
  "ideation",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PRIORITIES = ["low", "medium", "high"] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

/** Palette keys, not hex: globals.css maps each to a `--project-<key>` token. */
export const PROJECT_COLORS = [
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;
export type ProjectColor = (typeof PROJECT_COLORS)[number];

export interface CatalogOption {
  value: string;
  label: string;
}

/**
 * Scrumban flow. `backlog` is the project's waiting list and has its own
 * board; the other four are the main board's columns. Leaving the backlog is
 * a status change on the same record, never a copy.
 */
export const TASK_STATUSES = [
  "backlog",
  "in_progress",
  "pending_validation",
  "blocked",
  "done",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const BACKLOG_STATUS: TaskStatus = "backlog";
/** Where a task lands when it is pulled out of the backlog. */
export const PULL_STATUS: TaskStatus = "in_progress";

export interface ProjectCatalog {
  statuses: CatalogOption[];
  priorities: CatalogOption[];
  colors: CatalogOption[];
  /** Backlog first, then the main board's columns, in order. */
  task_statuses?: CatalogOption[];
}

/**
 * Who may delete permanently. Not a flag on each item: those payloads also
 * go out over the live channel to everyone, so a per-viewer field would be
 * wrong for every other client.
 */
export interface ProjectAccess {
  email: string;
  /** The area's manager and platform admins. */
  can_delete_any: boolean;
}

export interface Person {
  id: string;
  email: string | null;
  display_name: string | null;
}

export interface ProjectFolder {
  id: string;
  area_id: string;
  name: string;
  description: string | null;
  color: string;
  /** Active projects only, as the API counts them. */
  project_count: number;
  /** Email of whoever created it. */
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  area_id: string;
  folder_id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  priority: string;
  /** "YYYY-MM-DD" */
  start_date: string;
  end_date: string | null;
  owner: Person | null;
  /** Sort key inside the folder; a drop sends the midpoint of its neighbours. */
  position: number;
  is_archived: boolean;
  archived_at: string | null;
  /** Grows on every write; a live event older than what we hold is stale. */
  version: number;
  /** Tasks in total and done; they move the version (and updated_at) too. */
  task_count?: number;
  done_count?: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Groups a project's tasks around one outcome. It has no status or column of
 * its own: its progress is counted from its tasks.
 */
export interface ProjectEpic {
  id: string;
  area_id: string;
  project_id: string;
  name: string;
  description: string | null;
  color: string;
  start_date: string | null;
  end_date: string | null;
  position: number;
  task_count: number;
  done_count: number;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  area_id: string;
  project_id: string;
  /** Optional: a task can wait in the backlog without belonging to an epic. */
  epic_id: string | null;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  owner: Person | null;
  start_date: string | null;
  end_date: string | null;
  /** Order inside its column (project + status); the backlog has its own. */
  position: number;
  /** Only kept while the status is `blocked`. */
  blocked_reason: string | null;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface EpicInput {
  name?: string;
  description?: string | null;
  color?: string;
  start_date?: string | null;
  end_date?: string | null;
  position?: number;
}

export interface CreateTaskInput {
  epic_id?: string | null;
  name: string;
  description?: string | null;
  /** The API files a new task in the backlog when this is left out. */
  status?: string;
  priority?: string;
  owner_user_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface UpdateTaskInput {
  /** `null` takes the task out of its epic. */
  epic_id?: string | null;
  name?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  owner_user_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  position?: number;
  /** Up to 500 characters; the API drops it when the status leaves `blocked`. */
  blocked_reason?: string | null;
}

export interface FolderInput {
  name: string;
  description?: string | null;
  color?: string | null;
}

export interface CreateProjectInput {
  folder_id: string;
  name: string;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
  color?: string | null;
  status?: string;
  priority?: string;
  owner_user_id?: string | null;
}

/** Only what changes; `null` clears description, end date and owner. */
export interface UpdateProjectInput {
  folder_id?: string;
  name?: string;
  description?: string | null;
  color?: string;
  status?: string;
  priority?: string;
  start_date?: string;
  end_date?: string | null;
  owner_user_id?: string | null;
  position?: number;
}

// ── Live channel ──

export interface LiveActor {
  user_id: string;
  email: string | null;
  display_name: string | null;
}

export interface PresenceMember {
  connection_id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  folder_id: string | null;
  project_id: string | null;
}

export type LiveServerMessage =
  | {
      type: "hello";
      area_id: string;
      connection_id: string;
      members: PresenceMember[];
      presence_ttl: number;
    }
  | {
      type: "folder.created" | "folder.updated";
      data: ProjectFolder;
      actor: LiveActor;
      at: string;
      changed?: string[];
    }
  | { type: "folder.deleted"; data: { id: string } }
  | {
      type: "project.created" | "project.updated";
      data: Project;
      actor: LiveActor;
      at: string;
      changed?: string[];
    }
  | { type: "project.deleted"; data: { id: string; folder_id: string } }
  | {
      type: "epic.created" | "epic.updated";
      data: ProjectEpic;
      actor: LiveActor;
      at: string;
      changed?: string[];
    }
  | { type: "epic.deleted"; data: { id: string; project_id: string } }
  | {
      type: "task.created" | "task.updated";
      data: ProjectTask;
      actor: LiveActor;
      at: string;
      changed?: string[];
    }
  | { type: "task.deleted"; data: { id: string; project_id: string; epic_id: string | null } }
  | { type: "presence"; members: PresenceMember[] }
  | { type: "sync.required" }
  | { type: "pong" };

/**
 * `connecting` covers the first attempt and every reconnect. The three
 * terminal states stop retrying: retrying would get the same answer.
 */
export type LiveStatus =
  | "connecting"
  | "live"
  | "unauthenticated"
  | "forbidden"
  | "disabled";
