/**
 * PERFORMANCE MONITORING UTILITY
 * 
 * This utility helps track app performance metrics to identify bottlenecks.
 * Useful for monitoring render times, API calls, and user interactions.
 * 
 * Features:
 * - Track operation duration
 * - Log slow operations
 * - Measure component render times
 * - Monitor API response times
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private slowThreshold: number = 1000; // 1 second default

  /**
   * Start timing an operation
   */
  start(operation: string): void {
    this.timers.set(operation, Date.now());
  }

  /**
   * End timing an operation and log the duration
   */
  end(operation: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);

    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Log slow operations
    if (duration > this.slowThreshold) {
      console.warn(`⚠️ Slow operation detected: ${operation} took ${duration}ms`, metadata);
    } else {
      console.log(`✅ ${operation} completed in ${duration}ms`);
    }

    return duration;
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(operation);
    try {
      const result = await fn();
      this.end(operation, metadata);
      return result;
    } catch (error) {
      this.end(operation, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific operation
   */
  getMetricsForOperation(operation: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.operation === operation);
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operation: string): number {
    const operationMetrics = this.getMetricsForOperation(operation);
    if (operationMetrics.length === 0) return 0;

    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }

  /**
   * Get slow operations
   */
  getSlowOperations(threshold?: number): PerformanceMetric[] {
    const limit = threshold || this.slowThreshold;
    return this.metrics.filter(m => m.duration > limit);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Set slow operation threshold
   */
  setSlowThreshold(ms: number): void {
    this.slowThreshold = ms;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalOperations: number;
    slowOperations: number;
    averageDuration: number;
    operations: Record<string, { count: number; avgDuration: number }>;
  } {
    const operations: Record<string, { count: number; avgDuration: number }> = {};

    this.metrics.forEach(metric => {
      if (!operations[metric.operation]) {
        operations[metric.operation] = {
          count: 0,
          avgDuration: 0,
        };
      }

      const op = operations[metric.operation];
      const newCount = op.count + 1;
      op.avgDuration = (op.avgDuration * op.count + metric.duration) / newCount;
      op.count = newCount;
    });

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = this.metrics.length > 0 ? totalDuration / this.metrics.length : 0;

    return {
      totalOperations: this.metrics.length,
      slowOperations: this.getSlowOperations().length,
      averageDuration: avgDuration,
      operations,
    };
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    const summary = this.getSummary();
    console.log('\n📊 Performance Summary:');
    console.log(`Total Operations: ${summary.totalOperations}`);
    console.log(`Slow Operations: ${summary.slowOperations}`);
    console.log(`Average Duration: ${summary.averageDuration.toFixed(2)}ms`);
    console.log('\nOperations Breakdown:');
    Object.entries(summary.operations).forEach(([name, stats]) => {
      console.log(`  ${name}: ${stats.count} calls, avg ${stats.avgDuration.toFixed(2)}ms`);
    });
    console.log('\n');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export hook for React components
export const usePerformanceMonitor = () => {
  return {
    start: (operation: string) => performanceMonitor.start(operation),
    end: (operation: string, metadata?: Record<string, any>) => 
      performanceMonitor.end(operation, metadata),
    measure: <T,>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>) =>
      performanceMonitor.measure(operation, fn, metadata),
  };
};
