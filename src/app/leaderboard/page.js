"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const socket = getSocket();
  const code = searchParams.get("code");

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;

    socket.emit("join:session", code);

    socket.on("game:ranks", (data) => {
      const sorted = data.sort((a, b) => b.score - a.score);
      setLeaderboard(sorted);
      setLoading(false);
    });

    socket.on("game:over", () => {
      // Optional confetti logic here
    });

    return () => {
      socket.off("game:ranks");
      socket.off("game:over");
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
          <h1>Live Leaderboard</h1>
          {code && <div className="session-badge">Session: {code}</div>}
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
          max-height: 90vh;
        }

        .header {
          padding: 30px;
          text-align: center;
          border-bottom: 1px solid #f0f0f0;
          background: #fdfdfd;
          border-radius: 24px 24px 0 0;
        }

        .logo-img { height: 60px; margin-bottom: 10px; }
        
        h1 { margin: 0; color: #202124; fontSize: 2rem; fontWeight: 800; }

        .session-badge {
          display: inline-block;
          margin-top: 10px;
          background: #e8f0fe;
          color: #1967d2;
          padding: 6px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .list-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px 30px;
          background: #fff;
        }

        .list { display: flex; flex-direction: column; gap: 10px; }

        .card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 20px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid #f1f3f4;
          transition: transform 0.2s, box-shadow 0.2s;
          animation: slideIn 0.5s ease forwards;
          opacity: 0;
        }

        /* 🟢 MEDAL STYLES (Gold, Silver, Bronze) */
        /* Gold */
        .rank-1 { 
          background: linear-gradient(135deg, #fff9c4 0%, #fff 100%);
          border: 2px solid #FFD700;
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.2);
          transform: scale(1.02);
        }
        .rank-1 .rank-badge { font-size: 1.8rem; } /* Bigger emoji */

        /* Silver */
        .rank-2 { 
          background: linear-gradient(135deg, #f5f5f5 0%, #fff 100%);
          border: 2px solid #C0C0C0;
          box-shadow: 0 4px 15px rgba(192, 192, 192, 0.2);
        }
        .rank-2 .rank-badge { font-size: 1.5rem; }

        /* Bronze */
        .rank-3 { 
          background: linear-gradient(135deg, #ffe0b2 0%, #fff 100%);
          border: 2px solid #CD7F32;
          box-shadow: 0 4px 15px rgba(205, 127, 50, 0.15);
        }
        .rank-3 .rank-badge { font-size: 1.5rem; }

        .left { display: flex; align-items: center; gap: 15px; }

        .rank-badge {
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800;
          font-size: 1rem;
          color: #5f6368;
        }

        .avatar-placeholder {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4285F4, #34A853);
          color: white;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .name { font-size: 1.1rem; font-weight: 600; color: #333; }
        .score { font-size: 1.2rem; font-weight: 800; color: #333; }
        .pts-label { font-size: 0.8rem; font-weight: 600; color: #888; margin-left: 2px; }

        .loading-state, .empty-state { text-align: center; padding: 40px; color: #888; font-weight: 500; }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4285F4; border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .footer {
          padding: 15px;
          text-align: center;
          font-size: 0.8rem;
          color: #999;
          background: #fcfcfc;
          border-radius: 0 0 24px 24px;
          border-top: 1px solid #f0f0f0;
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