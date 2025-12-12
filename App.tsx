'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import { PlantRecord, UserRole, AppView } from './types';
import PlantStage from './components/PlantStage';
import { createCheckoutSession } from './app/actions';
import { Droplets, Heart, ArrowRight, Loader2, Bell, LogOut, CheckCircle2, Copy, CreditCard, X, Coffee, ShieldCheck } from 'lucide-react';

// Stripe Configuration
// Using fallback to ensure it works immediately if env var isn't loaded
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
  
  // Payment State
  const [showPayment, setShowPayment] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Onboarding State
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Notification state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const prevPartnerWater = useRef<number | null>(null);

  // Check Local Storage and URL Params on Mount
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

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      new Notification("Notifications Active", {
        body: "You will be notified when your partner logs hydration."
      });
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
      // Call the Server Action
      const response = await createCheckoutSession();
      
      // Handle Server-Side Errors gracefully
      if (response.error) {
        console.error("Server Action Error:", response.error);
        alert(response.error); // Display the ACTUAL error from the server
        setPaymentLoading(false);
        return;
      }

      if (!response.sessionId) {
        throw new Error("No Session ID returned from server.");
      }

      // Initialize Stripe Client
      // We use window.Stripe because we loaded it via CDN in layout.tsx
      if (!window.Stripe) {
        throw new Error("Stripe.js failed to load.");
      }
      const stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
      const { error } = await stripe.redirectToCheckout({ sessionId: response.sessionId });
      
      if (error) {
        console.error('Stripe Redirect Error:', error);
        alert(`Redirect failed: ${error.message}`);
        setPaymentLoading(false);
      }
    } catch (err: any) {
      console.error("Payment Error:", err);
      // Display specific error instead of generic "System Error"
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
      if (notificationPermission === 'granted') {
        new Notification("Partner Activity", {
          body: "Your partner just hydrated.",
          silent: false,
        });
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
    const steps = [
      {
        title: "Synchronization",
        desc: "Establish a real-time connection link with your partner.",
        buttonText: "Initialize"
      },
      {
        title: "Real-time Growth",
        desc: "Hydration inputs on your device stimulate growth on the connected interface.",
        buttonText: "Continue"
      },
      {
        title: "Active Alerts",
        desc: "Enable system notifications to stay synchronized with partner activity.",
        action: true,
        buttonText: "Launch"
      }
    ];

    const currentStep = steps[onboardingStep];

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
         <div className="tech-panel w-full max-w-md p-10 rounded-2xl relative z-10">
            
            {/* Progress Indicators */}
            <div className="flex gap-2 mb-10">
               {steps.map((_, idx) => (
                 <div 
                   key={idx} 
                   className={`h-1 rounded-full flex-1 transition-all duration-300 ${idx <= onboardingStep ? 'bg-slate-900' : 'bg-slate-200'}`}
                 />
               ))}
            </div>

            <div className="flex flex-col items-start text-left">
               <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                 {currentStep.title}
               </h2>
               
               <p className="text-slate-500 text-base leading-relaxed mb-8 font-medium">
                 {currentStep.desc}
               </p>

               {currentStep.action && (
                 <div className="w-full mb-8">
                    {notificationPermission === 'default' ? (
                      <button 
                        onClick={requestNotificationPermission}
                        className="w-full py-3 px-4 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold transition-all flex items-center justify-center gap-2 hover:bg-slate-50"
                      >
                        <Bell size={16} />
                        Enable Notifications
                      </button>
                    ) : (
                      <div className="w-full py-3 px-4 rounded-lg bg-emerald-50 text-emerald-700 font-medium flex items-center gap-2 border border-emerald-100 text-sm">
                        <CheckCircle2 size={16} />
                        Permissions granted
                      </div>
                    )}
                 </div>
               )}
            </div>

            <div className="mt-2 flex justify-end">
               <button
                 onClick={() => {
                   if (onboardingStep < steps.length - 1) setOnboardingStep(prev => prev + 1);
                   else completeOnboarding();
                 }}
                 className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
               >
                 {currentStep.buttonText}
                 <ArrowRight size={16} />
               </button>
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
