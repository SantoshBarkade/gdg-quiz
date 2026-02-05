"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// 🟢 CONFIGURATION
const API_URL = "https://gdg-quiz.onrender.com/api";

function UserJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    }
  }, [searchParams]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!name.trim() || !code.trim()) {
      setError("Please enter both your name and the session code.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/participants/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sessionCode: code.trim().toUpperCase(),
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        if (res.status === 404)
          throw new Error("Session not found. Check code or URL.");
        throw new Error(`Server Error: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem("SESSION_CODE", code.trim().toUpperCase());
        sessionStorage.setItem("PARTICIPANT_ID", data.data.participantId);
        sessionStorage.setItem("PLAYER_NAME", data.data.name);

        if (data.data.sessionStatus === "ACTIVE") {
           router.push("/play");
        } else {
           router.push("/play/lobby");
        }
      } else {
        setError(data.message || "Failed to join session.");
      }
    } catch (err) {
      console.error("Join Error:", err);
      setError(err.message || "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white font-sans p-4 relative overflow-hidden">
      {/* 🟢 Linear Grid Background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(8, 75, 162, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(8, 75, 162, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}></div>

      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 z-10 animate-fade-up"
        style={{ borderTop: "6px solid #4285F4" }}
      >
        <div className="text-center mb-8">
          {/* 🟢 CHANGED: Replaced Emoji with Logo Image */}
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 p-2">
            <img src="/assests/logo.png" alt="GDG Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>Join the Quiz</h1>
          <p className="text-gray-500 text-sm mt-1">
            Enter your details to enter the arena
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Display Name
            </label>
            <input
              required
              type="text"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="e.g. Maverick"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Session Code
            </label>
            <input
              required
              type="text"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono tracking-wider transition-all"
              placeholder="CODE"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm text-center rounded-lg border border-red-100 animate-pulse">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? "Joining..." : "Enter Room"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
      
      {/* 🟢 Load Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet" />
      
      <style jsx global>{`
        body { font-family: 'Poppins', sans-serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up { animation: fadeUp 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}

const LoadingGrid = () => (
  <div className="min-h-screen flex items-center justify-center bg-white font-sans p-4 relative overflow-hidden">
    <div className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(8, 75, 162, 0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(8, 75, 162, 0.08) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }}></div>
    <div className="relative z-10 p-8 bg-white rounded-2xl shadow-xl border-t-4 border-blue-500">
       <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
       <h2 className="text-gray-600 font-bold">Loading...</h2>
    </div>
  </div>
);

export default function UserJoin() {
  return (
    <Suspense fallback={<LoadingGrid />}>
      <UserJoinContent />
    </Suspense>
  );
}