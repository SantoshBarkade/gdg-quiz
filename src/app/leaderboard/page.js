"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";

const API_URL = "https://gdg-quiz.onrender.com/api";

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const socket = getSocket();
  const code = searchParams.get("code");

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionName, setSessionName] = useState(""); 

  useEffect(() => {
    if (!code) return;

    // 1. Fetch Session Name
    const fetchSessionData = async () => {
      try {
        const res = await fetch(`${API_URL}/sessions/code/${code}`);
        const json = await res.json();
        if (json.success && json.data) {
          setSessionName(json.data.title);
        }
      } catch (e) {
        console.error("Failed to fetch session name", e);
      }
    };
    fetchSessionData();

    // 2. Listen for updates
    const onRanks = (data) => {
      // Sort by score descending
      const sorted = data.sort((a, b) => b.score - a.score);
      setLeaderboard(sorted);
      setLoading(false);
    };

    const onGameOver = () => {
      // Optional: Trigger celebration/confetti on admin screen
    };

    socket.on("game:ranks", onRanks);
    socket.on("game:over", onGameOver);

    // 3. Join & Request Data Immediately 
    socket.emit("join:session", code);
    socket.emit("sync:state", code); 

    // Handle connection restore
    socket.on("connect", () => {
      socket.emit("join:session", code);
      socket.emit("sync:state", code);
    });

    return () => {
      socket.off("game:ranks", onRanks);
      socket.off("game:over", onGameOver);
      socket.off("connect");
    };
  }, [code, socket]);

  // Helper to get Medal Icon
  const getRankIcon = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <div className="leaderboard-body">
      <div className="background-grid"></div>

      <div className="leaderboard-card" id="board">
        {/* HEADER */}
        <div className="header">
          <div className="logo-container">
             <img src="/assests/logo.png" alt="GDG Logo" className="logo-img" />
          </div>
          {/* 🟢 CHANGED: Removed Session Code, displays only Title */}
          <h1>{sessionName || "Live Leaderboard"}</h1>
        </div>

        {/* LIST */}
        <div className="list-container">
          {loading ? (
            <div className="loading-state">
               <div className="spinner"></div>
               <p>Waiting for players...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-state">No players have joined yet.</div>
          ) : (
            <div className="list">
              {leaderboard.map((user, index) => (
                <div
                  key={user.id || index}
                  className={`card rank-${index + 1}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="left">
                    <div className="rank-badge">{getRankIcon(index)}</div>
                    <div className="avatar-placeholder">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="name">{user.name}</div>
                  </div>
                  <div className="score">
                    {user.score} <span className="pts-label">pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="footer">
          GDG Quiz • Smt. Kashibai Navale College of Engineering
        </div>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet" />

      <style jsx global>{`
        * { box-sizing: border-box; }
        
        .leaderboard-body {
          min-height: 100vh;
          width: 100%;
          background: #ffffff;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: "Poppins", sans-serif;
          position: relative;
          overflow: hidden;
        }

        .background-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(8, 75, 162, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(8, 75, 162, 0.12) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 0;
          pointer-events: none;
        }

        .leaderboard-card {
          width: 800px;
          max-width: 95%;
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid #e0e0e0;
          border-top: 8px solid #4285F4;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          max-height: 85vh; 
        }

        .header {
          padding: 20px;
          text-align: center;
          border-bottom: 1px solid #f0f0f0;
          background: #fdfdfd;
          border-radius: 24px 24px 0 0;
        }

        .logo-img { height: 45px; margin-bottom: 5px; }
        
        h1 { margin: 0; color: #202124; font-size: 1.75rem; font-weight: 800; }

        .list-container {
          flex: 1;
          overflow-y: auto;
          padding: 10px 20px;
          background: #fff;
        }

        .list { display: flex; flex-direction: column; gap: 6px; }

        .card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 15px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid #f1f3f4;
          transition: transform 0.2s, box-shadow 0.2s;
          animation: slideIn 0.5s ease forwards;
          opacity: 0;
        }

        .card:hover { transform: scale(1.01); box-shadow: 0 4px 15px rgba(0,0,0,0.05); }

        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* MEDAL STYLES */
        .rank-1 { 
          background: linear-gradient(135deg, #fff9c4 0%, #fff 100%);
          border: 2px solid #FFD700;
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.2);
          transform: scale(1.02);
        }
        .rank-1 .rank-badge { font-size: 1.5rem; }

        .rank-2 { 
          background: linear-gradient(135deg, #f5f5f5 0%, #fff 100%);
          border: 2px solid #C0C0C0;
          box-shadow: 0 4px 15px rgba(192, 192, 192, 0.2);
        }
        .rank-2 .rank-badge { font-size: 1.3rem; }

        .rank-3 { 
          background: linear-gradient(135deg, #ffe0b2 0%, #fff 100%);
          border: 2px solid #CD7F32;
          box-shadow: 0 4px 15px rgba(205, 127, 50, 0.15);
        }
        .rank-3 .rank-badge { font-size: 1.3rem; }

        .left { display: flex; align-items: center; gap: 12px; }

        .rank-badge {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 1rem; color: #5f6368;
        }

        .avatar-placeholder {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4285F4, #34A853);
          color: white;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.9rem;
        }

        .name { font-size: 1rem; font-weight: 600; color: #333; }
        .score { font-size: 1.1rem; font-weight: 800; color: #333; }
        .pts-label { font-size: 0.8rem; font-weight: 600; color: #888; margin-left: 2px; }

        .loading-state, .empty-state { text-align: center; padding: 40px; color: #888; font-weight: 500; }
        
        .spinner {
          width: 40px; height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #4285F4;
          border-radius: 50%;
          margin: 0 auto 15px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .footer {
          padding: 12px;
          text-align: center;
          font-size: 0.8rem;
          color: #999;
          background: #fcfcfc;
          border-radius: 0 0 24px 24px;
          border-top: 1px solid #f0f0f0;
        }

        /* Mobile Optimization */
        @media (max-width: 600px) {
          .leaderboard-card {
            border-radius: 0;
            max-height: 100vh;
            height: 100vh;
            border: none;
            border-top: 6px solid #4285F4;
          }
          h1 { font-size: 1.5rem; }
          .logo-img { height: 40px; }
          .card { padding: 8px 12px; }
          .rank-1 { transform: scale(1); }
          .rank-1:hover { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LeaderboardContent />
    </Suspense>
  );
}