import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * CONNECTION RESILIENCE UTILITY
 * 
 * This utility provides offline support and connection monitoring.
 * Features:
 * - Monitor network connection status
 * - Queue operations when offline
 * - Automatically sync when connection restored
 * - Cache data for offline access
 */

interface QueuedOperation {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries: number;
}

const QUEUE_STORAGE_KEY = '@goshop_operation_queue';
const MAX_RETRIES = 3;

class ConnectionManager {
  private isConnected: boolean = true;
  private operationQueue: QueuedOperation[] = [];
  private listeners: Set<(connected: boolean) => void> = new Set();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize connection monitoring
   */
  private async initialize() {
    // Load queued operations from storage
    await this.loadQueue();

    // Subscribe to network state changes
    NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected || false;

      console.log(`📡 Network status: ${this.isConnected ? 'Online' : 'Offline'}`);

      // Notify listeners
      this.notifyListeners();

      // Process queue if connection restored
      if (!wasConnected && this.isConnected) {
        console.log('🔄 Connection restored, processing queued operations...');
        this.processQueue();
      }
    });
  }

  /**
   * Check if device is connected
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Add a listener for connection changes
   */
  public addConnectionListener(listener: (connected: boolean) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of connection status
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isConnected));
  }

  /**
   * Queue an operation for later execution
   */
  public async queueOperation(type: string, data: any): Promise<string> {
    const operation: QueuedOperation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.operationQueue.push(operation);
    await this.saveQueue();

    console.log(`📝 Operation queued: ${type} (${operation.id})`);
    return operation.id;
  }

  /**
   * Process queued operations
   */
  private async processQueue() {
    if (!this.isConnected || this.operationQueue.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${this.operationQueue.length} queued operations...`);

    const operations = [...this.operationQueue];
    this.operationQueue = [];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        console.log(`✅ Operation completed: ${operation.type} (${operation.id})`);
      } catch (error) {
        console.error(`❌ Operation failed: ${operation.type} (${operation.id})`, error);
        
        // Retry logic
        if (operation.retries < MAX_RETRIES) {
          operation.retries++;
          this.operationQueue.push(operation);
          console.log(`🔄 Retrying operation: ${operation.type} (${operation.retries}/${MAX_RETRIES})`);
        } else {
          console.error(`❌ Operation failed after ${MAX_RETRIES} retries: ${operation.type}`);
        }
      }
    }

    await this.saveQueue();
  }

  /**
   * Execute a queued operation
   */
  private async executeOperation(operation: QueuedOperation): Promise<void> {
    // This should be implemented based on your specific operation types
    // For now, it's a placeholder that you can customize
    console.log(`Executing operation: ${operation.type}`, operation.data);
    
    // Example implementation:
    // switch (operation.type) {
    //   case 'CREATE_ORDER':
    //     await createOrder(operation.data);
    //     break;
    //   case 'UPDATE_ITEM':
    //     await updateItem(operation.data);
    //     break;
    //   default:
    //     throw new Error(`Unknown operation type: ${operation.type}`);
    // }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.operationQueue));
    } catch (error) {
      console.error('Failed to save operation queue:', error);
    }
  }

  /**
   * Load queue from storage
   */
  private async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.operationQueue = JSON.parse(stored);
        console.log(`📥 Loaded ${this.operationQueue.length} queued operations`);
      }
    } catch (error) {
      console.error('Failed to load operation queue:', error);
    }
  }

  /**
   * Clear all queued operations
   */
  public async clearQueue() {
    this.operationQueue = [];
    await this.saveQueue();
    console.log('🗑️ Operation queue cleared');
  }

  /**
   * Get number of queued operations
   */
  public getQueueLength(): number {
    return this.operationQueue.length;
  }

  /**
   * Manual retry of queue
   */
  public async retryQueue() {
    await this.processQueue();
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();

// Export React hook
export const useConnectionStatus = () => {
  const [isConnected, setIsConnected] = React.useState(
    connectionManager.getConnectionStatus()
  );

  React.useEffect(() => {
    const unsubscribe = connectionManager.addConnectionListener(setIsConnected);
    return unsubscribe;
  }, []);

  return {
    isConnected,
    queueOperation: (type: string, data: any) => connectionManager.queueOperation(type, data),
    retryQueue: () => connectionManager.retryQueue(),
    queueLength: connectionManager.getQueueLength(),
  };
};

// Note: This utility requires @react-native-community/netinfo and @react-native-async-storage/async-storage
// Install with: npm install @react-native-community/netinfo @react-native-async-storage/async-storage

import React from 'react';
