import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { PlantRecord, UserRole, AppView } from './types';
import PlantStage from './components/PlantStage';
import { Droplets, Heart, Users, ArrowRight, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('JOIN');
  const [roomId, setRoomId] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [plantData, setPlantData] = useState<PlantRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or fetch room data
  const handleJoinRoom = async () => {
    if (!roomId.trim()) return;
    setLoading(true);
    setError(null);

    const cleanRoomId = roomId.trim().toLowerCase();

    try {
      // Check if room exists
      const { data, error: fetchError } = await supabase
        .from('plants')
        .select('*')
        .eq('room_id', cleanRoomId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Room doesn't exist, create it
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
        // Room exists
        setPlantData(data);
      }

      setRoomId(cleanRoomId);
      setView('ROLE');
    } catch (err: any) {
      console.error('Error joining room:', err);
      setError('Could not join room. Please try again.');
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
    setPlantData(null); // Clear data to prevent stale state on rejoin
    setView('JOIN');
  };

  // Subscribe to real-time updates when in GAME view
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

  const handleDrink = async () => {
    if (!role || !plantData) return;

    // Optimistic update for instant feedback
    const prevData = { ...plantData };
    const updatedCount = role === 'p1' ? plantData.p1_water + 1 : plantData.p2_water + 1;
    
    const updates = role === 'p1' 
      ? { p1_water: updatedCount, last_watered: new Date().toISOString() }
      : { p2_water: updatedCount, last_watered: new Date().toISOString() };

    setPlantData({
      ...plantData,
      ...updates
    } as PlantRecord);

    const { error: updateError } = await supabase
      .from('plants')
      .update(updates)
      .eq('room_id', roomId);

    if (updateError) {
      console.error('Error updating water count:', updateError);
      // Revert optimistic update on error
      setPlantData(prevData);
    }
  };

  // Render Logic

  if (view === 'JOIN') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 p-8 text-center">
            <div className="inline-flex bg-white/20 p-3 rounded-full mb-4">
              <Heart className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Water & Grow</h1>
            <p className="text-blue-100">Connect with your partner and grow together.</p>
          </div>
          
          <div className="p-8">
            <div className="mb-6">
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
                Room Name / Code
              </label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g. love-123"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <button
              onClick={handleJoinRoom}
              disabled={loading || !roomId.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Joining...
                </>
              ) : (
                <>
                  Start Growing
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'ROLE') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-emerald-600 p-8 text-center">
            <Users className="text-white mx-auto mb-4" size={40} />
            <h2 className="text-2xl font-bold text-white">Who are you?</h2>
            <p className="text-emerald-100 mt-2">Select your side of the garden.</p>
          </div>
          
          <div className="p-8 grid gap-4">
            <button
              onClick={() => selectRole('p1')}
              className="group relative flex items-center p-4 border-2 border-gray-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
            >
              <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl mr-4 group-hover:bg-emerald-200">
                <Users size={24} />
              </div>
              <div>
                <span className="block font-bold text-gray-800">Partner 1</span>
                <span className="text-sm text-gray-500">I'll manage the left plant</span>
              </div>
            </button>

            <button
              onClick={() => selectRole('p2')}
              className="group relative flex items-center p-4 border-2 border-gray-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
            >
              <div className="bg-blue-100 text-blue-600 p-3 rounded-xl mr-4 group-hover:bg-blue-200">
                <Users size={24} />
              </div>
              <div>
                <span className="block font-bold text-gray-800">Partner 2</span>
                <span className="text-sm text-gray-500">I'll manage the right plant</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'GAME' && plantData && role) {
    const myCount = role === 'p1' ? plantData.p1_water : plantData.p2_water;
    const partnerCount = role === 'p1' ? plantData.p2_water : plantData.p1_water;

    return (
      <div className="min-h-screen flex flex-col items-center p-6 bg-gradient-to-b from-blue-50 to-emerald-50">
        <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col">
          
          {/* Header */}
          <header className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 p-2 rounded-lg text-white">
                <Droplets size={20} />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 text-sm md:text-base">Room: {roomId}</h1>
                <p className="text-xs text-gray-500">Live Sync Active</p>
              </div>
            </div>
            <button 
              onClick={handleLeaveRoom}
              className="text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors"
            >
              Leave Room
            </button>
          </header>

          {/* Plants Grid */}
          <div className="grid grid-cols-2 gap-4 md:gap-12 mb-auto items-end justify-center pb-8">
            {/* My Plant */}
            <div className="order-1 md:order-1">
              <PlantStage 
                waterCount={myCount} 
                label="My Plant" 
                isOwner={true} 
              />
            </div>
            
            {/* Partner's Plant */}
            <div className="order-2 md:order-2">
              <PlantStage 
                waterCount={partnerCount} 
                label="Partner's Plant" 
                isOwner={false} 
              />
            </div>
          </div>

          {/* Action Area */}
          <div className="sticky bottom-6 mt-8 z-20">
            <div className="max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-3xl p-2 shadow-2xl border border-white/50">
              <button
                onClick={handleDrink}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:scale-95 text-white text-xl font-bold py-6 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-3"
              >
                <span className="bg-white/20 p-2 rounded-full">
                  <Droplets size={24} className="animate-bounce" />
                </span>
                Drink Water
              </button>
              <p className="text-center text-gray-400 text-xs mt-3 mb-1 font-medium">
                Tap to water your plant & notify your partner!
              </p>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );
};

export default App;