'use client';

import React, { useState } from 'react';
import { Flame, ShieldAlert, CheckCircle2, Lock, Unlock, Loader2, AlertTriangle } from 'lucide-react';
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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-md ${isClosed ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {isClosed ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">LPG Emergency Valve</h3>
            <p className="text-xs text-zinc-400">CW-025 12V Solenoid Actuator</p>
          </div>
        </div>

        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
          isClosed 
            ? 'bg-red-600/20 text-red-400 border-red-500/40' 
            : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
        }`}>
          {isClosed ? 'CLOSED (OFF)' : 'OPEN (ACTIVE)'}
        </span>
      </div>

      {feedback && (
        <div className={`text-xs p-3 rounded-md mb-4 flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800' :
          feedback.type === 'error' ? 'bg-red-950/40 text-red-300 border border-red-800' :
          'bg-zinc-800 text-zinc-300 border border-zinc-700'
        }`}>
          {feedback.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3">
        {isAdmin ? (
          <div>
            {!isClosed ? (
              <button
                type="button"
                onClick={() => setIsShutoffModalOpen(true)}
                disabled={isOffline || isPending}
                className="w-full h-11 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                <ShieldAlert className="w-4 h-4" />
                Emergency Shut Off Gas
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(true)}
                disabled={isOffline || isPending}
                className="w-full h-11 rounded-md font-semibold text-zinc-900 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                <Unlock className="w-4 h-4" />
                Reopen Gas Valve
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs text-zinc-400 p-2.5 rounded bg-zinc-800/40 border border-zinc-800 text-center">
            View-only account. Solenoid valve actuation restricted to Administrator.
          </div>
        )}
      </div>

      {/* Last Valve Action Metadata */}
      {lastValveEvent && (
        <div className="mt-4 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400 flex items-center justify-between">
          <span>Last action: {lastValveEvent.summary}</span>
          <span className="font-mono text-zinc-500">
            {new Date(lastValveEvent.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
              This sends a cloud command to the ESP32 to de-energize the CW-025 relay and snap the LPG solenoid valve shut. Gas supply will halt immediately.
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
