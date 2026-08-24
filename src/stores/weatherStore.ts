import { create } from 'zustand';
import { WeatherData, WeatherForecast } from '@/types';
import { db } from '@/db/database';

interface WeatherState {
  weather: WeatherData | null;
  forecast: WeatherForecast[];
  loading: boolean;
  isOffline: boolean;
  loadWeather: () => Promise<void>;
  updateWeather: (data: WeatherData) => Promise<void>;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  weather: null,
  forecast: [],
  loading: false,
  isOffline: false,
  loadWeather: async () => {
    set({ loading: true });
    const records = await db.weather.toArray();
    if (records.length > 0) {
      set({ weather: records[0], isOffline: records[0].isOffline, loading: false });
    } else {
      set({ loading: false });
    }
  },
  updateWeather: async (data) => {
    await db.weather.clear();
    await db.weather.add(data);
    set({ weather: data, isOffline: data.isOffline });
  }
}));
