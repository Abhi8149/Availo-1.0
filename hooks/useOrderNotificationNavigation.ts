import { useState, useEffect } from 'react';
import {OneSignalService} from '../services/oneSignalService';

// Define the interface for order notification data
export interface OrderNavigationData {
  orderId: string;
  shopId: string;
  customerId: string;
  totalAmount: string;
  orderType: string;
}

export const useOrderNotificationNavigation = () => {
  const [shouldShowOrders, setShouldShowOrders] = useState(false);
  const [orderData, setOrderData] = useState<OrderNavigationData | null>(null);

  useEffect(() => {
    console.log('🪝 useOrderNotificationNavigation hook initializing...');
    
    // Set up the callback for OneSignal service
    const callback = (data: OrderNavigationData) => {
      console.log('🛒 Order notification navigation triggered in hook:', data);
      setOrderData(data);
      setShouldShowOrders(true);
      console.log('✅ Hook state updated: shouldShowOrders=true, orderData set');
    };
    
    console.log('📞 Setting up OneSignal order notification callback...');
    OneSignalService.setOrderNavigationCallback(callback);

    // Check for any pending order navigation on mount (backup check)
    if (OneSignalService.hasPendingOrderNavigation()) {
      console.log('📋 Found pending order navigation on mount (backup check)');
      const pendingData = OneSignalService.getPendingOrderData();
      if (pendingData) {
        console.log('📝 Setting pending order data (backup):', pendingData);
        setOrderData(pendingData);
        setShouldShowOrders(true);
      }
    } else {
      console.log('📋 No pending order navigation found on mount');
    }

    return () => {
      console.log('🧹 Cleaning up order notification navigation hook');
      // Clean up callback
      OneSignalService.orderNavigationCallback = null;
    };
  }, []);

  const clearOrderNavigation = () => {
    console.log('🧹 Clearing order navigation state');
    setShouldShowOrders(false);
    setOrderData(null);
    OneSignalService.clearPendingOrderNavigation();
  };

  return {
    shouldShowOrders,
    orderData,
    clearOrderNavigation,
  };
};
