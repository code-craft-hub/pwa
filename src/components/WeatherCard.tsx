interface WeatherData {
  temp: number;
  description: string;
  rain: boolean;
  humidity: number;
  windSpeed: number;
  city: string;
}

interface WeatherCardProps {
  weather: WeatherData;
}

export default function WeatherCard({ weather }: WeatherCardProps) {
  const getWeatherEmoji = (description: string): string => {
    if (description.includes("rain") || description.includes("drizzle"))
      return "🌧️";
    if (description.includes("cloud")) return "☁️";
    if (description.includes("clear") || description.includes("sky"))
      return "☀️";
    if (description.includes("snow")) return "❄️";
    if (description.includes("fog")) return "🌫️";
    if (description.includes("thunder")) return "⛈️";
    return "🌤️";
  };

  return (
    <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/30">
      {/* Location */}
      <div className="text-center mb-6">
        <p className="text-blue-100 text-xl mb-2">📍 {weather.city}</p>
        <p className="text-white/80 font-semibold">{weather.description}</p>
      </div>

      {/* Temperature */}
      <div className="text-center mb-8">
        <div className="text-6xl font-bold text-white mb-2">
          {getWeatherEmoji(weather.description)}
        </div>
        <div className="text-7xl font-bold text-white mb-2">
          {weather.temp}°C
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
          <p className="text-blue-100 text-sm mb-1">Humidity</p>
          <p className="text-white text-2xl font-bold">{weather.humidity}%</p>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
          <p className="text-blue-100 text-sm mb-1">Wind Speed</p>
          <p className="text-white text-2xl font-bold">
            {weather.windSpeed} m/s
          </p>
        </div>
      </div>

      {/* Rain Status */}
      <div className="mt-6 text-center">
        <div
          className={`inline-block px-6 py-2 rounded-full font-bold ${
            weather.rain
              ? "bg-red-500/40 text-red-100"
              : "bg-green-500/40 text-green-100"
          }`}
        >
          {weather.rain ? "🌧️ Rain Expected" : "✅ No Rain"}
        </div>
      </div>
    </div>
  );
}
