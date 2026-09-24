'use client';

import React, { Suspense } from 'react';
import { CartProvider } from '../context/CartContext';
import { LoadingProvider } from '../context/LoadingContext';
import NavigationLoader from './NavigationLoader';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LoadingProvider>
      <CartProvider>
        <Suspense fallback={null}>
          <NavigationLoader />
        </Suspense>
        {children}
      </CartProvider>
    </LoadingProvider>
  );
}