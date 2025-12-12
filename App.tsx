import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import { PlantRecord, UserRole, AppView } from './types';
import PlantStage from './components/PlantStage';
import { Droplets, Heart, Users, ArrowRight, Loader2, Bell, BellRing, LogOut, CheckCircle2, ChevronRight, Sparkles, ChevronLeft, Sprout, Zap, Smile, Copy, CreditCard, X, Coffee } from 'lucide-react';

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
      setError('Check your connection bestie, something broke.');
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
      new Notification("You're set! 💖", {
        body: "We'll ping you when your bestie hydrates."
      });
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handlePayment = async () => {
    setPaymentLoading(true);
    // Simulate API call for payment since backend is not available in this environment
    await new Promise(resolve => setTimeout(resolve, 1500));
    setPaymentLoading(false);
    setShowPayment(false);
    setShowSuccess(true);
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
        new Notification("Hydration Check! 💧", {
          body: "Your partner just took a sip. Keep it up!",
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
        <Loader2 className="animate-spin text-fuchsia-500" size={40} />
      </div>
    );
  }

  // --- VIEW: ONBOARDING ---
  if (view === 'ONBOARDING') {
    const steps = [
      {
        emoji: "👯‍♀️",
        title: "Sync Up",
        desc: "Create a room with your bestie or partner. It's a shared hydration station.",
        buttonText: "How?"
      },
      {
        emoji: "🌱",
        title: "Grow Together",
        desc: "When YOU drink water, THEIR plant grows on their screen. It's giving ✨supportive✨.",
        buttonText: "Wait, cool"
      },
      {
        emoji: "🔔",
        title: "Stay in the Loop",
        desc: "Turn on notifs to get hyped every time they take a sip.",
        action: true,
        buttonText: "Let's Go"
      }
    ];

    const currentStep = steps[onboardingStep];

    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
         {/* Blob Backgrounds */}
         <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>

         <div className="glass-panel w-full max-w-md p-8 rounded-[3rem] shadow-2xl relative z-10 border border-white/60 bg-white/40 backdrop-blur-2xl">
            
            {/* Story Progress Bar */}
            <div className="flex gap-2 mb-8">
               {steps.map((_, idx) => (
                 <div 
                   key={idx} 
                   className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${idx <= onboardingStep ? 'bg-slate-900' : 'bg-slate-900/10'}`}
                 />
               ))}
            </div>

            <div className="flex flex-col items-center text-center">
               <div className="text-8xl mb-6 animate-pop filter drop-shadow-lg">
                 {currentStep.emoji}
               </div>
               
               <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
                 {currentStep.title}
               </h2>
               
               <p className="text-slate-600 text-lg font-medium leading-relaxed mb-8">
                 {currentStep.desc}
               </p>

               {currentStep.action && (
                 <div className="w-full mb-6">
                    {notificationPermission === 'default' ? (
                      <button 
                        onClick={requestNotificationPermission}
                        className="w-full bg-yellow-300 hover:bg-yellow-400 text-slate-900 font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]"
                      >
                        <Bell className="fill-slate-900" size={20} />
                        Turn on Notifs
                      </button>
                    ) : (
                      <div className="w-full bg-green-100 text-green-700 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 border border-green-200">
                        <CheckCircle2 size={20} />
                        You're all set!
                      </div>
                    )}
                 </div>
               )}
            </div>

            <div className="mt-4">
               <button
                 onClick={() => {
                   if (onboardingStep < steps.length - 1) setOnboardingStep(prev => prev + 1);
                   else completeOnboarding();
                 }}
                 className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xl font-bold py-5 rounded-3xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
               >
                 {currentStep.buttonText}
                 <ArrowRight size={24} />
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
        <div className="w-full max-w-md relative">
          
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/50 border border-white/60 text-sm font-bold text-slate-500 mb-4 backdrop-blur-md">
              Current Vibe: Hydrated 💧
            </span>
            <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
              Water &<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-fuchsia-600">Grow</span>
            </h1>
          </div>

          <div className="glass-panel rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
            {/* Decorative background blur */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-300 rounded-full blur-3xl opacity-50"></div>
            
            <div className="relative z-10 space-y-6">
              <div>
                <label className="block text-sm font-extrabold text-slate-900 ml-1 mb-2 uppercase tracking-wide">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="e.g. tacos-tuesday"
                  className="w-full px-6 py-5 bg-white/70 border-2 border-white/50 rounded-2xl focus:ring-4 focus:ring-fuchsia-200 focus:border-fuchsia-400 outline-none transition-all text-xl font-bold text-slate-900 placeholder-slate-400 shadow-inner"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-500 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-red-500"></div>
                   {error}
                </div>
              )}

              <button
                onClick={handleJoinRoom}
                disabled={loading || !roomId.trim()}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xl py-5 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" /> : <>Start Session 🚀</>}
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
        <div className="w-full max-w-lg">
          <h2 className="text-4xl font-extrabold text-slate-900 text-center mb-2">Pick Your Spot</h2>
          <p className="text-slate-500 text-center mb-10 text-lg font-medium">Which plant are you watering?</p>
          
          <div className="grid gap-5">
            {[
              { id: 'p1', label: 'Player One', color: 'bg-blue-100', icon: '🤠', border: 'hover:border-blue-400' },
              { id: 'p2', label: 'Player Two', color: 'bg-fuchsia-100', icon: '👽', border: 'hover:border-fuchsia-400' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => selectRole(opt.id as UserRole)}
                className={`group relative flex items-center p-6 bg-white/60 hover:bg-white/90 border-2 border-white ${opt.border} rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 text-left`}
              >
                <div className={`w-16 h-16 ${opt.color} rounded-2xl flex items-center justify-center text-3xl mr-6 shadow-inner group-hover:scale-110 transition-transform`}>
                  {opt.icon}
                </div>
                <div>
                  <span className="block text-xl font-bold text-slate-900">{opt.label}</span>
                  <span className="text-slate-500 font-medium text-sm">Tap to select</span>
                </div>
                <div className="absolute right-8 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                  <ArrowRight className="text-slate-900" />
                </div>
              </button>
            ))}
          </div>
          
          <button 
             onClick={() => setView('JOIN')}
             className="w-full mt-8 text-slate-400 hover:text-slate-600 font-bold py-2 transition-colors uppercase tracking-widest text-xs"
          >
            Switch Room
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
      <div className="min-h-screen flex flex-col relative overflow-hidden">
        
        {/* Success Overlay */}
        {showSuccess && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-md animate-in fade-in">
             <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm mx-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-yellow-100/50 -z-10"></div>
                <div className="text-6xl mb-4 animate-bounce">☕️</div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Thanks Bestie!</h3>
                <p className="text-slate-600 mb-6">Your donation keeps our plants watered and servers running.</p>
                <button 
                  onClick={() => setShowSuccess(false)}
                  className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:scale-105 transition-transform"
                >
                  You're Welcome
                </button>
             </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative bg-white/80 border border-white">
              <button 
                onClick={() => setShowPayment(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex flex-col items-center text-center pt-4">
                <div className="w-20 h-20 bg-gradient