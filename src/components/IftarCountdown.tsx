import React, { useState, useEffect, useRef } from 'react';
import { Moon, Clock, MapPin, Volume2, VolumeX, ChevronDown } from 'lucide-react';

const CITIES = [
  { name: 'Auto (Current Location)', value: 'auto' },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
  { name: 'Bandar Lampung', lat: -5.4500, lng: 105.2667 },
  { name: 'Surabaya', lat: -7.2504, lng: 112.7688 },
  { name: 'Bandung', lat: -6.9175, lng: 107.6191 },
  { name: 'Medan', lat: 3.5952, lng: 98.6722 },
  { name: 'Makassar', lat: -5.1477, lng: 119.4327 },
  { name: 'Mecca', lat: 21.3891, lng: 39.8579 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
];

export default function IftarCountdown() {
  const [maghribTime, setMaghribTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  const [showMenu, setShowMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('auto');

  const menuRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayedSecondRef = useRef<number | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch prayer times
  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchPrayerTimes = async (lat: number, lng: number, customName?: string) => {
      try {
        const date = new Date();
        const dateString = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
        
        const response = await fetch(`https://api.aladhan.com/v1/timings/${dateString}?latitude=${lat}&longitude=${lng}&method=2`);
        const data = await response.json();
        
        if (data.code === 200) {
          const maghribStr = data.data.timings.Maghrib;
          let timezone = data.data.meta.timezone;
          
          const [hours, minutes] = maghribStr.split(':').map(Number);
          const maghribDate = new Date();
          maghribDate.setHours(hours, minutes, 0, 0);
          
          setMaghribTime(maghribDate);
          
          if (customName) {
            setLocationName(customName);
          } else {
            try {
              // Use a free reverse geocoding API to get the actual city name
              const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
              const geoData = await geoRes.json();
              const city = geoData.city || geoData.locality || geoData.principalSubdivision || timezone.split('/')[1]?.replace('_', ' ') || 'Local';
              setLocationName(city);
            } catch (e) {
              // Fallback to timezone name if geocoding fails
              const city = timezone.split('/')[1]?.replace('_', ' ') || 'Local';
              setLocationName(city);
            }
          }
        } else {
          setError('Failed to load prayer times');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    if (selectedCity === 'auto') {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            fetchPrayerTimes(position.coords.latitude, position.coords.longitude);
          },
          (err) => {
            console.warn("Geolocation denied or failed, using default (Jakarta).", err);
            fetchPrayerTimes(-6.2088, 106.8456, 'Jakarta');
          }
        );
      } else {
        fetchPrayerTimes(-6.2088, 106.8456, 'Jakarta');
      }
    } else {
      const city = CITIES.find(c => c.value === selectedCity || c.name === selectedCity);
      if (city && city.lat && city.lng) {
        fetchPrayerTimes(city.lat, city.lng, city.name);
      }
    }
  }, [selectedCity]);

  // Play tick sound
  const playTick = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  // Play Adhan/Long beep at exactly 0
  const playIftarSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0); // 2 second beep
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.0);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!maghribTime) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = maghribTime.getTime() - now.getTime();

      if (diff <= 0) {
        if (diff > -3600000) {
          setTimeLeft('It is Iftar Time! 🌙');
          // Play long sound exactly when it hits 0 (within the first second)
          if (diff > -1000 && soundEnabled) {
             const currentSecond = 0;
             if (lastPlayedSecondRef.current !== currentSecond) {
               playIftarSound();
               lastPlayedSecondRef.current = currentSecond;
             }
          }
        } else {
          setTimeLeft('Fasting completed today');
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);

        // Play tick if <= 30 seconds
        if (diff <= 30000 && soundEnabled) {
          const currentSecond = Math.floor(diff / 1000);
          if (lastPlayedSecondRef.current !== currentSecond) {
            playTick();
            lastPlayedSecondRef.current = currentSecond;
          }
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [maghribTime, soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    // Initialize audio context on user interaction to bypass browser autoplay policies
    if (!soundEnabled && !audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Main Pill Button */}
      <button 
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm hover:bg-indigo-100 transition-colors w-fit text-left"
      >
        {loading ? (
          <Clock className="w-4 h-4 text-indigo-400 mr-2 animate-spin flex-shrink-0" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 mr-2 flex-shrink-0" />
        )}
        <div className="flex flex-col justify-center">
          <span className="text-[10px] text-indigo-800 font-semibold leading-none mb-0.5 uppercase tracking-wider flex items-center gap-1">
            Iftar in {locationName || '...'}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </span>
          <span className="text-sm font-bold text-indigo-600 leading-none tabular-nums">
            {loading ? 'Loading...' : error ? 'Error' : timeLeft}
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 bg-indigo-50/50 border-b border-gray-100">
            <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              <Moon className="w-4 h-4" />
              Ramadan Settings
            </h4>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Location Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location
              </label>
              <select 
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full text-sm border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
              >
                {CITIES.map((city) => (
                  <option key={city.name} value={city.value || city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sound Toggle */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                Alert Sound
              </label>
              <button
                onClick={toggleSound}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  soundEnabled 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>Play sound at 30s</span>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${soundEnabled ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
              <p className="text-[10px] text-gray-400 leading-tight">
                Plays a ticking sound during the last 30 seconds and a chime at Iftar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

