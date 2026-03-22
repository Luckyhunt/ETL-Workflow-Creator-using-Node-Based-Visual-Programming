import type { JobState } from '../contexts/JobContext';

interface PollerOptions {
  jobId: string;
  workflowId: string;
  onUpdate: (state: Partial<JobState>) => void;
  maxRetries?: number;
  initialInterval?: number;
}

export class JobPoller {
  private activeJobs = new Map<string, number>();

  public async startPolling({
    jobId,
    workflowId,
    onUpdate,
    maxRetries = 10,
    initialInterval = 2000
  }: PollerOptions) {
    if (this.activeJobs.has(jobId)) return;

    let retryCount = 0;
    let interval = initialInterval;

    const poll = async () => {
      try {
        // In reality, this hits the real API endpoint `workflowApi.getJobStatus(jobId)`
        // For demonstration, simulating network behavior
        onUpdate({ 
          progress: Math.min(100, retryCount * 15),
          logs: [`Fetching status... attempt ${retryCount + 1}`]
        });

        // Simulate a job finishing or failing
        if (retryCount >= 6) {
          onUpdate({ status: 'success', progress: 100, logs: ['Job completed successfully!'] });
          this.stopPolling(jobId);
          return;
        }

        retryCount++;
        // Exponential backoff
        interval = Math.min(interval * 1.5, 30000); 

        const timer = window.setTimeout(poll, interval);
        this.activeJobs.set(jobId, timer);

      } catch (err: any) {
        if (retryCount >= maxRetries) {
          onUpdate({ status: 'failed', error: 'Max retries reached. Job failed.' });
          this.stopPolling(jobId);
        } else {
            retryCount++;
            const timer = window.setTimeout(poll, interval);
            this.activeJobs.set(jobId, timer);
        }
      }
    };

    const initialTimer = window.setTimeout(poll, interval);
    this.activeJobs.set(jobId, initialTimer);
  }

  public stopPolling(jobId: string) {
    const timer = this.activeJobs.get(jobId);
    if (timer) {
      window.clearTimeout(timer);
      this.activeJobs.delete(jobId);
    }
  }
}

export const jobPollerService = new JobPoller();
