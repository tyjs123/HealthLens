'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AbnormalItem, NormalItem, HistoryReport, CoreMetrics } from '@/types';
import { saveReport, extractCoreMetrics, getHistory, deleteReport as deleteFromStorage, clearAll as clearStorage } from '@/lib/storage';

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
  saveToHistory: () => void;
  history: HistoryReport[];
  deleteFromHistory: (id: string) => void;
  clearHistory: () => void;
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
  const [history, setHistory] = useState<HistoryReport[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

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

  const saveToHistory = useCallback(() => {
    if (!state.summary) return;

    const coreMetrics = extractCoreMetrics(state.abnormalItems, state.normalItems);
    const report: HistoryReport = {
      id: `${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`,
      date: state.reportDate?.trim() || new Date().toISOString().split('T')[0],
      institution: state.institution,
      summary: state.summary,
      abnormalCount: state.abnormalItems.length,
      coreMetrics,
      fullData: {
        summary: state.summary,
        abnormalItems: state.abnormalItems,
        normalItems: state.normalItems,
      },
    };

    saveReport(report);
    setHistory(getHistory());
  }, [state]);

  const deleteFromHistory = useCallback((id: string) => {
    deleteFromStorage(id);
    setHistory(getHistory());
  }, []);

  const clearHistory = useCallback(() => {
    clearStorage();
    setHistory([]);
  }, []);

  return (
    <ReportContext.Provider value={{ state, setReport, clearReport, setLoading, setError, saveToHistory, history, deleteFromHistory, clearHistory }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useReport must be used within ReportProvider');
  return ctx;
}
