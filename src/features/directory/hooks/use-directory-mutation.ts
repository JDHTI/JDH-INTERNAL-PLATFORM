"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { errorMessage } from "@/shared/lib/api-client";

import { directoryKeys } from "./use-directory";

/** Keeps the API's message for the dialog that caused it; a success refreshes public and admin lists. */
export function useDirectoryMutation() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(label: string, action: () => Promise<T>, success?: string) {
    setBusy(label);
    setError(null);
    try {
      const result = await action();
      await queryClient.invalidateQueries({ queryKey: directoryKeys.all });
      if (success) toast.success(success);
      return { ok: true as const, result };
    } catch (cause) {
      setError(errorMessage(cause));
      return { ok: false as const };
    } finally {
      setBusy(null);
    }
  }

  return { busy, error, setError, run };
}
