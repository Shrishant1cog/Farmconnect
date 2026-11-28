'use client';

import React, { Suspense } from 'react';
import { AccountProvider } from '../context/AccountContext';
import { CartProvider } from '../context/CartContext';
import { LoadingProvider } from '../context/LoadingContext';
import { LocaleProvider } from '../context/LocaleContext';
import NavigationLoader from './NavigationLoader';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <LoadingProvider>
        <AccountProvider>
          <CartProvider>
            <Suspense fallback={null}>
              <NavigationLoader />
            </Suspense>
            {children}
          </CartProvider>
        </AccountProvider>
      </LoadingProvider>
    </LocaleProvider>
  );
}
