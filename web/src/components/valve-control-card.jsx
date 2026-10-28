'use client';

import React, { useState } from 'react';
import { Flame, ShieldAlert, CheckCircle2, Lock, Unlock, Loader2, AlertTriangle, Wifi } from 'lucide-react';
import HoldToConfirmButton from './hold-to-confirm-button';

export default function ValveControlCard({
  valveState = 'open',
  isAdmin = true,
  onShutoffGas,
  onReopenGas,
  lastValveEvent,
  isOffline = false
}) {
  const [isShutoffModalOpen, setIsShutoffModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleConfirmShutoff = async () => {
    setIsPending(true);
    setFeedback({ type: 'info', message: 'Command sent to ESP32. Waiting for solenoid relay...' });

    try {
      await onShutoffGas();
      setIsPending(false);
      setIsShutoffModalOpen(false);
      setFeedback({ type: 'success', message: 'Solenoid valve closed successfully.' });
    } catch (err) {
      setIsPending(false);
      setFeedback({ type: 'error', message: 'Device did not respond. Check physical valve or Wi-Fi.' });
    }
  };

  const handleConfirmReopen = async () => {
    setIsPending(true);
    try {
      await onReopenGas();
      setIsPending(false);
      setIsReopenModalOpen(false);
      setFeedback({ type: 'success', message: 'Solenoid valve reopened.' });
    } catch (err) {
      setIsPending(false);
      setFeedback({ type: 'error', message: 'Failed to reopen valve.' });
    }
  };

  const isClosed = valveState === 'closed';

  return (
    <div className="rounded-[28px] bg-[#181a20] text-white p-4 sm:p-5 md:p-6 shadow-smart-active relative overflow-hidden transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Top Header: Circular Icon + Connectivity Symbol */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-md">
            {isClosed ? <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" /> : <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-950" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-semibold">
              Normally Open (NO)
            </span>
            <div className="text-zinc-500">
              <Wifi className="w-4 h-4 text-zinc-400/80" />
            </div>
          </div>
        </div>

        {/* Middle: Title & Subtitle */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
            LPG Gas Valve
          </h3>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 truncate">
            Normally Open (NO) • 12V Actuator
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`text-xs p-2.5 rounded-xl mb-4 flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' :
          feedback.type === 'error' ? 'bg-red-950/60 text-red-300 border border-red-800' :
          'bg-zinc-800 text-zinc-300 border border-zinc-700'
        }`}>
          {feedback.type === 'error' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
          <span className="truncate">{feedback.message}</span>
        </div>
      )}

      {/* Bottom Row: State text & Electric Lime Switch Toggle */}
      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-wide">
            {isClosed ? 'Off' : 'On'}
          </span>
          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${
            isClosed ? 'bg-red-950/80 text-red-300 border border-red-800' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
          }`}>
            {isClosed ? 'Closed' : 'Normally Open'}
          </span>
        </div>

        {/* Custom Toggle Switch */}
        {isAdmin ? (
          <button
            type="button"
            disabled={isOffline || isPending}
            onClick={() => {
              if (isClosed) {
                setIsReopenModalOpen(true);
              } else {
                setIsShutoffModalOpen(true);
              }
            }}
            className={`w-12 h-6.5 rounded-full p-0.5 flex items-center transition-colors cursor-pointer select-none ${
              !isClosed ? 'bg-[#c8ff00]' : 'bg-zinc-700'
            } disabled:opacity-50`}
            title={isClosed ? "Click to Reopen Valve" : "Click to Shut Off Valve"}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                !isClosed ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        ) : (
          <span className="text-[10px] text-zinc-500 font-mono">View Only</span>
        )}
      </div>

      {lastValveEvent && (
        <div className="mt-3 text-[11px] text-zinc-500 flex items-center justify-between">
          <span className="truncate pr-2">{lastValveEvent.summary}</span>
          <span className="font-mono shrink-0">
            {new Date(lastValveEvent.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Emergency Shut Off Modal with 1.5s Hold To Confirm */}
      {isShutoffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-red-600/80 bg-zinc-950 p-6 shadow-2xl text-zinc-100">
            <div className="flex items-center gap-3 text-red-500 mb-3">
              <div className="p-2 rounded-full bg-red-500/10">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-red-400">Shut off the gas valve?</h3>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed mb-6">
              This sends a cloud command to the ESP32 to actuate the relay and shut off the normally-open LPG gas valve. Gas supply will halt immediately.
            </p>

            {isPending ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-zinc-300 font-medium">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                <span>Transmitting command to ESP32...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <HoldToConfirmButton 
                  holdDurationMs={1500} 
                  onConfirm={handleConfirmShutoff}
                >
                  Hold to Confirm Shut Off (1.5s)
                </HoldToConfirmButton>

                <button
                  type="button"
                  onClick={() => setIsShutoffModalOpen(false)}
                  className="w-full h-10 rounded-md font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reopen Valve Modal */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-emerald-600/80 bg-zinc-950 p-6 shadow-2xl text-zinc-100">
            <div className="flex items-center gap-3 text-emerald-400 mb-3">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <Unlock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-emerald-400">Reopen gas valve?</h3>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed mb-6">
              Safety rule: Confirm that the monitored area has been inspected, thoroughly ventilated, and no active gas leak or ignition sources are present before reopening.
            </p>

            {isPending ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-zinc-300 font-medium">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                <span>Transmitting reopen command...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleConfirmReopen}
                  className="w-full h-11 rounded-md font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors text-sm"
                >
                  Confirm: Inspection Completed & Reopen
                </button>

                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  className="w-full h-10 rounded-md font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
