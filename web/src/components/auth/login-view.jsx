'use client';

import React, { useState } from 'react';
import { 
  Flame, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Cpu, 
  AlertCircle,
  Radio,
  Sliders,
  Check
} from 'lucide-react';
import { loginUser, registerUser } from '../../lib/auth';

export default function LoginView({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' | 'signup'
  
  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState('admin'); // 'admin' | 'viewer'
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Status & Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-zinc-800' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak (min 6 characters)', color: 'bg-red-500' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-lime-400' };
      case 4:
      default:
        return { score: 100, label: 'Strong', color: 'bg-[#c8ff00]' };
    }
  };

  const passwordStrength = getPasswordStrength(signUpPassword);

  // Handle Sign In submission
  const handleSignIn = async (e) => {
    if (e) e.preventDefault();
    if (!signInEmail.trim() || !signInPassword.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const user = await loginUser(signInEmail, signInPassword);
      setIsLoading(false);
      setSuccessMessage(`Welcome back, ${user.name || user.email}!`);
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(user);
      }, 400);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Invalid email or password. Please check your credentials or sign up.');
    }
  };

  // Handle Sign Up submission
  const handleSignUp = async (e) => {
    if (e) e.preventDefault();
    
    if (!signUpName.trim()) {
      setErrorMessage('Please enter your full name or operator call-sign.');
      return;
    }

    if (!signUpEmail.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!signUpPassword) {
      setErrorMessage('Please enter a security passcode.');
      return;
    }

    if (signUpPassword.length < 6) {
      setErrorMessage('Passcode must be at least 6 characters long.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage('Security passcodes do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const user = await registerUser({
        email: signUpEmail,
        password: signUpPassword,
        name: signUpName,
        role: signUpRole
      });

      setIsLoading(false);
      setSuccessMessage(`Account created successfully! Welcome to FireLine, ${user.name}.`);
      
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(user);
      }, 600);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#c8ff00] selection:text-black">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#c8ff00]/12 to-transparent blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-amber-500/10 to-transparent blur-[130px] pointer-events-none" />
      
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="w-full max-w-md relative z-10 space-y-6 my-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-semibold text-zinc-300 backdrop-blur-md shadow-lg shadow-black/40">
            <div className="w-2 h-2 rounded-full bg-[#c8ff00] animate-pulse" />
            <span>Industrial Gas & Fire Autonomous PWA</span>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-[#c8ff00] text-zinc-950 flex items-center justify-center font-black shadow-[0_0_25px_rgba(200,255,0,0.35)] shrink-0">
              <Flame className="w-7 h-7 fill-zinc-950 text-zinc-950" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
                FireLine
              </h1>
              <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1">
                SECURE OPERATOR ACCESS & AUTH
              </p>
            </div>
          </div>
        </div>

        {/* Segmented Auth Mode Switcher */}
        <div className="p-1 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 flex gap-1 shadow-inner backdrop-blur-xl">
          <button
            id="auth-tab-signin"
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'signin'
                ? 'bg-[#c8ff00] text-zinc-950 shadow-[0_0_15px_rgba(200,255,0,0.3)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            id="auth-tab-signup"
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'signup'
                ? 'bg-[#c8ff00] text-zinc-950 shadow-[0_0_15px_rgba(200,255,0,0.3)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="rounded-[28px] bg-zinc-900/75 border border-zinc-800/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/80 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {activeTab === 'signin' ? 'Operator Sign In' : 'Register Operator Profile'}
            </h2>
            <p className="text-xs text-zinc-400">
              {activeTab === 'signin' 
                ? 'Enter your safety officer credentials to access telemetry and valve controls.'
                : 'Create an authorized safety profile with cloud sync and autonomous safety rights.'
              }
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div 
              id="auth-error-banner"
              className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-200"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div 
              id="auth-success-banner"
              className="p-3.5 rounded-2xl bg-[#c8ff00]/10 border border-[#c8ff00]/30 text-[#c8ff00] text-xs flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-200"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#c8ff00] mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* SIGN IN FORM */}
          {activeTab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">
                  Safety Account Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="signin-email"
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="admin@test.com"
                    autoComplete="email"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#c8ff00] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Security Passcode
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="signin-password"
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#c8ff00] focus:border-transparent transition-all"
                  />
                  <button
                    id="signin-toggle-password"
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Session checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400">
                  <input
                    id="signin-remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-[#c8ff00] focus:ring-[#c8ff00] focus:ring-offset-0"
                  />
                  <span>Persist session for PWA</span>
                </label>

                <span className="text-[11px] text-zinc-500 font-mono">
                  Encrypted Session
                </span>
              </div>

              {/* Submit Button */}
              <button
                id="signin-submit"
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-[#c8ff00] text-zinc-950 font-black text-sm hover:bg-[#b5e600] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(200,255,0,0.25)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In to Safety Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* SIGN UP FORM */
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">
                  Operator Full Name / Call-Sign
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="e.g. Officer Alex Rivera"
                    autoComplete="name"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#c8ff00] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">
                  Official Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="alex@safety.internal"
                    autoComplete="email"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#c8ff00] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">
                  Console Authorization Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="signup-role-admin"
                    type="button"
                    onClick={() => setSignUpRole('admin')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      signUpRole === 'admin'
                        ? 'bg-zinc-800/80 border-[#c8ff00] text-white shadow-[0_0_12px_rgba(200,255,0,0.15)]'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black flex items-center gap-1.5 text-white">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#c8ff00]" />
                        Operator (Admin)
                      </span>
                      {signUpRole === 'admin' && (
                        <div className="w-3.5 h-3.5 rounded-full bg-[#c8ff00] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Full control: valve shutoff & threshold calibration
                    </p>
                  </button>

                  <button
                    id="signup-role-viewer"
                    type="button"
                    onClick={() => setSignUpRole('viewer')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      signUpRole === 'viewer'
                        ? 'bg-zinc-800/80 border-[#c8ff00] text-white shadow-[0_0_12px_rgba(200,255,0,0.15)]'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black flex items-center gap-1.5 text-white">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                        Auditor (Viewer)
                      </span>
                      {signUpRole === 'viewer' && (
                        <div className="w-3.5 h-3.5 rounded-full bg-[#c8ff00] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Read-only telemetry, gauges & incident feeds
                    </p>
                  </button>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">
                  Security Passcode (min 6 chars)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-password"
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Create passcode"
                    autoComplete="new-password"
                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#c8ff00] focus:border-transparent transition-all"
                  />
                  <button
                    id="signup-toggle-password"
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength meter */}
                {signUpPassword && (
                  <div className="pt-1 space-y-1">
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full ${passwordStrength.color} transition-all duration-300`} 
                        style={{ width: `${passwordStrength.score}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Strength: {passwordStrength.label}</span>
                      <span>{signUpPassword.length}/6+</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">
                  Confirm Security Passcode
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-confirm-password"
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    placeholder="Repeat passcode"
                    autoComplete="new-password"
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#c8ff00] focus:border-transparent transition-all"
                  />
                  {signUpConfirmPassword && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      {signUpPassword === signUpConfirmPassword ? (
                        <CheckCircle2 className="w-4 h-4 text-[#c8ff00]" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="signup-submit"
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-[#c8ff00] text-zinc-950 font-black text-sm hover:bg-[#b5e600] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(200,255,0,0.25)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Creating Officer Account...</span>
                  </div>
                ) : (
                  <>
                    <span>Create Operator Profile & Enter</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info badge */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Solenoid Valve Interlock Guard</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span>Node ESP32-Ready</span>
          </span>
        </div>
      </div>
    </div>
  );
}
