export default function StudentInfo() {
  return (
    <div className="mt-8 bg-white/20 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/30">
      <h3 className="text-2xl font-bold text-white mb-6 text-center">
        📚 Course Information
      </h3>

      <div className="grid gap-6">
        {/* Course */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
          <p className="text-blue-100 text-sm mb-1">📖 Course</p>
          <p className="text-white text-xl font-bold">CIS 435 - Mobile Application Development</p>
        </div>

        {/* Student Info */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
          <p className="text-blue-100 text-sm mb-1">👤 Student</p>
          <p className="text-white text-xl font-bold">Kachi</p>
          <p className="text-blue-100 text-sm mt-1">Level: 400L</p>
        </div>

        {/* Lecturer Info */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
          <p className="text-blue-100 text-sm mb-1">👨‍🏫 Lecturer</p>
          <p className="text-white text-xl font-bold">Mrs. Chinwe</p>
        </div>

        {/* Institution */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
          <p className="text-blue-100 text-sm mb-1">🏫 Institution</p>
          <p className="text-white text-xl font-bold">COOU</p>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-6 p-4 bg-blue-500/30 rounded-xl text-center">
        <p className="text-white text-sm">
          Check the weather before heading to class! ☀️
        </p>
      </div>
    </div>
  );
}
