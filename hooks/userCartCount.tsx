import { useState, useEffect, useCallback } from 'react';
import cartService from '@/services/cartService';
import tokenService from '@/services/tokenService';

export function useCartCount() {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCartCount = useCallback(async () => {
    try {
      const token = await tokenService.getToken();
      if (!token) {
        setCount(0);
        setIsLoading(false);
        return;
      }

      const cartCount = await cartService.getCartCount(token);
      setCount(cartCount);  
    } catch (error) {
      console.error('Error fetching cart count:', error);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  const refreshCount = useCallback(async () => {
    await fetchCartCount();
  }, [fetchCartCount]);

  return { count, isLoading, refreshCount };
}