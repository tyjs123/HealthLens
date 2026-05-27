'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AbnormalItem, NormalItem } from '@/types';

interface ReportState {
  rawText: string;
  summary: string;
  abnormalItems: AbnormalItem[];
  normalItems: NormalItem[];
  reportDate: string;
  institution: string;
  isLoading: boolean;
  error: string | null;
  fileName: string;
}

interface ReportContextType {
  state: ReportState;
  setReport: (data: Partial<ReportState>) => void;
  clearReport: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultState: ReportState = {
  rawText: '',
  summary: '',
  abnormalItems: [],
  normalItems: [],
  reportDate: '',
  institution: '',
  isLoading: false,
  error: null,
  fileName: '',
};

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ReportState>(defaultState);

  const setReport = useCallback((data: Partial<ReportState>) => {
    setState((prev) => ({ ...prev, ...data, error: null }));
  }, []);

  const clearReport = useCallback(() => {
    setState(defaultState);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error, isLoading: false }));
  }, []);

  return (
    <ReportContext.Provider value={{ state, setReport, clearReport, setLoading, setError }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useReport must be used within ReportProvider');
  return ctx;
}
