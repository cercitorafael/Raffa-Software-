import { useState, useEffect, useRef, useCallback } from 'react';

export interface GoalPersistencePayload {
  valoresManuais: number[];
  vendasRealizadas: number[];
  historicoValores: number[];
  resultado: any;
  estrategia: string;
  anoReferencia: number;
  updatedAt: string;
}

export function useGoalPersistence(
  anoReferencia: number,
  initialPayload: GoalPersistencePayload,
  debounceMs: number = 400
) {
  const storageKey = `agro_sales_goals_v2_${anoReferencia}`;
  const backupKey = `agro_sales_goals_backup_${anoReferencia}`;

  const [state, setState] = useState<GoalPersistencePayload>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...initialPayload,
            ...parsed,
          };
        }
      }
    } catch (e) {
      console.warn('[useGoalPersistence] Erro ao carregar localStorage:', e);
    }
    return initialPayload;
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [hasManualBackup, setHasManualBackup] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(backupKey));
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const latestStateRef = useRef<GoalPersistencePayload>(state);
  latestStateRef.current = state;

  // Executa a persistência síncrona
  const persistNow = useCallback((payloadToSave: GoalPersistencePayload) => {
    try {
      setSaveStatus('saving');
      const json = JSON.stringify({
        ...payloadToSave,
        updatedAt: new Date().toISOString(),
      });
      localStorage.setItem(storageKey, json);
      const timeStr = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTimestamp(timeStr);
      setSaveStatus('saved');
    } catch (err) {
      console.error('[useGoalPersistence] Falha ao persistir no localStorage:', err);
      setSaveStatus('idle');
    }
  }, [storageKey]);

  // Atualização com debounce automático
  const updatePayload = useCallback((
    updater: Partial<GoalPersistencePayload> | ((prev: GoalPersistencePayload) => GoalPersistencePayload)
  ) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      latestStateRef.current = next;

      setSaveStatus('saving');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        persistNow(latestStateRef.current);
      }, debounceMs);

      return next;
    });
  }, [debounceMs, persistNow]);

  // Salvar backup de segurança antes de sobrescrever com IA
  const saveManualBackup = useCallback(() => {
    try {
      const backupData = JSON.stringify({
        state: latestStateRef.current,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(backupKey, backupData);
      setHasManualBackup(true);
    } catch (e) {
      console.error('[useGoalPersistence] Erro ao salvar backup:', e);
    }
  }, [backupKey]);

  // Restaurar rascunho manual do backup
  const restoreManualBackup = useCallback((): GoalPersistencePayload | null => {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (backupData) {
        const parsed = JSON.parse(backupData);
        if (parsed?.state) {
          setState(parsed.state);
          persistNow(parsed.state);
          return parsed.state;
        }
      }
    } catch (e) {
      console.error('[useGoalPersistence] Erro ao restaurar backup:', e);
    }
    return null;
  }, [backupKey, persistNow]);

  // Limpeza de timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    state,
    updatePayload,
    persistNow: () => persistNow(latestStateRef.current),
    saveStatus,
    lastSavedTimestamp,
    saveManualBackup,
    restoreManualBackup,
    hasManualBackup,
    storageKey,
  };
}
