'use client';

import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle, Info } from 'lucide-react';

export default function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(true);

  useEffect(() => {
    setIsMounted(true);

    // 1. Check secure context (PWA install requires HTTPS or localhost)
    if (typeof window !== 'undefined') {
      const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsSecureContext(isSecure);
    }

    // 2. Check if already running in standalone mode (already installed)
    const isRunningStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;
    setIsStandalone(isRunningStandalone);

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Register Service Worker automatically on page load
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // 5. Capture beforeinstallprompt for Android Chrome / Desktop
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA] beforeinstallprompt captured');
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      console.log('[PWA] App successfully installed!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isMounted || isStandalone) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show iOS or manual instructions modal
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {/* Install Button Header Trigger */}
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 text-[#c8ff00] hover:bg-zinc-800 text-xs font-bold transition-all shadow-sm border border-zinc-900 cursor-pointer shrink-0 animate-pulse"
        title="Install FireLine PWA to Home Screen"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>

      {/* Manual / iOS Installation Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 relative text-zinc-950">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-[#c8ff00] flex items-center justify-center font-black shadow-md shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-950 leading-tight">
                  Add FireLine to Home Screen
                </h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Standalone App Experience
                </p>
              </div>
            </div>

            {!isSecureContext && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Note:</strong> Browsers require a secure HTTPS connection or localhost to allow home screen installation. If using a local IP, deploy to Vercel/Render or use localhost.
                </span>
              </div>
            )}

            {/* Instructions */}
            {isIOS ? (
              <div className="space-y-3.5 my-5 text-sm text-zinc-700">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="w-6 h-6 rounded-full bg-zinc-950 text-[#c8ff00] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900">Tap the Share button</span>
                    <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                      Located in Safari's bottom toolbar (<Share className="w-3.5 h-3.5 inline text-blue-500" />).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="w-6 h-6 rounded-full bg-zinc-950 text-[#c8ff00] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900">Select "Add to Home Screen"</span>
                    <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                      Scroll down in the share sheet and tap <PlusSquare className="w-3.5 h-3.5 inline text-zinc-700" />.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="w-6 h-6 rounded-full bg-zinc-950 text-[#c8ff00] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900">Tap "Add" in top right</span>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      FireLine will appear as a full standalone app with push alerts.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 my-5 text-sm text-zinc-700">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="w-6 h-6 rounded-full bg-zinc-950 text-[#c8ff00] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900">Browser Menu</span>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Tap the three-dots menu (⋮) in Chrome or Edge.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="w-6 h-6 rounded-full bg-zinc-950 text-[#c8ff00] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900">Install / Add to Home screen</span>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 rounded-2xl bg-zinc-950 text-white font-bold text-sm hover:bg-zinc-800 transition-colors shadow-md cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
