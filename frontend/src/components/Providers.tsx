'use client';

import React, { Suspense } from 'react';
import { CartProvider } from '../context/CartContext';
import { LoadingProvider } from '../context/LoadingContext';
import { LocaleProvider } from '../context/LocaleContext';
import NavigationLoader from './NavigationLoader';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <LoadingProvider>
        <CartProvider>
          <Suspense fallback={null}>
            <NavigationLoader />
          </Suspense>
          {children}
        </CartProvider>
      </LoadingProvider>
    </LocaleProvider>
  );
}
