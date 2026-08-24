import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, Wind, Droplets, Sun, CloudLightning, AlertTriangle, Info, Calendar } from 'lucide-react';
import { db } from '@/db/database';
import { cn } from '@/utils';
import { WeatherData } from '@/types';
import PrototypeNotice from '@/components/PrototypeNotice';

export default function WeatherPage() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const data = await db.weather.toArray();
        if (data && data.length > 0) {
          setWeatherData(data[data.length - 1]);
        } else {
          // Hardcoded demo
          setWeatherData({
            updatedAt: new Date().toISOString(),
            temperature: 28,
            humidity: 78,
            rainfall: 12,
            windSpeed: 8,
            windDirection: 'SW',
            condition: 'Partly Cloudy',
            icon: 'partly-cloudy',
            location: 'Tamil Nadu',
            isOffline: false
          });
        }
      } catch (err) {
        console.error('Failed to load weather:', err);
      }
    };
    loadWeather();
  }, []);

  const forecast = [
    { day: 'Tomorrow', temp: 29, condition: 'Sunny', icon: Sun },
    { day: 'Day 3', temp: 27, condition: 'Rain', icon: CloudRain },
    { day: 'Day 4', temp: 26, condition: 'Heavy Rain', icon: CloudLightning },
    { day: 'Day 5', temp: 28, condition: 'Cloudy', icon: Cloud },
    { day: 'Day 6', temp: 30, condition: 'Sunny', icon: Sun },
  ];

  if (!weatherData) return <div className="p-8 text-center text-green-800">Loading Weather...</div>;

  const isFungalRisk = weatherData.humidity > 75 && weatherData.rainfall > 10;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <PrototypeNotice>Forecast values on this page are sample data, not a live weather feed.</PrototypeNotice>
      <h1 className="text-3xl font-bold text-green-900 mb-6">Agri-Weather Forecast</h1>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 animate-pulse">
        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-red-800">Extreme Weather Warning</h3>
          <p className="text-sm text-red-700">A cyclonic storm is expected to hit coastal areas in the next 48 hours. Secure all farm equipment and ensure proper drainage for crops.</p>
        </div>
      </div>

      {isOffline && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md flex items-start gap-3">
          <AlertTriangle className="text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-yellow-700">
            <strong>Offline</strong> — showing last available weather data.
          </p>
        </div>
      )}

      {isFungalRisk && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 shadow-sm">
          <AlertTriangle className="text-red-500 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Fungal Disease Risk Warning</h3>
            <p className="text-sm text-red-700">
              High humidity ({weatherData.humidity}%) and recent rainfall ({weatherData.rainfall}mm) create optimal conditions for fungal growth. Monitor crops closely.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Cloud className="text-green-600" /> Current Conditions
          </h2>
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-5xl font-bold text-gray-900">{weatherData.temperature}°C</div>
              <div className="text-lg text-gray-500 capitalize">{weatherData.condition}</div>
            </div>
            <Sun className="w-20 h-20 text-yellow-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
              <Droplets className="text-blue-500" />
              <div>
                <div className="text-sm text-gray-500">Humidity</div>
                <div className="font-semibold text-gray-800">{weatherData.humidity}%</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
              <CloudRain className="text-blue-400" />
              <div>
                <div className="text-sm text-gray-500">Rainfall</div>
                <div className="font-semibold text-gray-800">{weatherData.rainfall}mm</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
              <Wind className="text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Wind</div>
                <div className="font-semibold text-gray-800">{weatherData.windSpeed} km/h</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
              <Info className="text-green-500" />
              <div>
                <div className="text-sm text-gray-500">Direction</div>
                <div className="font-semibold text-gray-800">{weatherData.windDirection}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Calendar className="text-green-600" /> 5-Day Forecast
          </h2>
          <div className="flex-1 flex flex-col justify-between gap-3">
            {forecast.map((day, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100">
                <span className="font-medium text-gray-700 w-24">{day.day}</span>
                <div className="flex items-center gap-3 w-32">
                  <day.icon className={cn("w-5 h-5", day.condition.includes('Rain') ? 'text-blue-500' : 'text-yellow-500')} />
                  <span className="text-sm text-gray-600">{day.condition}</span>
                </div>
                <span className="font-bold text-gray-900">{day.temp}°C</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
        <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
          <Info className="w-5 h-5" /> Agricultural Insights
        </h3>
        <ul className="space-y-2 text-green-800">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">•</span> 
            Current temperature ({weatherData.temperature}°C) is optimal for vegetative growth of paddy.
          </li>
          {weatherData.rainfall > 0 && (
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span> 
              Recent rainfall reduces irrigation requirements. Save water resources.
            </li>
          )}
          {weatherData.windSpeed < 10 && (
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span> 
              Low wind speeds make it an ideal time for necessary foliar sprays.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
