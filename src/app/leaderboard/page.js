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

  // --- 1. SOCKET & DATA LOGIC (Existing Feature) ---
  useEffect(() => {
    if (!code) return;

    // Join the session room
    socket.emit("join:session", code);

    // Listen for live rank updates
    socket.on("game:ranks", (data) => {
      const sorted = data.sort((a, b) => b.score - a.score);
      setLeaderboard(sorted);
      setLoading(false);
    });

    // Listen for game over
    socket.on("game:over", () => {
      launchConfetti();
    });

    return () => {
      socket.off("game:ranks");
      socket.off("game:over");
    };
  }, [code, socket]);

  // --- 2. CONFETTI EFFECT (From your HTML) ---
  const launchConfetti = () => {
    const colors = ["#ff4d4d", "#4d79ff", "#ffd24d", "#4dff88", "#c44dff"];
    const board = document.getElementById("board");
    if (!board) return;

    for (let i = 0; i < 50; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "%";
      c.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDelay = Math.random() * 0.4 + "s";
      board.appendChild(c);

      setTimeout(() => c.remove(), 3000);
    }
  };

  // Trigger confetti on load
  useEffect(() => {
    const timer = setTimeout(launchConfetti, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="leaderboard-body">
      <div className="leaderboard-card" id="board">
        {/* TROPHY */}
        <div className="trophy">
          <span>🏆</span>
        </div>

        <h2>{loading ? `Waiting for Players...` : "Live Leaderboard"}</h2>

        {code && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "15px",
              color: "#4f6bed",
              fontSize: "14px",
              fontWeight: "600",
            }}>
            Session: {code}
          </div>
        )}

        {/* LIST */}
        <div className="list">
          {leaderboard.length === 0 && !loading ? (
            <div
              style={{ textAlign: "center", padding: "20px", color: "#999" }}>
              No players yet
            </div>
          ) : (
            leaderboard.map((user, index) => (
              <div
                key={user.id || index}
                className="card"
                style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="left">
                  <div className="rank">#{index + 1}</div>
                  {/* Dynamic Avatar based on name */}
                  <div
                    className="avatar"
                    style={{
                      backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}')`,
                      backgroundColor: "#fff",
                    }}></div>
                  <div className="name">{user.name}</div>
                </div>
                <div className="score">{user.score} pts</div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="footer">🎉 Congratulations to all participants!</div>
      </div>

      {/* STYLES (Exact match to your HTML) */}
      <style jsx global>{`
        .leaderboard-body {
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(135deg, #f6f9ff, #e9f0ff);
          display: flex;
          justify-content: center;
          align-items: center;
          background-image:
            linear-gradient(
              to right,
              rgba(8, 75, 162, 0.12) 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              rgba(8, 75, 162, 0.12) 1px,
              transparent 1px
            );
          background-size: 40px 40px;
          font-family: "Segoe UI", Tahoma, sans-serif;
          margin: 0;
          padding: 0;
        }

        /* MAIN CARD */
        .leaderboard-card {
          width: 680px;
          background: #ffffff;
          border: 3px solid #000;
          border-radius: 18px;
          padding: 26px;
          box-shadow:
            0 10px 0 rgba(0, 0, 0, 0.15),
            0 25px 50px rgba(0, 0, 0, 0.25);
          position: relative;
          overflow: hidden;
          margin: 20px;
        }

        /* TROPHY */
        .trophy {
          display: flex;
          justify-content: center;
          margin-bottom: 10px;
        }

        .trophy span {
          font-size: 56px;
          animation: trophyZoom 2s ease-in-out infinite;
          display: block;
        }

        @keyframes trophyZoom {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.18);
          }
        }

        h2 {
          text-align: center;
          color: #4f6bed;
          margin-bottom: 18px;
          margin-top: 0;
        }

        /* LIST */
        .list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 100px;
        }

        .card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f7f8ff;
          border-radius: 12px;
          padding: 10px 14px;
          opacity: 0;
          animation: slideUp 0.6s ease forwards;
        }

        /* Top 3 Colors */
        .card:nth-child(1) {
          background: #fff3c4;
        }
        .card:nth-child(2) {
          background: #f1f1f1;
        }
        .card:nth-child(3) {
          background: #ffe1cc;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* LEFT SIDE */
        .left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .rank {
          font-weight: 700;
          color: #333;
          width: 28px;
        }

        .avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background-size: cover;
          background-position: center;
          border: 2px solid #000;
        }

        .name {
          font-size: 15px;
          font-weight: 600;
          color: #000;
        }

        /* SCORE */
        .score {
          font-size: 14px;
          font-weight: 700;
          color: #000;
        }

        /* FOOTER */
        .footer {
          margin-top: 22px;
          text-align: center;
          font-size: 15px;
          font-weight: 700;
          color: #333;
        }

        /* CONFETTI */
        .confetti {
          position: absolute;
          top: -10px;
          width: 8px;
          height: 14px;
          opacity: 0.9;
          animation: fall 3s ease-out forwards;
          z-index: 5;
        }

        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(520px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading Leaderboard...
        </div>
      }>
      <LeaderboardContent />
    </Suspense>
  );
}
