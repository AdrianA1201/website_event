import React, { useState, useEffect } from 'react';
import { Moon, Clock } from 'lucide-react';

export default function IftarCountdown() {
  const [maghribTime, setMaghribTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  useEffect(() => {
    const fetchPrayerTimes = async (lat: number, lng: number) => {
      try {
        const date = new Date();
        const dateString = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
        
        // Using Aladhan API (free, no key required)
        const response = await fetch(`https://api.aladhan.com/v1/timings/${dateString}?latitude=${lat}&longitude=${lng}&method=2`);
        const data = await response.json();
        
        if (data.code === 200) {
          const maghribStr = data.data.timings.Maghrib; // e.g. "18:30"
          let timezone = data.data.meta.timezone;
          
          // Parse Maghrib time into a Date object for today
          const [hours, minutes] = maghribStr.split(':').map(Number);
          const maghribDate = new Date();
          maghribDate.setHours(hours, minutes, 0, 0);
          
          setMaghribTime(maghribDate);
          
          // Format timezone string (e.g., "Asia/Jakarta" -> "Jakarta")
          const city = timezone.split('/')[1]?.replace('_', ' ') || 'Local';
          setLocationName(city);
        } else {
          setError('Failed to load prayer times');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchPrayerTimes(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.warn("Geolocation denied or failed, using default (Jakarta).", err);
          fetchPrayerTimes(-6.2088, 106.8456); // Default to Jakarta
        }
      );
    } else {
      fetchPrayerTimes(-6.2088, 106.8456);
    }
  }, []);

  useEffect(() => {
    if (!maghribTime) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = maghribTime.getTime() - now.getTime();

      if (diff <= 0) {
        // If Maghrib has passed today
        if (diff > -3600000) { // Within 1 hour after Maghrib
          setTimeLeft('It is Iftar Time! 🌙');
        } else {
          setTimeLeft('Fasting completed today');
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    updateCountdown(); // Initial call
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [maghribTime]);

  if (loading) {
    return (
      <div className="flex items-center bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 w-fit">
        <Clock className="w-4 h-4 text-indigo-400 mr-2 animate-spin" />
        <span className="text-xs text-indigo-600 font-medium">Loading Iftar time...</span>
      </div>
    );
  }

  if (error) return null;

  return (
    <div className="flex items-center bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm w-fit">
      <Moon className="w-4 h-4 text-indigo-600 mr-2" />
      <div className="flex flex-col justify-center">
        <span className="text-[10px] text-indigo-800 font-semibold leading-none mb-0.5 uppercase tracking-wider">
          Iftar in {locationName}
        </span>
        <span className="text-sm font-bold text-indigo-600 leading-none tabular-nums">
          {timeLeft}
        </span>
      </div>
    </div>
  );
}
