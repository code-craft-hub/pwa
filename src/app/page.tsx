import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-2 sm:p-6 shadow-2xl border border-white/30 text-center">
          {/* Logo/Emoji */}
          <div className="text-7xl mb-6">🌦️</div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-4">
            School Weather Check
          </h1>
          <h1 className="text-2xl font-bold text-white mb-4">
            CIS 435 - Mobile Application Development
          </h1>

          {/* Description */}
          <p className="text-xl text-blue-100 mb-8">
            Check if it will rain today and decide whether to go to school
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-3xl mb-2">📍</p>
              <p className="text-white font-semibold">Auto-Detect Location</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-3xl mb-2">☔</p>
              <p className="text-white font-semibold">Rain Forecast</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-white font-semibold">Smart Decision</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-3xl mb-2">🔊</p>
              <p className="text-white font-semibold">Text to Speech</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-3xl mb-2">✨</p>
              <p className="text-white font-semibold">Cloud Voices</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-3xl mb-2">📵</p>
              <p className="text-white font-semibold">Works Offline</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <Link href="/weather" className="block">
              <button className="w-full bg-linear-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-xl transition transform hover:scale-105 text-lg">
                🚀 Check Weather Now
              </button>
            </Link>
            <Link href="/tts" className="block">
              <button className="w-full bg-linear-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-4 px-8 rounded-xl transition transform hover:scale-105 text-lg">
                🔊 Text to Speech Reader
              </button>
            </Link>
          </div>

          {/* Footer Note */}
          <div className="mt-8 pt-8 border-t border-white/20">
            <p className="text-blue-100 text-sm mb-4">
              Stay informed. Make smart decisions. 🎓
            </p>
            <div className="flex flex-col gap-2 text-xs text-blue-100">
              <p>
                📚 <strong>Course:</strong> CIS 435 - Mobile Application Development
              </p>
              <p>👤 <strong>Student:</strong> Kachi (400L)</p>
              <p>👤 <strong>Lecturer:</strong> Mrs. Chinwe</p>
              <p>🏫 <strong>Institution:</strong> COOU</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
