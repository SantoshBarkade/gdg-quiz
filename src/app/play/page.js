"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import confetti from "canvas-confetti";

const API_URL = "https://gdg-quiz.onrender.com/api";

export default function GamePlay() {
  const router = useRouter();
  const socket = getSocket();

  const [view, setView] = useState("LOADING");
  const [player, setPlayer] = useState({ name: "", score: 0, rank: "--" });
  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(15);
  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState(null);
  const [winners, setWinners] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0, timeout: 0 });
  const [history, setHistory] = useState([]);

  // Use Ref to track view state inside socket callbacks without dependencies
  const viewRef = useRef("LOADING");
  const timerRef = useRef(null);

  // Helper to update state and ref
  const setViewState = (newView) => {
    viewRef.current = newView;
    setView(newView);
  };

  useEffect(() => {
    const pId = sessionStorage.getItem("PARTICIPANT_ID");
    const code = sessionStorage.getItem("SESSION_CODE");
    const name = sessionStorage.getItem("PLAYER_NAME");

    if (!pId || !code) {
      router.push("/user");
      return;
    }

    setPlayer((prev) => ({ ...prev, name: name || "Player" }));
    
    // 🟢 HANDLERS
    const onQuestion = (data) => handleNewQuestion(data);
    const onResult = (data) => handleResult(data);
    
    const onRanks = (rankList) => {
        // 🔴 SAFETY CHECK: Don't switch if Game Over (Fixes Blank Screen)
        if (viewRef.current === "GAMEOVER") return;

        setLeaderboard(rankList);
        const me = rankList.find((p) => p.id === pId);
        if (me) {
          setPlayer((prev) => ({ ...prev, rank: me.rank, score: me.score }));
        }
        
        // Only switch if waiting
        if (viewRef.current === "LOBBY" || viewRef.current === "LOADING") {
           setViewState("RESULT");
        }
    };

    const onGameOver = (data) => handleGameOver(data, pId); // Pass pId
    const onIdle = () => setViewState("LOBBY");
    const onForceStop = () => { alert("Host ended session."); router.push("/"); };

    socket.on("game:question", onQuestion);
    socket.on("game:result", onResult);
    socket.on("game:ranks", onRanks);
    socket.on("game:over", onGameOver);
    socket.on("sync:idle", onIdle);
    socket.on("game:force_stop", onForceStop);

    socket.emit("join:session", code, pId);
    socket.emit("sync:state", code);

    socket.on("connect", () => {
      socket.emit("join:session", code, pId);
      socket.emit("sync:state", code);
    });

    return () => {
      socket.off("game:question", onQuestion);
      socket.off("game:result", onResult);
      socket.off("game:ranks", onRanks);
      socket.off("game:over", onGameOver);
      socket.off("sync:idle", onIdle);
      socket.off("game:force_stop", onForceStop);
      socket.off("connect");
      clearInterval(timerRef.current);
    };
  }, []);

  const handleNewQuestion = (data) => {
    setViewState("QUESTION");
    setQuestion(data);
    setSelectedOption(null);
    setResult(null);
    const duration = data.time !== undefined ? data.time : 15;
    setTotalTime(15);
    setTimeLeft(duration);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResult = (data) => {
    clearInterval(timerRef.current);
    setViewState("RESULT");
    setResult(data);
    if (data.correctAnswer === selectedOption) triggerConfetti();
  };

  const handleGameOver = async (data, pId) => {
    clearInterval(timerRef.current);
    setViewState("GAMEOVER");
    
    if (data.winners) setWinners(data.winners);

    // 🟢 RECOVER MY RANK (Fix for Refresh)
    if (data.leaderboard && pId) {
        const me = data.leaderboard.find(p => p.id === pId);
        if (me) {
            setPlayer(prev => ({ ...prev, rank: me.rank, score: me.score }));
        }
    }
    
    const duration = 3000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());

    try {
      // Fetch History if not already passed (Optional)
      const currentPId = pId || sessionStorage.getItem("PARTICIPANT_ID");
      if(currentPId) {
          const res = await fetch(`${API_URL}/participants/history/${currentPId}`);
          const json = await res.json();
          if (json.success) {
            setHistory(json.data);
            const correct = json.data.filter((h) => h.status === "CORRECT").length;
            const incorrect = json.data.filter((h) => h.status === "WRONG").length;
            const timeout = json.data.filter((h) => h.status === "TIMEOUT").length || 0;
            setStats({ correct, incorrect, timeout });
          }
      }
    } catch (e) { console.error("History Error", e); }
  };

  const submitAnswer = async (text) => {
    if (selectedOption) return;
    setSelectedOption(text);
    const pId = sessionStorage.getItem("PARTICIPANT_ID");
    const code = sessionStorage.getItem("SESSION_CODE");
    try {
      await fetch(`${API_URL}/participants/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: pId, sessionCode: code, questionId: question.question._id, selectedOption: text, timeLeft: timeLeft }),
      });
    } catch (e) { console.error("Submit error", e); }
  };

  const triggerConfetti = (big = false) => {
    if (big) { confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#4285F4", "#34A853", "#FBBC05", "#EA4335"] }); }
    else { confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } }); }
  };

  let timerClass = "timer-circle-progress";
  if (timeLeft <= 3) timerClass += " danger";
  else if (timeLeft <= 5) timerClass += " warning";

  const qNum = question?.qNum || 1;
  const qTotal = question?.total || 1;
  const progressPercent = (qNum / qTotal) * 100;
  const strokeDashoffset = (2 * Math.PI * 45) - (totalTime > 0 ? timeLeft / totalTime : 0) * (2 * Math.PI * 45);

  const getRankIcon = (idx) => {
    if (idx === 0) return "🥇";
    if (idx === 1) return "🥈";
    if (idx === 2) return "🥉";
    return `#${idx + 1}`;
  };

  return (
    <div className="main-body">
      <div className="background-grid"></div>

      {view === "GAMEOVER" ? (
        <div className="game-over-wrapper">
          <div className="game-over-header">
            <div className="trophy-icon">🏆</div>
            <h1>Quiz Complete!</h1>
            <p>Here are the top performers</p>
          </div>

          <div className="winners-grid">
            {winners.map((w, idx) => (
              <div key={idx} className={`winner-card rank-${idx + 1}`}>
                <div className="medal-icon">{getRankIcon(idx)}</div>
                <div className="winner-name">{w.name}</div>
                {/* 🟢 Normalized Score Display */}
                <div className="winner-score">{w.score} pts</div>
              </div>
            ))}
          </div>

          <div className="stats-dashboard">
            <div className="stat-box blue">
              <div className="stat-label">Your Rank</div>
              <div className="stat-val">#{player.rank}</div>
            </div>
            <div className="stat-box green">
              <div className="stat-label">Total Score</div>
              <div className="stat-val">{player.score}</div>
            </div>
            <div className="stat-box yellow">
              <div className="stat-label">Correct</div>
              <div className="stat-val">{stats.correct}</div>
            </div>
          </div>

          <div className="review-container">
            <h3>Your Answers</h3>
            <div className="review-list">
              {history.map((h, i) => (
                <div key={i} className={`review-item ${h.status === "CORRECT" ? "correct" : "wrong"}`}>
                  <div className="review-q-num">Q{i+1}</div>
                  <div className="review-content">
                    <p className="review-q-text">{h.questionText}</p>
                    <div className="review-badges">
                      <span className="badge user">You: {h.userSelected}</span>
                      <span className="badge answer">Ans: {h.correctAnswer}</span>
                    </div>
                  </div>
                  <div className="review-icon">{h.status === "CORRECT" ? "✅" : "❌"}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="home-btn" onClick={() => router.push("/")}>Back to Home</button>
        </div>
      ) : (
        <div className="container">
          <div className="quiz-card">
            
            {view === "LOADING" && (
              <div style={{textAlign: 'center', padding: '60px'}}>
                 <div className="loader-spinner"></div>
                 <h2 style={{color: '#666', marginTop: '20px'}}>Connecting...</h2>
              </div>
            )}

            {view === "LOBBY" && (
              <div className="start-screen">
                <div style={{display: 'flex', justifyContent: 'center', marginBottom: '20px'}}>
                   <img src="/assests/logo.png" alt="Logo" style={{height: '60px'}} />
                </div>
                <h1>GDG Quiz</h1>
                <p className="start-screen-subtitle">Welcome, <strong>{player.name}</strong>!</p>
                <div className="quiz-rules"><h3>Waiting for Host...</h3></div>
                <div className="timer-circle-container" style={{ margin: "0 auto" }}><div className="timer-number">⏳</div></div>
              </div>
            )}

            {view === "QUESTION" && question && (
              <div id="quizScreen">
                <div className="progress-container">
                  <div className="progress-info">
                    <div className="question-counter">Q {question.qNum} / {question.total}</div>
                    <div className="score-display-top">Score: {player.score}</div>
                    <div className="clock-container"><div className="timer-circle-container"><svg className="timer-svg" width="80" height="80" viewBox="0 0 100 100"><circle className="timer-circle-bg" cx="50" cy="50" r="45"></circle><circle className={timerClass} cx="50" cy="50" r="45" style={{ strokeDashoffset }}></circle></svg><div className="timer-text"><div className="timer-number">{timeLeft}</div></div></div></div>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${progressPercent}%` }}></div></div>
                </div>
                <div className="question-container">
                  <div className="question-text">{question.question.questionText}</div>
                  <div className="answers-grid">
                    {question.question.options.map((opt, idx) => {
                      const isSelected = selectedOption === opt.text;
                      return (<button key={idx} className={`answer-btn ${isSelected ? "selected-answer" : ""}`} data-option={String.fromCharCode(65 + idx)} onClick={() => submitAnswer(opt.text)} disabled={!!selectedOption}>{opt.text}</button>);
                    })}
                  </div>
                </div>
              </div>
            )}

            {view === "RESULT" && result && (
              <div className="results-container">
                <div className="result-icon-anim">{selectedOption === result.correctAnswer ? "🎉" : selectedOption ? "❌" : "⏰"}</div>
                <h2 className="complete-title" style={{ marginTop: '10px' }}>{selectedOption === result.correctAnswer ? <span style={{ color: "#34A853" }}>Correct!</span> : <span style={{ color: "#EA4335" }}>Wrong!</span>}</h2>
                <div className="performance-message" style={{ marginBottom: "25px" }}>Correct Answer: <strong>{result.correctAnswer}</strong></div>
                <div className="stats-row" style={{ marginBottom: "30px", justifyContent: 'center' }}>
                  <div className="mini-stat" style={{ background: "#e8f0fe", borderColor: "#4285F4" }}><div className="stat-num" style={{ color: "#4285F4" }}>{player.score}</div><div className="stat-text">Score</div></div>
                  <div className="mini-stat" style={{ background: "#fef9c3", borderColor: "#facc15" }}><div className="stat-num" style={{ color: "#b45309" }}>#{player.rank}</div><div className="stat-text">Current Rank</div></div>
                </div>
                <div className="redirect-container">
                   <p className="redirect-text">Redirecting to next question...</p>
                   <div className="cooling-progress-bar"><div className="cooling-progress-fill"></div></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet" />

      <style jsx global>{`
        * { box-sizing: border-box; }
        .main-body { font-family: 'Poppins', sans-serif; background: #ffffff; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; position: relative; overflow-y: auto; }
        .background-grid { position: fixed; inset: 0; background-image: linear-gradient(to right, rgba(8, 75, 162, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(8, 75, 162, 0.08) 1px, transparent 1px); background-size: 40px 40px; z-index: 0; pointer-events: none; }
        .container { max-width: 800px; width: 100%; position: relative; z-index: 1; }
        .quiz-card { background: white; border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08); border: 1px solid #f0f0f0; border-top: 6px solid #4285F4; transition: all 0.3s ease; }
        
        .results-container { text-align: center; animation: slideUpFade 0.5s ease-out forwards; }
        .result-icon-anim { font-size: 5rem; margin-bottom: 5px; animation: popBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: inline-block; }
        .redirect-container { margin-top: 20px; opacity: 0; animation: fadeIn 0.5s ease 0.5s forwards; }
        .redirect-text { color: #5f6368; font-size: 0.9rem; margin-bottom: 8px; font-weight: 500; }
        .cooling-progress-bar { width: 100%; max-width: 300px; height: 6px; background: #f1f3f4; border-radius: 10px; margin: 0 auto; overflow: hidden; }
        .cooling-progress-fill { height: 100%; background: #4285F4; width: 0%; animation: fillBar 4s linear infinite; }
        @keyframes fillBar { 0% { width: 0%; } 100% { width: 100%; } }
        @keyframes popBounce { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes slideUpFade { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .game-over-wrapper { width: 100%; max-width: 600px; position: relative; z-index: 2; text-align: center; padding-bottom: 40px; }
        .game-over-header h1 { font-size: 2.5rem; color: #202124; margin: 10px 0; }
        .game-over-header p { color: #5f6368; }
        .trophy-icon { font-size: 4rem; animation: pulseZoom 2s infinite; }
        .winners-grid { display: flex; flex-direction: column; gap: 10px; margin: 30px 0; }
        .winner-card { background: white; padding: 15px 20px; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #eee; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .rank-1 { border: 2px solid #FFD700; background: linear-gradient(135deg, #fff9c4, #fff); transform: scale(1.05); }
        .rank-2 { border: 2px solid #C0C0C0; background: linear-gradient(135deg, #f5f5f5, #fff); }
        .rank-3 { border: 2px solid #CD7F32; background: linear-gradient(135deg, #ffe0b2, #fff); }
        .medal-icon { font-size: 1.5rem; width: 40px; }
        .winner-name { font-weight: 700; color: #333; flex: 1; text-align: left; }
        .winner-score { font-weight: 800; color: #4285F4; }
        .stats-dashboard { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 30px; }
        .stat-box { background: white; padding: 15px; border-radius: 16px; border: 1px solid #eee; }
        .stat-label { font-size: 0.8rem; color: #666; text-transform: uppercase; font-weight: 600; }
        .stat-val { font-size: 1.5rem; font-weight: 800; margin-top: 5px; }
        .blue .stat-val { color: #4285F4; }
        .green .stat-val { color: #34A853; }
        .yellow .stat-val { color: #FBBC05; }
        .review-container { background: white; border-radius: 20px; padding: 25px; text-align: left; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .review-container h3 { margin-top: 0; color: #444; }
        .review-list { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-top: 15px; }
        .review-item { display: flex; gap: 15px; padding: 15px; border-radius: 12px; background: #f9f9f9; border: 1px solid #eee; }
        .review-item.correct { border-left: 4px solid #34A853; background: #f6fffa; }
        .review-item.wrong { border-left: 4px solid #EA4335; background: #fff8f8; }
        .review-q-num { font-weight: 800; color: #888; }
        .review-content { flex: 1; }
        .review-q-text { font-weight: 600; font-size: 0.95rem; margin-bottom: 8px; color: #333; }
        .review-badges { display: flex; gap: 10px; font-size: 0.85rem; }
        .badge { padding: 4px 10px; border-radius: 6px; font-weight: 600; }
        .badge.user { background: white; border: 1px solid #ddd; }
        .badge.answer { background: #e6fffa; color: #00796b; border: 1px solid #b2dfdb; }
        .home-btn { margin-top: 30px; background: #4285F4; color: white; border: none; padding: 15px 40px; border-radius: 50px; font-weight: 700; font-size: 1rem; cursor: pointer; box-shadow: 0 10px 25px rgba(66, 133, 244, 0.3); transition: transform 0.2s; }
        .home-btn:hover { transform: translateY(-3px); }
        .loader-spinner { border: 4px solid #f3f3f3; border-top: 4px solid #4285F4; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .start-screen, .results-container { text-align: center; animation: fadeIn 1s ease forwards; }
        .complete-title { color: #4285f4; font-size: 2.2em; margin-bottom: 25px; font-weight: 800; }
        .trophy-icon, .trophy-container { font-size: 4em; margin-bottom: 10px; display: inline-block; animation: pulseZoom 2s ease-in-out infinite; }
        .stats-row { display: flex; gap: 15px; } 
        .mini-stat { padding: 15px 25px; border-radius: 16px; background: #f5f5f5; text-align: center; border: 1px solid transparent; min-width: 120px; }
        .stat-num { font-size: 2rem; font-weight: 800; line-height: 1; margin-bottom: 5px; }
        .stat-text { font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .timer-circle-container { position: relative; width: 80px; height: 80px; }
        .timer-svg { position: absolute; top: 0; left: 0; }
        .timer-circle-bg { fill: none; stroke: #e0e0e0; stroke-width: 4; }
        .timer-circle-progress { fill: none; stroke: #4285f4; stroke-width: 4; stroke-linecap: round; stroke-dasharray: 282.7; transition: stroke-dashoffset 1s linear; transform: rotate(-90deg); transform-origin: 50% 50%; }
        .timer-circle-progress.warning { stroke: #f39c12; }
        .timer-circle-progress.danger { stroke: #eb3349; }
        .timer-text { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .timer-number { font-size: 1.8em; font-weight: 700; color: #34a853; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .progress-container { margin-bottom: 30px; }
        .progress-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .progress-bar { width: 100%; height: 10px; background: #e0e0e0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #34a853; transition: width 0.5s ease; }
        .question-counter { background: #ea4335; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; }
        .score-display-top { color: #34a853; font-weight: 600; padding: 8px 16px; background: rgba(52, 168, 83, 0.1); border-radius: 20px; }
        .question-text { font-size: 1.5em; color: #333; margin-bottom: 30px; font-weight: 600; text-align: center; }
        .answers-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .answer-btn { padding: 20px; border: 2px solid #e0e0e0; background: white; border-radius: 16px; font-size: 1.1em; cursor: pointer; transition: all 0.2s; font-weight: 600; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 0 #e0e0e0; }
        .answer-btn:active { transform: translateY(4px); box-shadow: none; }
        .answer-btn::before { content: attr(data-option); width: 30px; height: 30px; background: #f1f3f4; color: #5f6368; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 800; }
        .answer-btn:hover { border-color: #4285F4; background: #f8faff; }
        .selected-answer { background: #e8f0fe; border-color: #4285F4; box-shadow: 0 4px 0 #4285F4; }
        .selected-answer::before { background: #4285F4; color: white; }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes pulseZoom { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @media (max-width: 600px) { .answers-grid, .stats-row { grid-template-columns: 1fr; } .quiz-card { padding: 20px; } }
      `}</style>
    </div>
  );
}