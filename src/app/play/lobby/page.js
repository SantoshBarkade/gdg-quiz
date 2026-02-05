"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

export default function LobbyPage() {
  const router = useRouter();
  const socket = getSocket();

  const [participantCount, setParticipantCount] = useState(1);
  const [myName, setMyName] = useState("");
  const [statusText, setStatusText] = useState("Waiting for Host...");

  useEffect(() => {
    const pId = sessionStorage.getItem("PARTICIPANT_ID");
    const code = sessionStorage.getItem("SESSION_CODE");
    const name = sessionStorage.getItem("PLAYER_NAME");

    if (!pId || !code) {
      router.push("/user");
      return;
    }

    setMyName(name || "Player");

    socket.emit("join:session", code, pId);
    socket.emit("sync:state", code);

    const goToGame = () => {
      setStatusText("Game Starting! 🚀");
      router.push("/play");
    };

    socket.on("game:started", goToGame);
    socket.on("game:question", goToGame);
    socket.on("game:ranks", goToGame);
    socket.on("game:result", goToGame);

    socket.on("session:update", (participantsArray) => {
      if (Array.isArray(participantsArray)) {
        setParticipantCount(participantsArray.length);
      }
    });

    return () => {
      socket.off("game:started");
      socket.off("game:question");
      socket.off("game:ranks");
      socket.off("game:result");
      socket.off("session:update");
    };
  }, []);

  return (
    <div className="lobby-body">
      {/* 🟢 Grid Background */}
      <div className="background-grid"></div>

      <div className="lobby-container">
        <header className="lobby-header">
          <div className="logo-container">
             <img src="/assests/logo.png" alt="GDG Logo" className="logo-img" />
             <span className="logo-text">GDG Quiz</span>
          </div>
          <div className="session-status">
            <span className="status-dot"></span>
            <span className="status-text">{statusText}</span>
          </div>
        </header>

        <main className="lobby-main">
          <div className="welcome-text">
            <h2>Welcome, <span className="highlight">{myName}</span>!</h2>
            <p>You are in the lobby.</p>
          </div>

          {/* 🟢 RESTORED: Big Counter Card */}
          <div className="count-card-wrapper">
            <div className="count-card">
              <div className="pulse-ring"></div>
              <div className="count-number">{participantCount}</div>
              <div className="count-label">Players Joined</div>
            </div>
          </div>

          <div className="instruction-pill">
            Keep this screen open. The game will start automatically.
          </div>
        </main>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet" />

      <style jsx global>{`
        * { box-sizing: border-box; }
        .lobby-body { 
          margin: 0; padding: 0; 
          background: #ffffff; 
          min-height: 100vh; 
          display: flex; 
          flex-direction: column; 
          font-family: "Poppins", sans-serif; 
          position: relative; 
          overflow: hidden;
        }

        .background-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(8, 75, 162, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(8, 75, 162, 0.08) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 0;
          pointer-events: none;
        }

        .lobby-container { 
          max-width: 1200px; margin: 0 auto; width: 100%; flex: 1; 
          display: flex; flex-direction: column; padding: 30px; 
          position: relative; z-index: 1; 
        }

        .lobby-header { 
          display: flex; justify-content: space-between; align-items: center; 
          margin-bottom: 60px;
        }
        
        .logo-container { display: flex; align-items: center; gap: 12px; }
        .logo-img { height: 45px; width: auto; }
        .logo-text { font-weight: 800; font-size: 1.5rem; color: #1f2937; }

        .session-status { 
          background: #e8f0fe; color: #1967d2; 
          padding: 8px 20px; border-radius: 30px; 
          font-size: 0.9rem; font-weight: 600; 
          display: flex; align-items: center; gap: 10px; 
          border: 1px solid #d2e3fc;
        }
        .status-dot { width: 10px; height: 10px; background: #1a73e8; border-radius: 50%; animation: pulse 2s infinite; }

        .lobby-main { 
          flex: 1; display: flex; flex-direction: column; 
          align-items: center; justify-content: center; gap: 50px; 
        }

        .welcome-text h2 { font-size: 3rem; color: #202124; margin: 0; line-height: 1.2; }
        .welcome-text p { color: #5f6368; font-size: 1.2rem; margin-top: 10px; text-align: center; }
        .highlight { color: #2563eb; }

        /* 🟢 COUNT CARD STYLING */
        .count-card-wrapper { position: relative; }
        
        .count-card { 
          width: 260px; height: 260px; 
          background: white; 
          border-radius: 50%; 
          display: flex; flex-direction: column; 
          justify-content: center; align-items: center; 
          box-shadow: 0 20px 50px rgba(37, 99, 235, 0.15); 
          border: 1px solid #f0f0f0;
          position: relative; z-index: 2;
        }
        
        .count-number { 
          font-size: 6rem; font-weight: 800; 
          color: #4285F4; line-height: 1; 
          letter-spacing: -2px;
        }
        .count-label { 
          font-size: 1.1rem; color: #5f6368; 
          font-weight: 600; margin-top: 5px; 
          text-transform: uppercase; letter-spacing: 1px;
        }

        .pulse-ring { 
          position: absolute; top: -20px; left: -20px; right: -20px; bottom: -20px; 
          border-radius: 50%; 
          border: 2px solid rgba(66, 133, 244, 0.3); 
          animation: ripple 2.5s infinite cubic-bezier(0, 0.2, 0.8, 1); 
          z-index: 1;
        }

        .instruction-pill {
          background: white;
          padding: 15px 30px;
          border-radius: 50px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          border: 1px solid #f0f0f0;
          color: #5f6368;
          font-weight: 500;
        }

        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        @keyframes ripple { 0% { transform: scale(0.95); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
        
        @media (max-width: 600px) {
          .welcome-text h2 { font-size: 2rem; }
          .count-card { width: 200px; height: 200px; }
          .count-number { font-size: 4.5rem; }
        }
      `}</style>
    </div>
  );
}