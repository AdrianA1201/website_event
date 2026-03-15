import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Dices, Users, RefreshCw, Trophy, Hash, Settings, Check, RotateCcw, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Team {
  id: string;
  name: string;
}

export default function RandomTools() {
  const [activeTab, setActiveTab] = useState<'number' | 'team' | 'wheel'>('number');
  
  // Random Number Generator State
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [randomNumber, setRandomNumber] = useState<number | null>(null);
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false);

  // Random Team Chooser State
  const [teams, setTeams] = useState<Team[]>([]);
  const [pickCount, setPickCount] = useState(1);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [isChoosingTeams, setIsChoosingTeams] = useState(false);
  const [pickedTeamIds, setPickedTeamIds] = useState<Set<string>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Picker Wheel State
  const [wheelMin, setWheelMin] = useState(1);
  const [wheelMax, setWheelMax] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [selectedWheelNumber, setSelectedWheelNumber] = useState<number | null>(null);

  useEffect(() => {
    const unsubTeams = onSnapshot(query(collection(db, 'teams')), (snapshot) => {
      const t: Team[] = [];
      snapshot.forEach((doc) => {
        t.push({ ...doc.data() as Team, id: doc.id });
      });
      setTeams(t);
    });

    return () => unsubTeams();
  }, []);

  const generateRandomNumber = () => {
    if (min >= max) {
      alert('Minimum must be less than maximum');
      return;
    }
    setIsGeneratingNumber(true);
    setRandomNumber(null);
    
    // Animation effect
    let count = 0;
    const interval = setInterval(() => {
      setRandomNumber(Math.floor(Math.random() * (max - min + 1)) + min);
      count++;
      if (count > 20) {
        clearInterval(interval);
        setRandomNumber(Math.floor(Math.random() * (max - min + 1)) + min);
        setIsGeneratingNumber(false);
      }
    }, 50);
  };

  const chooseRandomTeams = () => {
    const availableTeams = teams.filter(t => !pickedTeamIds.has(t.id));
    
    if (availableTeams.length === 0) {
      alert('All teams have already been picked! Reset the list in settings to pick again.');
      return;
    }
    
    if (pickCount > availableTeams.length) {
      alert(`Only ${availableTeams.length} teams left to pick from.`);
      return;
    }

    setIsChoosingTeams(true);
    setSelectedTeams([]);

    // Shuffle available teams and pick
    setTimeout(() => {
      const shuffled = [...availableTeams].sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, pickCount);
      setSelectedTeams(picked);
      
      // Update picked IDs
      setPickedTeamIds(prev => {
        const next = new Set(prev);
        picked.forEach(t => next.add(t.id));
        return next;
      });
      
      setIsChoosingTeams(false);
    }, 1000);
  };

  const toggleTeamPicked = (teamId: string) => {
    setPickedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const resetPickedTeams = () => {
    if (window.confirm('Are you sure you want to reset the picked status for all teams?')) {
      setPickedTeamIds(new Set());
    }
  };

  const spinWheel = () => {
    if (wheelMin >= wheelMax) {
      alert('Minimum must be less than maximum');
      return;
    }
    const range = wheelMax - wheelMin + 1;
    if (range > 200) {
      alert('Maximum 200 items allowed on the wheel for performance.');
      return;
    }

    setIsSpinning(true);
    setSelectedWheelNumber(null);

    const winningNumber = Math.floor(Math.random() * range) + wheelMin;
    const winningIndex = winningNumber - wheelMin;
    
    const sliceAngle = 360 / range;
    const extraSpins = 5 * 360; // 5 full rotations
    
    // Calculate the exact rotation needed to land on the center of the winning slice
    const targetSliceCenter = winningIndex * sliceAngle + sliceAngle / 2;
    const requiredRotation = 360 - targetSliceCenter;
    
    // Add to current rotation to ensure it always spins forward
    const currentRotMod = wheelRotation % 360;
    const nextRotation = wheelRotation + extraSpins + ((requiredRotation - currentRotMod + 360) % 360);

    setWheelRotation(nextRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setSelectedWheelNumber(winningNumber);
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Random Generator Tools</h1>
        <p className="mt-2 text-sm text-gray-500">Pick a tool to help manage your event.</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
        <button
          onClick={() => setActiveTab('number')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'number'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Hash className="w-4 h-4" />
          Random Number
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'team'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Random Team
        </button>
        <button
          onClick={() => setActiveTab('wheel')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'wheel'
              ? 'bg-white text-pink-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Picker Wheel
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'number' ? (
          <motion.div
            key="number-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
              <Hash className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Number Generator</h2>
            
            <div className="grid grid-cols-2 gap-6 w-full max-w-sm mb-10">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Min Value</label>
                <input
                  type="number"
                  value={min}
                  onChange={(e) => setMin(parseInt(e.target.value) || 0)}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-lg font-bold outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Max Value</label>
                <input
                  type="number"
                  value={max}
                  onChange={(e) => setMax(parseInt(e.target.value) || 0)}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-lg font-bold outline-none transition-all"
                />
              </div>
            </div>

            <div className="h-48 flex items-center justify-center mb-10">
              <AnimatePresence mode="wait">
                {randomNumber !== null ? (
                  <motion.div
                    key={randomNumber}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-8xl font-black text-indigo-600 drop-shadow-sm"
                  >
                    {randomNumber}
                  </motion.div>
                ) : (
                  <div className="text-gray-300 text-xl font-medium italic">Ready to generate</div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={generateRandomNumber}
              disabled={isGeneratingNumber}
              className="w-full max-w-sm py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-indigo-200"
            >
              {isGeneratingNumber ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Dices className="w-6 h-6" />}
              GENERATE
            </button>
          </motion.div>
        ) : activeTab === 'team' ? (
          <motion.div
            key="team-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 relative">
              <Users className="w-8 h-8 text-emerald-600" />
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`absolute -right-2 -top-2 p-2 rounded-full shadow-md transition-all ${
                  isSettingsOpen ? 'bg-emerald-600 text-white' : 'bg-white text-gray-400 hover:text-emerald-600'
                }`}
              >
                <Settings className={`w-4 h-4 ${isSettingsOpen ? 'animate-spin-slow' : ''}`} />
              </button>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Team Chooser</h2>
            
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-full max-w-sm mb-8 overflow-hidden"
                >
                  <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Pick Status</span>
                      <button
                        onClick={resetPickedTeams}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 uppercase tracking-tighter"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset All
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {teams.map(team => (
                        <label
                          key={team.id}
                          className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer transition-colors group"
                        >
                          <span className={`text-sm font-medium ${pickedTeamIds.has(team.id) ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                            {team.name}
                          </span>
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={pickedTeamIds.has(team.id)}
                              onChange={() => toggleTeamPicked(team.id)}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                              pickedTeamIds.has(team.id) 
                                ? 'bg-emerald-600 border-emerald-600' 
                                : 'border-gray-200 group-hover:border-emerald-300'
                            }`}>
                              {pickedTeamIds.has(team.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full max-w-sm mb-10">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Number of teams to pick</label>
              <input
                type="number"
                min="1"
                max={teams.length - pickedTeamIds.size}
                value={pickCount}
                onChange={(e) => setPickCount(Math.min(teams.length - pickedTeamIds.size, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl text-lg font-bold text-center outline-none transition-all"
              />
              <p className="text-center text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-tighter">
                Available: {teams.length - pickedTeamIds.size} / Total: {teams.length}
              </p>
            </div>

            <div className="w-full max-w-sm mb-10 min-h-[160px]">
              <AnimatePresence mode="wait">
                {isChoosingTeams ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full gap-4 text-emerald-600"
                  >
                    <RefreshCw className="w-12 h-12 animate-spin" />
                    <span className="text-lg font-black tracking-widest uppercase">Picking...</span>
                  </motion.div>
                ) : selectedTeams.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTeams.map((team, idx) => (
                      <motion.div
                        key={team.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100"
                      >
                        <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-black">
                          {idx + 1}
                        </div>
                        <span className="text-lg font-bold text-emerald-900">{team.name}</span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300 text-xl font-medium italic">
                    Ready to pick
                  </div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={chooseRandomTeams}
              disabled={isChoosingTeams || teams.length === 0}
              className="w-full max-w-sm py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-emerald-200"
            >
              {isChoosingTeams ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Trophy className="w-6 h-6" />}
              PICK TEAMS
            </button>
          </motion.div>
        ) : activeTab === 'wheel' ? (
          <motion.div
            key="wheel-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 flex flex-col items-center overflow-hidden"
          >
            <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mb-6">
              <PieChart className="w-8 h-8 text-pink-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Picker Wheel</h2>
            
            <div className="grid grid-cols-2 gap-6 w-full max-w-sm mb-10">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Min Value</label>
                <input
                  type="number"
                  value={wheelMin}
                  onChange={(e) => setWheelMin(parseInt(e.target.value) || 0)}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-pink-500 rounded-2xl text-lg font-bold outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Max Value</label>
                <input
                  type="number"
                  value={wheelMax}
                  onChange={(e) => setWheelMax(parseInt(e.target.value) || 0)}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-pink-500 rounded-2xl text-lg font-bold outline-none transition-all"
                />
              </div>
            </div>

            <div className="relative w-[300px] h-[300px] mx-auto mb-10">
              {/* Pointer */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 text-gray-800 drop-shadow-md">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L20 10H4L12 2Z" />
                </svg>
              </div>
              
              {/* Wheel */}
              <motion.div 
                className="w-full h-full rounded-full overflow-hidden border-4 border-gray-800 shadow-xl"
                animate={{ rotate: wheelRotation }}
                transition={{ duration: 3, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <svg width="300" height="300" viewBox="0 0 300 300">
                  {wheelMax > wheelMin && wheelMax - wheelMin + 1 <= 200 && Array.from({ length: wheelMax - wheelMin + 1 }).map((_, i) => {
                    const range = wheelMax - wheelMin + 1;
                    const sliceAngle = 360 / range;
                    const radius = 150;
                    const center = 150;
                    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
                    
                    const startAngle = (i * sliceAngle * Math.PI) / 180;
                    const endAngle = ((i + 1) * sliceAngle * Math.PI) / 180;
                    
                    const x1 = center + radius * Math.sin(startAngle);
                    const y1 = center - radius * Math.cos(startAngle);
                    const x2 = center + radius * Math.sin(endAngle);
                    const y2 = center - radius * Math.cos(endAngle);
                    
                    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                    
                    const pathData = [
                      `M ${center} ${center}`,
                      `L ${x1} ${y1}`,
                      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                      'Z'
                    ].join(' ');

                    const textAngle = (i * sliceAngle + sliceAngle / 2);
                    const textRadius = radius * 0.75;
                    const textX = center + textRadius * Math.sin((textAngle * Math.PI) / 180);
                    const textY = center - textRadius * Math.cos((textAngle * Math.PI) / 180);

                    return (
                      <g key={i}>
                        <path d={pathData} fill={colors[i % colors.length]} stroke="#1f2937" strokeWidth={range > 100 ? "0.5" : "1"} />
                        {range <= 60 && (
                          <text 
                            x={textX} 
                            y={textY} 
                            fill="white" 
                            fontSize={range > 30 ? "10" : "14"} 
                            fontWeight="bold" 
                            textAnchor="middle" 
                            dominantBaseline="middle"
                            transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                          >
                            {wheelMin + i}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  {/* Handle range = 1 or invalid */}
                  {(wheelMax <= wheelMin || wheelMax - wheelMin + 1 > 200) && (
                    <circle cx="150" cy="150" r="150" fill="#e5e7eb" />
                  )}
                </svg>
              </motion.div>

              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full border-4 border-gray-800 shadow-sm z-10" />
            </div>

            <AnimatePresence mode="wait">
              {selectedWheelNumber !== null && !isSpinning && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-black text-pink-600 mb-6 drop-shadow-sm"
                >
                  Result: {selectedWheelNumber}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={spinWheel}
              disabled={isSpinning || wheelMin >= wheelMax || wheelMax - wheelMin + 1 > 200}
              className="w-full max-w-sm py-5 bg-pink-600 text-white rounded-2xl font-black text-lg hover:bg-pink-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-pink-200"
            >
              {isSpinning ? <RefreshCw className="w-6 h-6 animate-spin" /> : <PieChart className="w-6 h-6" />}
              SPIN WHEEL
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
