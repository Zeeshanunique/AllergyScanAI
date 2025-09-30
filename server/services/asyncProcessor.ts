import { analyzeIngredients, type AnalysisResult } from "./gemini";
import { getBarcodeData } from "./foodApi";
import { storage } from "../database";

interface ProcessingJob {
  id: string;
  userId: string;
  type: 'barcode' | 'manual';
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// In-memory job queue for development (in production, use Redis or similar)
class JobQueue {
  private jobs = new Map<string, ProcessingJob>();
  private processing = new Set<string>();

  async addJob(job: Omit<ProcessingJob, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const fullJob: ProcessingJob = {
      ...job,
      id,
      status: 'pending',
      createdAt: new Date()
    };

    this.jobs.set(id, fullJob);

    // Process immediately in background
    this.processJob(id).catch(error => {
      console.error(`Job ${id} failed:`, error);
      this.updateJobStatus(id, 'failed', undefined, error.message);
    });

    return id;
  }

  async getJob(id: string): Promise<ProcessingJob | undefined> {
    return this.jobs.get(id);
  }

  private async processJob(jobId: string): Promise<void> {
    if (this.processing.has(jobId)) return;

    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') return;

    this.processing.add(jobId);
    this.updateJobStatus(jobId, 'processing');

    try {
      let result: any;

      if (job.type === 'barcode') {
        result = await this.processBarcodeJob(job);
      } else if (job.type === 'manual') {
        result = await this.processManualJob(job);
      }

      this.updateJobStatus(jobId, 'completed', result);
    } catch (error: any) {
      this.updateJobStatus(jobId, 'failed', undefined, error.message);
    } finally {
      this.processing.delete(jobId);
    }
  }

  private async processBarcodeJob(job: ProcessingJob): Promise<any> {
    const { barcode } = job.data;

    // Step 1: Get product data (can be cached)
    const productData = await getBarcodeData(barcode);

    // Step 2: Get user profile
    const user = await storage.getUser(job.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Step 3: Analyze ingredients with AI
    const analysisResult = await analyzeIngredients(
      productData.ingredients,
      user.allergies || [],
      user.medications || []
    );

    // Step 4: Save to database
    const scanData = {
      userId: job.userId,
      productName: productData.productName,
      barcode,
      ingredients: productData.ingredients,
      analysisResult
    };

    const scan = await storage.createScanHistory(scanData);

    return {
      scan,
      productData,
      analysisResult
    };
  }

  private async processManualJob(job: ProcessingJob): Promise<any> {
    const { ingredients, productName } = job.data;

    // Step 1: Get user profile
    const user = await storage.getUser(job.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Step 2: Analyze ingredients with AI
    const analysisResult = await analyzeIngredients(
      ingredients,
      user.allergies || [],
      user.medications || []
    );

    // Step 3: Save to database
    const scanData = {
      userId: job.userId,
      productName: productName || "Manual Entry",
      ingredients,
      analysisResult
    };

    const scan = await storage.createScanHistory(scanData);

    return {
      scan,
      analysisResult
    };
  }

  private updateJobStatus(
    jobId: string,
    status: ProcessingJob['status'],
    result?: any,
    error?: string
  ): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      if (result) job.result = result;
      if (error) job.error = error;
      if (status === 'completed' || status === 'failed') {
        job.completedAt = new Date();
      }
      this.jobs.set(jobId, job);
    }
  }

  // Cleanup completed jobs older than 1 hour
  cleanup(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [id, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt < oneHourAgo
      ) {
        this.jobs.delete(id);
      }
    }
  }

  // Get job statistics
  getStats(): { pending: number; processing: number; completed: number; failed: number } {
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };

    for (const job of this.jobs.values()) {
      stats[job.status]++;
    }

    return stats;
  }
}

// Global job queue instance
export const jobQueue = new JobQueue();

// Background cleanup every 10 minutes
setInterval(() => {
  jobQueue.cleanup();
}, 10 * 60 * 1000);

// Async processing functions
export async function processBarcodeScanAsync(
  userId: string,
  barcode: string
): Promise<string> {
  return jobQueue.addJob({
    userId,
    type: 'barcode',
    data: { barcode }
  });
}

export async function processManualScanAsync(
  userId: string,
  ingredients: string[],
  productName?: string
): Promise<string> {
  return jobQueue.addJob({
    userId,
    type: 'manual',
    data: { ingredients, productName }
  });
}

export async function getJobResult(jobId: string): Promise<ProcessingJob | undefined> {
  return jobQueue.getJob(jobId);
}

export function getQueueStats() {
  return jobQueue.getStats();
}