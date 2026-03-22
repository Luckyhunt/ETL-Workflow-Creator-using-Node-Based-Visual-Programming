import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type JobStatus = 'idle' | 'running' | 'success' | 'failed';

export interface JobState {
  jobId: string | null;
  workflowId: string | null;
  status: JobStatus;
  progress: number;
  logs: string[];
  error?: string;
  result?: any;
}

interface JobContextType {
  jobState: JobState;
  startJob: (workflowId: string) => void;
  updateJob: (updates: Partial<JobState>) => void;
  clearJob: () => void;
  appendLog: (log: string) => void;
}

const defaultState: JobState = {
  jobId: null,
  workflowId: null,
  status: 'idle',
  progress: 0,
  logs: []
};

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [jobState, setJobState] = useState<JobState>(defaultState);

  // Sync state cleanly, mock saving to session if needed for navigation persistence
  useEffect(() => {
    // In a real app we'd sync this with session storage or local storage
    // so navigating between Dashboard and Playground doesn't lose the floating job status.
    const stored = sessionStorage.getItem('etl_job_state');
    if (stored) {
      try { setJobState(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('etl_job_state', JSON.stringify(jobState));
  }, [jobState]);

  const startJob = (workflowId: string) => {
    const newId = `job-${Date.now()}`;
    setJobState({
      jobId: newId,
      workflowId,
      status: 'running',
      progress: 0,
      logs: [`Started job ${newId} for workflow ${workflowId}`]
    });
  };

  const updateJob = (updates: Partial<JobState>) => {
    setJobState(prev => ({ ...prev, ...updates }));
  };

  const clearJob = () => {
    setJobState(defaultState);
  };
  
  const appendLog = (log: string) => {
    setJobState(prev => ({
        ...prev,
        logs: [...prev.logs, log]
    }));
  }

  return (
    <JobContext.Provider value={{ jobState, startJob, updateJob, clearJob, appendLog }}>
      {children}
    </JobContext.Provider>
  );
};

export const useJob = () => {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJob must be used within a JobProvider');
  }
  return context;
};
