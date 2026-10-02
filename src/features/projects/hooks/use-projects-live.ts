"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { isNewer, removeFolder, removeProject, upsertFolder, upsertProject } from "../lib/cache";
import { liveUrl } from "../services/projects.service";
import type {
  LiveServerMessage,
  LiveStatus,
  PresenceMember,
  Project,
  ProjectFolder,
} from "../types/project.types";
import { projectKeys } from "./use-projects";

const PING_EVERY_MS = 20_000;
/** Waits between reconnects; the last one repeats until the server is back. */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000];

/** Close codes after which retrying gets the same answer. */
const TERMINAL_CLOSES: Record<number, LiveStatus> = {
  4401: "unauthenticated",
  4403: "forbidden",
  4404: "disabled",
};

export interface Focus {
  folderId: string | null;
  projectId: string | null;
}

/**
 * The area's live channel: applies other people's changes to the cached
 * lists as they happen, tells the server what this tab is looking at, and
 * returns who else is connected. The caller keys it by area slug, so one
 * mounted instance always talks to one area.
 */
export function useProjectsLive(slug: string, focus: Focus) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const focusRef = useRef(focus);

  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const foldersKey = projectKeys.folders(slug);
    const projectsKey = projectKeys.projects(slug);

    const refetchAll = () => {
      void queryClient.invalidateQueries({ queryKey: foldersKey });
      void queryClient.invalidateQueries({ queryKey: projectsKey });
    };

    // A read already in flight left the server before this event's write,
    // and would land after it and erase it. Asking again cancels that read
    // and starts one that includes the change.
    const keepIfFetching = (queryKey: readonly unknown[]) => {
      if (queryClient.isFetching({ queryKey }) > 0) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };

    const sendFocus = (socket: WebSocket) => {
      const { folderId, projectId } = focusRef.current;
      socket.send(JSON.stringify({ type: "focus", folder_id: folderId, project_id: projectId }));
    };

    const handle = (socket: WebSocket, message: LiveServerMessage) => {
      switch (message.type) {
        case "hello":
          attempt = 0;
          setConnectionId(message.connection_id);
          setMembers(message.members);
          setStatus("live");
          // Whatever happened while we were away is only in a fresh read.
          refetchAll();
          sendFocus(socket);
          return;
        case "folder.created":
        case "folder.updated":
          queryClient.setQueryData<ProjectFolder[]>(foldersKey, (list) =>
            upsertFolder(list, message.data)
          );
          keepIfFetching(foldersKey);
          return;
        case "folder.deleted":
          queryClient.setQueryData<ProjectFolder[]>(foldersKey, (list) =>
            removeFolder(list, message.data.id)
          );
          keepIfFetching(foldersKey);
          return;
        case "project.created":
        case "project.updated":
          // The version rule drops stale events and our own echo alike.
          queryClient.setQueryData<Project[]>(projectsKey, (list) =>
            isNewer(list, message.data) ? upsertProject(list, message.data) : list
          );
          keepIfFetching(projectsKey);
          return;
        case "project.deleted":
          queryClient.setQueryData<Project[]>(projectsKey, (list) =>
            removeProject(list, message.data.id)
          );
          keepIfFetching(projectsKey);
          return;
        case "presence":
          setMembers(message.members);
          return;
        case "sync.required":
          refetchAll();
          return;
        case "pong":
          return;
      }
    };

    const connect = () => {
      const socket = new WebSocket(liveUrl(slug));
      socketRef.current = socket;

      socket.onopen = () => {
        pingTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_EVERY_MS);
      };

      socket.onmessage = (event) => {
        let message: LiveServerMessage;
        try {
          message = JSON.parse(String(event.data)) as LiveServerMessage;
        } catch {
          return;
        }
        handle(socket, message);
      };

      socket.onclose = (event) => {
        clearInterval(pingTimer);
        if (socketRef.current === socket) socketRef.current = null;
        if (disposed) return;
        setConnectionId(null);
        setMembers([]);

        const terminal = TERMINAL_CLOSES[event.code];
        if (terminal) {
          setStatus(terminal);
          return;
        }
        // 4408 (idle), 1011, a dropped network: all worth another try.
        setStatus("connecting");
        const wait = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
        attempt += 1;
        retryTimer = setTimeout(connect, wait);
      };
    };

    connect();

    return () => {
      disposed = true;
      clearInterval(pingTimer);
      clearTimeout(retryTimer);
      socketRef.current?.close(1000);
      socketRef.current = null;
    };
  }, [slug, queryClient]);

  // Navigation and opening a project announce themselves; the server only
  // rebroadcasts presence when the pair actually changes.
  const { folderId, projectId } = focus;
  useEffect(() => {
    focusRef.current = { folderId, projectId };
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "focus", folder_id: folderId, project_id: projectId }));
    }
  }, [folderId, projectId]);

  return { status, members, connectionId };
}

export interface PresentPerson {
  userId: string;
  name: string;
  email: string | null;
}

/**
 * Presence is per connection; people are per user. Two tabs of the same
 * person count once, and this tab's own user is left out: a list of who is
 * here is about everyone else.
 */
export function presentPeople(
  members: PresenceMember[],
  selfUserId: string | undefined,
  where?: (member: PresenceMember) => boolean
): PresentPerson[] {
  const people = new Map<string, PresentPerson>();
  for (const member of members) {
    if (member.user_id === selfUserId) continue;
    if (where && !where(member)) continue;
    if (people.has(member.user_id)) continue;
    people.set(member.user_id, {
      userId: member.user_id,
      name: member.display_name || member.email || "Usuario sin nombre",
      email: member.email,
    });
  }
  return [...people.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}
