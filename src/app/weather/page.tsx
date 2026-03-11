"use client";

import { useState, useEffect } from "react";
import WeatherCard from "@/components/WeatherCard";
import StudentInfo from "@/components/StudentInfo";
import Link from "next/link";

interface WeatherData {
  temp: number;
  description: string;
  rain: boolean;
  humidity: number;
  windSpeed: number;
  city: string;
}

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const [useManualWeather, setUseManualWeather] = useState(false);
  const [manualRain, setManualRain] = useState(false);
  const [manualDescription, setManualDescription] = useState("Manually Set");

  useEffect(() => {
    if (!useManualLocation) {
      getWeatherDataByCoordinates();
    }
  }, [useManualLocation]);

  const getWeatherDataByCoordinates = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await fetchWeatherAndDisplay(latitude, longitude);
        } catch (err) {
          setError("Failed to fetch weather data");
          setLoading(false);
        }
      },
      (err) => {
        setError(
          "Unable to get your location. Please enable location services or use manual location entry.",
        );
        setLoading(false);
      },
    );
  };

  const getWeatherDataByLocation = async (locationName: string) => {
    if (!locationName.trim()) {
      setError("Please enter a location name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use Nominatim to get coordinates from location name
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
      );
      const geoData = await geoResponse.json();

      if (!geoData || geoData.length === 0) {
        setError("Location not found. Please try another search.");
        setLoading(false);
        return;
      }

      const { lat, lon } = geoData[0];
      await fetchWeatherAndDisplay(parseFloat(lat), parseFloat(lon));
    } catch (err) {
      setError("Failed to fetch location or weather data");
      setLoading(false);
    }
  };

  const fetchWeatherAndDisplay = async (
    latitude: number,
    longitude: number,
  ) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&timezone=auto`,
      );
      const data = await response.json();

      // Get city name from coordinates using reverse geocoding
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      );
      const geoData = await geoResponse.json();
      const city =
        geoData.address.city ||
        geoData.address.town ||
        geoData.address.village ||
        "Unknown Location";

      // Weather code interpretation
      const weatherCode = data.current.weather_code;
      const isRaining = weatherCode >= 51 && weatherCode <= 82; // Rain codes
      const description = getWeatherDescription(weatherCode);

      setWeather({
        temp: Math.round(data.current.temperature_2m),
        description,
        rain: isRaining,
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m * 10) / 10,
        city,
      });
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch weather data");
      setLoading(false);
    }
  };

  const getWeatherDescription = (code: number): string => {
    const descriptions: { [key: number]: string } = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Foggy with rime",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Heavy drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      85: "Slight snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with slight hail",
      99: "Thunderstorm with heavy hail",
    };
    return descriptions[code] || "Unknown";
  };

  const getDisplayWeather = (): WeatherData | null => {
    if (!weather) return null;

    if (useManualWeather) {
      return {
        ...weather,
        rain: manualRain,
        description: manualDescription,
      };
    }
    return weather;
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <Link href="/" className="text-4xl font-bold text-white mb-2">
            Weather Check
          </Link>
          <p className="text-blue-100">Should I go to school today?</p>
        </div>

        {/* Location Method Toggle */}
        <div className="mb-6 flex gap-2 justify-center flex-wrap">
          <button
            onClick={() => {
              setUseManualLocation(false);
              setError(null);
              setWeather(null);
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              !useManualLocation
                ? "bg-white text-blue-600"
                : "bg-white/30 text-white hover:bg-white/40"
            }`}
          >
            📍 Auto-Detect
          </button>
          <button
            onClick={() => setUseManualLocation(true)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              useManualLocation
                ? "bg-white text-blue-600"
                : "bg-white/30 text-white hover:bg-white/40"
            }`}
          >
            ✏️ Manual Entry
          </button>
        </div>

        {/* Manual Location Input */}
        {useManualLocation && (
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-2 sm:p-6 mb-6">
            <div className="flex gap-2 flex-col md:flex-row">
              <input
                type="text"
                placeholder="Enter city name (e.g., London, New York)"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    getWeatherDataByLocation(manualLocation);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-lg text-white placeholder-white/50 bg-white/10 border border-white/30 focus:outline-none focus:border-white transition"
              />
              <button
                onClick={() => getWeatherDataByLocation(manualLocation)}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </div>
        )}

        {/* Manual Weather Override Toggle */}
        {weather && !loading && (
          <div className="mb-6 p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
            <p className="text-white font-semibold mb-3 text-center">
              Weather Source
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => setUseManualWeather(false)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  !useManualWeather
                    ? "bg-white text-blue-600"
                    : "bg-white/30 text-white hover:bg-white/40"
                }`}
              >
                🌐 Actual Weather
              </button>
              <button
                onClick={() => setUseManualWeather(true)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  useManualWeather
                    ? "bg-white text-blue-600"
                    : "bg-white/30 text-white hover:bg-white/40"
                }`}
              >
                🎮 Override Weather
              </button>
            </div>
          </div>
        )}

        {/* Manual Weather Input */}
        {weather && !loading && useManualWeather && (
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-2 sm:p-6 mb-6">
            <p className="text-white font-semibold mb-4">
              Set Weather Condition
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setManualRain(false)}
                  className={`py-3 px-4 rounded-lg font-semibold transition ${
                    !manualRain
                      ? "bg-green-400 text-white"
                      : "bg-white/30 text-white hover:bg-white/40"
                  }`}
                >
                  ☀️ No Rain
                </button>
                <button
                  onClick={() => setManualRain(true)}
                  className={`py-3 px-4 rounded-lg font-semibold transition ${
                    manualRain
                      ? "bg-red-400 text-white"
                      : "bg-white/30 text-white hover:bg-white/40"
                  }`}
                >
                  🌧️ Rainy
                </button>
              </div>

              <input
                type="text"
                placeholder="Enter weather description (e.g., Sunny, Cloudy, Rainy)"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-white placeholder-white/50 bg-white/10 border border-white/30 focus:outline-none focus:border-white transition"
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-blue-200"></div>
            <p className="text-white mt-4 text-lg">Getting your weather...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6 text-center">
            <p className="font-semibold">{error}</p>
            <button
              onClick={() => {
                if (useManualLocation) {
                  setError(null);
                } else {
                  getWeatherDataByCoordinates();
                }
              }}
              className="mt-3 bg-white text-red-500 px-6 py-2 rounded-lg font-semibold hover:bg-red-50 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Weather Data */}
        {weather && !loading && (
          <>
            <WeatherCard weather={getDisplayWeather() || weather} />

            {/* Decision Box */}
            <div
              className={`mt-8 p-2 sm:p-6 rounded-2xl text-center ${
                getDisplayWeather()?.rain
                  ? "bg-red-500/90 backdrop-blur"
                  : "bg-green-500/90 backdrop-blur"
              }`}
            >
              <h2 className="text-2xl font-bold text-white mb-2">
                {getDisplayWeather()?.rain ? "🌧️ Stay Home" : "☀️ Go to School"}
              </h2>
              <p className="text-white text-lg">
                {getDisplayWeather()?.rain
                  ? "It will rain today, so you will NOT go to school."
                  : "No rain expected today, so you WILL go to school."}
              </p>
              {useManualWeather && (
                <p className="text-white/70 text-sm mt-3">
                  (Using manually set weather)
                </p>
              )}
            </div>

            {/* Student Info */}
            <StudentInfo />

            {/* Refresh Button */}
            <button
              onClick={() => {
                if (useManualLocation) {
                  getWeatherDataByLocation(manualLocation);
                } else {
                  getWeatherDataByCoordinates();
                }
              }}
              className="w-full mt-8 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-2"
            >
              <span>🔄</span> Refresh Weather
            </button>
          </>
        )}
      </div>
    </main>
  );
}
