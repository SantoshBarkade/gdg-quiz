"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import Footer from "@/components/Footer";

// 🟢 CONFIGURATION
const API_URL = "https://gdgslio.onrender.com/api";

export default function LobbyPage() {
  const router = useRouter();
  const socket = getSocket();

  const [participantCount, setParticipantCount] = useState(1);
  const [myName, setMyName] = useState("");
  const [statusText, setStatusText] = useState("Waiting for Host...");

  useEffect(() => {
    const pId = sessionStorage.getItem("PARTICIPANT_ID");
    const rawCode = sessionStorage.getItem("SESSION_CODE");
    const name = sessionStorage.getItem("PLAYER_NAME");

    if (!pId || !rawCode) {
      router.push("/user");
      return;
    }

    const code = rawCode.toUpperCase(); // 🔒 FORCE UPPERCASE FIX
    setMyName(name || "Player");

    // 1. 🔍 IMMEDIATE STATUS CHECK (Fixes "Missed Signal" Bug)
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/sessions/${code}`);
        const data = await res.json();

        if (data.success && data.data.status === "ACTIVE") {
          console.log("⚡ Game is ALREADY ACTIVE. Moving now...");
          router.push("/play");
        }
      } catch (e) {
        console.error("Status check failed", e);
      }
    };
    checkStatus();

    // 2. JOIN SOCKET ROOM
    socket.emit("join:session", code);

    // 3. LISTEN FOR START EVENT (Real-time trigger)
    socket.on("game:started", () => {
      console.log("🚀 Signal Received! Redirecting...");
      setStatusText("Game Starting! 🚀");
      setTimeout(() => router.push("/play"), 500);
    });

    // 4. LISTEN FOR COUNT UPDATE
    socket.on("session:update", (participantsArray) => {
      if (Array.isArray(participantsArray)) {
        setParticipantCount(participantsArray.length);
      }
    });

    return () => {
      socket.off("game:started");
      socket.off("session:update");
    };
  }, []);

  return (
    <div className="lobby-body">
      <div className="lobby-container">
        <header className="lobby-header">
          <div className="logo">
            <span className="logo-icon">🎯</span>
            <span className="logo-text">GDG Quiz</span>
          </div>
          <div className="session-status">
            <span className="status-dot"></span>
            <span className="status-text">{statusText}</span>
          </div>
        </header>

        <main className="lobby-main">
          <div className="welcome-text">
            <h2>
              Welcome, <span className="highlight">{myName}</span>!
            </h2>
            <p>You are in the lobby.</p>
          </div>

          <div className="count-card">
            <div className="pulse-ring"></div>
            <div className="count-number">{participantCount}</div>
            <div className="count-label">Players Joined</div>
          </div>

          <p className="instruction-text">
            Keep this screen open. The game will start automatically.
          </p>
        </main>

        <div style={{ marginTop: "auto", width: "100%" }}>
          <Footer />
        </div>
      </div>

      <style jsx global>{`
        :root {
          --primary: #2563eb;
          --bg: #f3f4f6;
        }
        .lobby-body {
          margin: 0;
          padding: 0;
          background: var(--bg);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: "Google Sans", sans-serif;
        }
        .lobby-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 20px;
        }
        .lobby-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }
        .logo {
          display: flex;
          gap: 10px;
          font-size: 24px;
          font-weight: 800;
          color: #1f2937;
        }
        .session-status {
          background: #dbeafe;
          color: #1e40af;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          background: #2563eb;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .lobby-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 30px;
        }
        .welcome-text h2 {
          font-size: 2rem;
          color: #333;
          margin: 0;
        }
        .welcome-text p {
          color: #666;
          font-size: 1.1rem;
          margin-top: 5px;
        }
        .highlight {
          color: #2563eb;
        }
        .count-card {
          position: relative;
          width: 200px;
          height: 200px;
          background: white;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          box-shadow: 0 10px 40px rgba(37, 99, 235, 0.2);
          z-index: 2;
        }
        .count-number {
          font-size: 5rem;
          font-weight: 800;
          color: #2563eb;
          line-height: 1;
        }
        .count-label {
          font-size: 1rem;
          color: #6b7280;
          font-weight: 600;
          margin-top: 5px;
        }
        .pulse-ring {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid #2563eb;
          animation: ripple 2s infinite;
          z-index: 1;
        }
        .instruction-text {
          max-width: 400px;
          color: #6b7280;
          line-height: 1.5;
          background: rgba(255, 255, 255, 0.5);
          padding: 15px;
          border-radius: 12px;
        }
        @keyframes pulse {
          50% {
            opacity: 0.5;
          }
        }
        @keyframes ripple {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        @media (max-width: 768px) {
          .count-number {
            font-size: 4rem;
          }
          .count-card {
            width: 160px;
            height: 160px;
          }
        }
      `}</style>
    </div>
  );
}
