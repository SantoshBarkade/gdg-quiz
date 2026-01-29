"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// 🟢 CONFIGURATION
// ✅ Using your Cloud Backend
const API_URL = "https://gdgslio.onrender.com/api";

function UserJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill code from URL if present (e.g. ?code=JS101)
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
      // 🚀 REQUEST: Sending exactly what your backend controller expects
      const res = await fetch(`${API_URL}/participants/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sessionCode: code.trim().toUpperCase(),
          // Note: We do NOT send uniqueCode anymore, the backend generates it!
        }),
      });

      // 🔍 Check for HTML responses (404/500 errors from server crashes)
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Server Error (HTML):", text);
        if (res.status === 404)
          throw new Error("Session not found or Backend URL is wrong.");
        throw new Error(`Server returned ${res.status}. Check console.`);
      }

      const data = await res.json();

      if (data.success) {
        // ✅ SUCCESS: Save details for the game session
        sessionStorage.setItem("SESSION_CODE", code.trim().toUpperCase());
        sessionStorage.setItem("PARTICIPANT_ID", data.data.participantId);
        sessionStorage.setItem("PLAYER_NAME", data.data.name);

        // Redirect to game area
        router.push("/play");
      } else {
        // ❌ LOGIC ERROR: (e.g. "Session Closed", "Name Invalid")
        setError(data.message || "Failed to join session.");
      }
    } catch (err) {
      console.error("Join Error:", err);
      setError(err.message || "Network Error. Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-4 relative overflow-hidden">
      {/* Background Decor (Optional) */}
      <div
        className="absolute inset-0 z-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 z-10 animate-fade-up">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            🚀
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Join the Quiz</h1>
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
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Joining...
              </span>
            ) : (
              "Enter Room"
            )}
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

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-up {
          animation: fadeUp 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default function UserJoin() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Loading...
        </div>
      }>
      <UserJoinContent />
    </Suspense>
  );
}
