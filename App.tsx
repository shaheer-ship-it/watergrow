'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import { PlantRecord, UserRole, AppView } from './types';
import PlantStage from './components/PlantStage';
import { Droplets, Heart, ArrowRight, Loader2, Bell, LogOut, CheckCircle2, Copy, CreditCard, X, Coffee, ShieldCheck, Share, Smartphone, Wifi, User2 } from 'lucide-react';

// Stripe Configuration
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_live_51SaQdmPgKI4BZbGFXMH7j95m73CU4FRDZgabXeS8qRQtjPF70losWvyQI5ekdc6tqo40MYO17zhZ3PlTGx3OP4Bn00u70dV1t7';

// Ensure Stripe is available on window from the CDN script
declare global {
  interface Window {
    Stripe?: any;
  }
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('ONBOARDING');
  const [isInitialized, setIsInitialized] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [plantData, setPlantData] = useState<PlantRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // iOS PWA Prompt State
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Payment State
  const [showPayment, setShowPayment] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Onboarding State
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [demoWatered, setDemoWatered] = useState(false); // For interactive tutorial

  // Notification state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const prevPartnerWater = useRef<number | null>(null);

  // Check Local Storage, URL Params, and iOS PWA status on Mount
  useEffect(() => {
    const hasOnboarded = localStorage.getItem('water_grow_onboarding_completed');
    if (hasOnboarded) {
      setView('JOIN');
    }

    // Check for Stripe Success
    const query = new URLSearchParams(window.location.search);
    if (query.get('success')) {
      setShowSuccess(true);
      window.history.replaceState({}, document.title, "/");
    }

    // Detect iOS and Standalone status
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Check if running in standalone mode (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    if (isIOS && !isStandalone) {
      // Delay prompt slightly for better UX
      setTimeout(() => setShowInstallPrompt(true), 2000);
    }

    setIsInitialized(true);
  }, []);

  // Initialize or fetch room data
  const handleJoinRoom = async () => {
    if (!roomId.trim()) return;
    setLoading(true);
    setError(null);

    const cleanRoomId = roomId.trim().toLowerCase();

    try {
      const { data, error: fetchError } = await supabase
        .from('plants')
        .select('*')
        .eq('room_id', cleanRoomId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from('plants')
          .insert([{ room_id: cleanRoomId, p1_water: 0, p2_water: 0 }])
          .select()
          .single();

        if (insertError) throw insertError;
        setPlantData(newData);
      } else if (fetchError) {
        throw fetchError;
      } else {
        setPlantData(data);
      }

      setRoomId(cleanRoomId);
      setView('ROLE');
    } catch (err: any) {
      console.error('Error joining room:', err);
      setError('Connection failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setView('GAME');
  };

  const handleLeaveRoom = () => {
    setRole(null);
    setRoomId('');
    setPlantData(null);
    prevPartnerWater.current = null;
    setView('JOIN');
  };

  const completeOnboarding = () => {
    localStorage.setItem('water_grow_onboarding_completed', 'true');
    setView('JOIN');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast("System notifications not supported on this browser. In-app alerts enabled.", 'info');
      // Even if not supported, we treat as "done" for onboarding purposes
      completeOnboarding();
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        showToast("Notifications enabled!", 'success');
        try {
          new Notification("Notifications Active", {
            body: "You will be notified when your partner logs hydration."
          });
        } catch (e) {
          console.log("System notification test failed (common on mobile browsers):", e);
        }
      } else if (permission === 'denied') {
        showToast("Notifications blocked. Check settings.", 'error');
      }
      // Proceed after choice
      setTimeout(completeOnboarding, 500);
    } catch (err) {
      console.error(err);
      completeOnboarding();
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handlePayment = async () => {
    if (!STRIPE_PUBLISHABLE_KEY) {
      alert("Payment system not configured (Missing Publishable Key).");
      return;
    }
    
    setPaymentLoading(true);
    try {
      // Fetch session from API
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Network response was not ok');
      }

      if (!data.sessionId) {
        throw new Error("No Session ID returned from server.");
      }

      if (!window.Stripe) {
        throw new Error("Stripe.js failed to load.");
      }
      const stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      
      if (error) {
        console.error('Stripe Redirect Error:', error);
        alert(`Redirect failed: ${error.message}`);
        setPaymentLoading(false);
      }
    } catch (err: any) {
      console.error("Payment Error:", err);
      alert(`Error: ${err.message || "Unknown system error"}`);
      setPaymentLoading(false);
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (view !== 'GAME' || !roomId) return;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'plants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setPlantData(payload.new as PlantRecord);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view, roomId]);

  // Notifications logic
  useEffect(() => {
    if (!plantData || !role) return;
    const partnerWater = role === 'p1' ? plantData.p2_water : plantData.p1_water;

    if (prevPartnerWater.current !== null && partnerWater > prevPartnerWater.current) {
      // Always show in-app toast
      showToast("Partner just hydrated! 🌱", 'success');

      // Try system notification
      if (notificationPermission === 'granted') {
        try {
          new Notification("Partner Activity", {
            body: "Your partner just hydrated.",
            silent: false,
          });
        } catch (e) {
          // Ignore errors common on mobile
        }
      }
    }
    prevPartnerWater.current = partnerWater;
  }, [plantData, role, notificationPermission]);

  // Drink action
  const handleDrink = async () => {
    if (!role || !plantData) return;

    const prevData = { ...plantData };
    const updatedCount = role === 'p1' ? plantData.p1_water + 1 : plantData.p2_water + 1;
    
    const updates = role === 'p1' 
      ? { p1_water: updatedCount, last_watered: new Date().toISOString() }
      : { p2_water: updatedCount, last_watered: new Date().toISOString() };

    setPlantData({ ...plantData, ...updates } as PlantRecord);

    const { error: updateError } = await supabase
      .from('plants')
      .update(updates)
      .eq('room_id', roomId);

    if (updateError) {
      setPlantData(prevData);
      showToast("Sync failed. Checking connection...", 'error');
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-800" size={32} />
      </div>
    );
  }

  // --- VIEW: ONBOARDING ---
  if (view === 'ONBOARDING') {
    const totalSteps = 4;

    const renderStepContent = () => {
      switch (onboardingStep) {
        case 0: // WELCOME
          return (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-gradient-to-tr from-emerald-100 to-teal-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
                <Heart size={40} className="text-emerald-500 fill-emerald-100" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Water & Grow</h1>
              <p className="text-slate-500 text-lg leading-relaxed max-w-xs mx-auto">
                A shared hydration tracker. When you drink water, your partner's plant grows.
              </p>
            </div>
          );
          
        case 1: // INTERACTIVE TUTORIAL
          return (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
              <div className="mb-2">
                <PlantStage 
                  waterCount={demoWatered ? 5 : 0} 
                  label="Your Plant" 
                  isOwner={true} 
                />
              </div>
              <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto min-h-[40px]">
                {demoWatered 
                  ? "Great! Your plant just grew because you hydrated." 
                  : "Try it out. Tap the button below to log water."}
              </p>
              
              {!demoWatered && (
                 <button
                 onClick={() => setDemoWatered(true)}
                 className="bg-emerald-500 hover:bg-emerald-600 text-white pl-6 pr-8 py-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-3 animate-pulse"
               >
                 <Droplets size={18} className="fill-white" />
                 <span className="font-bold">Drink Water</span>
               </button>
              )}
            </div>
          );

        case 2: // REALTIME EXPLANATION
           return (
             <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-center gap-4 mb-8 relative h-24 w-full">
                  {/* Partner A */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-16 border-2 border-slate-300 rounded-lg flex items-center justify-center bg-white shadow-sm">
                      <User2 size={20} className="text-slate-400" />
                    </div>
                  </div>
                  
                  {/* Signal Animation */}
                  <div className="flex flex-col items-center justify-center text-emerald-500 gap-1">
                    <Wifi size={24} className="animate-ping absolute opacity-75" />
                    <Wifi size={24} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mt-1">Instant</span>
                  </div>

                  {/* Partner B */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-16 border-2 border-slate-800 bg-slate-800 rounded-lg flex items-center justify-center shadow-md">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-white" />
                      </div>
                    </div>
                  </div>
               </div>
               
               <h2 className="text-2xl font-bold text-slate-900 mb-3">Syncs Instantly</h2>
               <p className="text-slate-500 text-base leading-relaxed max-w-xs mx-auto">
                 No refreshing needed. When you add water, their screen updates in real-time.
               </p>
             </div>
           );

        case 3: // NOTIFICATIONS
          return (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-blue-100 relative">
                <Bell size={40} className="text-blue-500" />
                <div className="absolute top-0 right-0 w-8 h-8 bg-rose-500 rounded-full border-4 border-white"></div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Stay Connected</h2>
              <p className="text-slate-500 text-base leading-relaxed max-w-xs mx-auto mb-6">
                Enable notifications so you know exactly when your partner is thinking of you (and drinking water).
              </p>
            </div>
          );
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-50">
         {/* Background Decoration */}
         <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none" />

         <div className="tech-panel w-full max-w-md p-8 rounded-3xl relative z-10 flex flex-col min-h-[480px]">
            
            {/* Top Progress Bar */}
            <div className="flex gap-2 mb-12">
               {Array.from({ length: totalSteps }).map((_, idx) => (
                 <div 
                   key={idx} 
                   className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${idx <= onboardingStep ? 'bg-slate-900' : 'bg-slate-100'}`}
                 />
               ))}
            </div>

            {/* Dynamic Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center">
               {renderStepContent()}
            </div>

            {/* Bottom Navigation */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end w-full">
               {/* Step 1 requires the user to click "Drink" inside the content, not here, unless they've done it */}
               {onboardingStep === 1 && !demoWatered ? (
                 <div className="h-12" /> /* Placeholder to keep layout stable */
               ) : onboardingStep === 3 ? (
                 <button
                   onClick={requestNotificationPermission}
                   className="w-full bg-slate-900 hover:bg-slate-800 text-white text-base font-semibold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                 >
                   Enable Notifications
                   <Bell size={18} />
                 </button>
               ) : (
                 <button
                   onClick={() => setOnboardingStep(prev => prev + 1)}
                   className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                 >
                   {onboardingStep === 0 ? "Get Started" : "Continue"}
                   <ArrowRight size={16} />
                 </button>
               )}
            </div>
         </div>
      </div>
    );
  }

  // --- VIEW: JOIN ROOM ---
  if (view === 'JOIN') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">
              Water & Grow
            </h1>
            <p className="text-slate-500 font-medium">Real-time Hydration Sync</p>
          </div>

          <div className="tech-panel rounded-2xl p-8 relative">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                  Session ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="enter-room-name"
                  className="tech-input w-full pb-2 text-xl font-medium text-slate-900 placeholder-slate-300"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 border border-red-100">
                   <ShieldCheck size={16} />
                   {error}
                </div>
              )}

              <button
                onClick={handleJoinRoom}
                disabled={loading || !roomId.trim()}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Connect"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: ROLE SELECTION ---
  if (view === 'ROLE') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-1">Select Interface</h2>
          <p className="text-slate-500 text-center mb-8 text-sm">Choose your designated display side.</p>
          
          <div className="grid gap-4">
            {[
              { id: 'p1', label: 'Unit One', sub: 'Left Display' },
              { id: 'p2', label: 'Unit Two', sub: 'Right Display' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => selectRole(opt.id as UserRole)}
                className="group flex items-center justify-between p-6 bg-white border border-slate-200 hover:border-slate-400 rounded-xl transition-all duration-200"
              >
                <div>
                  <span className="block text-lg font-bold text-slate-900">{opt.label}</span>
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{opt.sub}</span>
                </div>
                <ArrowRight className="text-slate-300 group-hover:text-slate-900 transition-colors" size={20} />
              </button>
            ))}
          </div>
          
          <button 
             onClick={() => setView('JOIN')}
             className="w-full mt-8 text-slate-400 hover:text-slate-600 text-xs font-semibold uppercase tracking-widest transition-colors"
          >
            Cancel Connection
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: GAME ---
  if (view === 'GAME' && plantData && role) {
    const myCount = role === 'p1' ? plantData.p1_water : plantData.p2_water;
    const partnerCount = role === 'p1' ? plantData.p2_water : plantData.p1_water;

    return (
      <div className="min-h-screen flex flex-col relative">
        
        {/* Toast Overlay */}
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 fade-in w-max max-w-[90vw]">
             <div className={`px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border backdrop-blur-md ${
                toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800' : 
                toast.type === 'error' ? 'bg-red-50/90 border-red-100 text-red-800' :
                'bg-slate-900/90 text-white border-slate-800'
             }`}>
                {toast.type === 'success' && <CheckCircle2 size={16} />}
                {toast.type === 'error' && <X size={16} />}
                {toast.type === 'info' && <Bell size={16} />}
                <span className="text-sm font-semibold">{toast.message}</span>
             </div>
          </div>
        )}

        {/* Success Overlay */}
        {showSuccess && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm mx-4 border border-slate-100">
                <div className="text-4xl mb-4">✨</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Contribution Received</h3>
                <p className="text-slate-500 mb-6 text-sm">Thank you for supporting the platform.</p>
                <button 
                  onClick={() => setShowSuccess(false)}
                  className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
             </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative border border-slate-200">
              <button 
                onClick={() => setShowPayment(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
              
              <div className="flex flex-col items-center text-center pt-2">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Coffee size={20} className="text-slate-700" />
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1">Platform Contribution</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed px-4">
                  Support ongoing development and server maintenance costs.
                </p>

                <div className="w-full bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard size={18} className="text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">One-time</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">$5.00</div>
                </div>

                <button 
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {paymentLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    "Process Donation"
                  )}
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                  <ShieldCheck size={12} />
                  Secure Transaction
                </div>
              </div>
            </div>
          </div>
        )}

        {/* iOS Install Prompt Overlay (Game View) */}
        {showInstallPrompt && (
           <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom duration-500">
              <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-5 relative max-w-md mx-auto ring-1 ring-black/5">
                <button 
                   onClick={() => setShowInstallPrompt(false)}
                   className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-2"
                >
                   <X size={16} />
                </button>
                <div className="flex gap-4">
                   <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100">
                      <Smartphone size={24} className="text-blue-600" />
                   </div>
                   <div className="pr-6">
                      <h3 className="font-bold text-slate-900 text-sm mb-1">Install App for Best Experience</h3>
                      <p className="text-slate-500 text-xs leading-relaxed">
                         To enable full notifications and remove browser bars, tap <span className="inline-flex items-center justify-center w-6 h-6 mx-0.5 bg-slate-100 rounded text-slate-600"><Share size={12}/></span> below and select <span className="font-bold text-slate-700">"Add to Home Screen"</span>.
                      </p>
                   </div>
                </div>
                {/* Arrow pointing down */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white/95 drop-shadow-sm"></div>
              </div>
           </div>
         )}

        {/* Header Bar */}
        <div className="w-full px-6 py-6 flex justify-between items-center z-20">
            {/* Room Info */}
            <div 
              onClick={copyRoomCode}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full cursor-pointer hover:border-slate-300 transition-colors group shadow-sm"
            >
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <div className="text-xs font-mono font-semibold text-slate-600 group-hover:text-slate-900">
                 {roomId}
               </div>
               {copied ? <CheckCircle2 size={12} className="text-emerald-500"/> : <Copy size={12} className="text-slate-300"/>}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
               <button 
                onClick={() => setShowPayment(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 px-4 rounded-full shadow-sm transition-all flex items-center gap-2"
              >
                Donate
                <Heart size={12} className="text-rose-500 fill-rose-500" />
              </button>

               <button 
                onClick={handleLeaveRoom}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
        </div>

        {/* Garden Area */}
        <div className="flex-1 flex flex-col justify-center items-center pb-24">
           <div className="flex flex-col md:flex-row gap-12 items-center justify-center w-full max-w-4xl px-8">
            <PlantStage 
                waterCount={myCount} 
                label="Unit 1 (You)" 
                isOwner={true} 
            />
            <PlantStage 
                waterCount={partnerCount} 
                label="Unit 2 (Partner)" 
                isOwner={false} 
            />
           </div>
        </div>

        {/* Bottom Floating Action Button */}
        <div className="fixed bottom-10 left-0 right-0 z-30 flex justify-center pointer-events-none">
             <button
                onClick={handleDrink}
                className="pointer-events-auto bg-slate-900 hover:bg-slate-800 text-white pl-6 pr-8 py-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4"
              >
                <div className="bg-white/10 p-2 rounded-full">
                  <Droplets size={20} className="text-emerald-400 fill-emerald-400" />
                </div>
                <span className="text-lg font-bold tracking-tight">Log Hydration</span>
             </button>
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-slate-300" size={32} />
    </div>
  );
};

export default App;