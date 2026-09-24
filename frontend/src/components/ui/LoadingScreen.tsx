'use client';

import React, { useEffect, useState } from 'react';
import { Sprout } from 'lucide-react';

const LOADING_MESSAGES = [
  'Direct Farm-to-Kitchen Connection...',
  'Syncing Mandi & Real-Time Harvest Prices...',
  'Connecting with Local Karnataka Cultivators...',
  'Calculating Geo-Logistics & Delivery Routes...',
  'Securing Transparent Farmer Pricing...',
];

export default function LoadingScreen({ text }: { text?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] bg-stone-950/60 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white/95 border border-white/60 rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col items-center max-w-sm w-full text-center relative overflow-hidden">
        
        {/* Ambient emerald background glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-200/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none" />

        {/* Animated Sprout Emblem */}
        <div className="relative mb-6 flex items-center justify-center">
          <span className="absolute w-20 h-20 bg-emerald-500/20 rounded-full animate-ping duration-1000" />
          <span className="absolute w-24 h-24 bg-emerald-500/10 rounded-full animate-pulse" />
          
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-950/20 relative z-10">
            <Sprout className="w-8 h-8 animate-bounce text-emerald-100" />
          </div>
        </div>

        {/* Branding & Status Messages */}
        <h3 className="text-xs font-black tracking-widest text-emerald-950 uppercase mb-1.5">
          FarmConnect Karnataka
        </h3>
        <p className="text-xs text-stone-600 font-semibold min-h-[20px] transition-all">
          {text || LOADING_MESSAGES[index]}
        </p>

        {/* Smooth Animated Progress Bar */}
        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden relative border border-stone-200 mt-6">
          <div 
            className="h-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700 rounded-full"
            style={{
              width: '45%',
              animation: 'infiniteProgress 1.4s infinite ease-in-out',
            }}
          />
        </div>

        <style jsx>{`
          @keyframes infiniteProgress {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(110%);
            }
            100% {
              transform: translateX(260%);
            }
          }
        `}</style>
      </div>
    </div>
  );
}