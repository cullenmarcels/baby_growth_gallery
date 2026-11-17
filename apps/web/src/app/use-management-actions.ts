import type { IssuedPassword } from '@baby-growth-gallery/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { userFacingError } from './user-facing-error';

export function useManagementActions() {
  const queryClient = useQueryClient();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [issued, setIssued] = useState<IssuedPassword>();
  async function act(operation: () => Promise<void | IssuedPassword>, message: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    setIssued(undefined);
    try {
      const result = await operation();
      if (result) setIssued(result);
      setNotice(message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['management'] }),
        queryClient.invalidateQueries({ queryKey: ['families'] }),
        queryClient.invalidateQueries({ queryKey: ['family'] }),
      ]);
    } catch (failure) {
      setError(userFacingError(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function clearFeedback() {
    setError(undefined);
    setNotice(undefined);
  }

  return {
    act,
    busy,
    error,
    notice,
    issued,
    clearFeedback,
    clearIssued: () => setIssued(undefined),
  };
}
