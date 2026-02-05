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

  const timerRef = useRef(null);

  useEffect(() => {
    const pId = sessionStorage.getItem("PARTICIPANT_ID");
    const code = sessionStorage.getItem("SESSION_CODE");
    const name = sessionStorage.getItem("PLAYER_NAME");

    if (!pId || !code) { router.push("/user"); return; }

    setPlayer((prev) => ({ ...prev, name: name || "Player" }));
    setView("LOBBY");

    socket.emit("join:session", code);
    socket.emit("sync:state", code);

    socket.on("game:question", handleNewQuestion);
    socket.on("game:result", handleResult);
    socket.on("game:ranks", handleRanks);
    socket.on("game:over", handleGameOver);
    socket.on("sync:idle", () => setView("LOBBY"));
    socket.on("game:force_stop", () => { alert("The host has ended the session."); router.push("/"); });
    socket.on("connect", () => { socket.emit("join:session", code); socket.emit("sync:state", code); });

    return () => {
      socket.off("game:question"); socket.off("game:result"); socket.off("game:ranks");
      socket.off("game:over"); socket.off("sync:idle"); socket.off("game:force_stop");
      socket.off("connect"); clearInterval(timerRef.current);
    };
  }, []);

  const handleNewQuestion = (data) => {
    setView("QUESTION");
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
    setView("RESULT");
    setResult(data);
    if (data.correctAnswer === selectedOption) triggerConfetti();
  };

  const handleRanks = (rankList) => {
    setLeaderboard(rankList);
    if (view === "LOBBY" || view === "LOADING") {
       setView("RESULT");
    }
    const pId = sessionStorage.getItem("PARTICIPANT_ID");
    const me = rankList.find((p) => p.id === pId);
    if (me) {
      setPlayer((prev) => ({ ...prev, rank: me.rank, score: me.score }));
    }
  };

  const handleGameOver = async (data) => {
    clearInterval(timerRef.current);
    setView("GAMEOVER");
    if (data.winners) setWinners(data.winners);
    triggerConfetti(true);

    try {
      const pId = sessionStorage.getItem("PARTICIPANT_ID");
      const res = await fetch(`${API_URL}/participants/history/${pId}`);
      const json = await res.json();
      if (json.success) {
        setHistory(json.data);
        const correct = json.data.filter((h) => h.status === "CORRECT").length;
        const incorrect = json.data.filter((h) => h.status === "WRONG").length;
        const timeout = json.data.filter((h) => h.status === "TIMEOUT").length || 0;
        setStats({ correct, incorrect, timeout });
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

  if (view === "LOADING") return <div className="min-h-screen flex items-center justify-center text-xl font-bold text-gray-500">Loading Game...</div>;

  return (
    <div className="main-body">
      {/* 🟢 NEW: Background Grid Layer */}
      <div className="background-grid"></div>

      <div className="container">
        <div className="quiz-card">
          {view === "LOBBY" && (
            <div className="start-screen">
              <h1>🎯 GDG Quiz</h1>
              <p className="start-screen-subtitle">Welcome, <span style={{ color: "#2563eb", fontWeight: "bold" }}>{player.name}</span>!</p>
              <div className="quiz-rules"><h3>Waiting for Host...</h3><ul><li>Keep this screen open.</li><li>The game will start automatically.</li><li>Faster answers get more points!</li></ul></div>
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
               <div className="trophy-container" style={{ fontSize: "4em" }}>{selectedOption === result.correctAnswer ? "🎉" : selectedOption ? "❌" : "⏰"}</div>
               <h2 className="complete-title">{selectedOption === result.correctAnswer ? <span style={{ color: "#34A853" }}>Correct!</span> : <span style={{ color: "#EA4335" }}>Wrong!</span>}</h2>
               <div className="performance-message" style={{ marginBottom: "20px" }}>Correct Answer: <strong>{result.correctAnswer}</strong></div>
               <div className="stats-row" style={{ marginBottom: "20px" }}>
                <div className="mini-stat" style={{ background: "#e8f0fe", borderColor: "#4285F4" }}><div className="stat-num" style={{ color: "#4285F4" }}>{player.score}</div><div className="stat-text">Score</div></div>
                <div className="mini-stat" style={{ background: "#fef9c3", borderColor: "#facc15" }}><div className="stat-num" style={{ color: "#b45309" }}>#{player.rank}</div><div className="stat-text">Current Rank</div></div>
              </div>
               <p style={{ color: "#666", marginTop: "10px" }}>Waiting for next question...</p>
            </div>
          )}

          {view === "GAMEOVER" && (
            <div className="results-container">
               <div className="trophy-icon">🏆</div>
               <h2 className="complete-title">Quiz Complete!</h2>
               <div className="leaderboard-card"><div className="leaderboard-header">Top Winners</div><div className="leaderboard-list">{winners.map((w, idx) => (<div key={idx} className={`leader-item ${idx===0?"gold":idx===1?"silver":idx===2?"bronze":""}`}><span>#{idx+1} {w.name}</span><span className="pts">{w.score} pts</span></div>))}</div></div>
               <div className="performance-card"><div className="perf-label">Your Performance</div><div className="rank-value">Rank: <span>#{player.rank}</span></div><div className="accuracy-label">Score: {player.score} pts</div></div>
               <div className="review-section">
                  <h3 style={{marginTop: "20px", marginBottom: "10px", color:"#333"}}>📝 Your Answers Review</h3>
                  <div className="review-list">
                     {history.length > 0 ? history.map((h, i) => (
                        <div key={i} className={`review-card ${h.status === "CORRECT" ? "rev-correct" : "rev-wrong"}`}>
                           <div className="rev-header"><span className="q-badge">Q{i+1}</span><span className="rev-status-text">{h.status}</span></div>
                           <p className="rev-q-text">{h.questionText}</p>
                           <div className="rev-ans-row"><div className="rev-box user-box">You: {h.userSelected}</div><div className="rev-box correct-box">Ans: {h.correctAnswer}</div></div>
                        </div>
                     )) : <p style={{color: "#777"}}>Loading review...</p>}
                  </div>
               </div>
               <button className="restart-btn" onClick={() => router.push("/")} style={{marginTop: "20px"}}>Exit to Home</button>
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`
        * { box-sizing: border-box; }
        .main-body { 
          font-family: "Segoe UI", sans-serif; 
          background: #f8f9fa; /* Fallback */
          min-height: 100vh; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          padding: 20px; 
          position: relative; /* Context for absolute bg */
          overflow: hidden;
        }
        
        /* 🟢 NEW: Dot Grid Background */
        .background-grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.6;
          z-index: 0;
          pointer-events: none;
        }

        .container { 
          max-width: 800px; 
          width: 100%; 
          position: relative; /* Sit above background */
          z-index: 1; 
        }

        .quiz-card { 
          background: white; 
          border-radius: 20px; 
          padding: 40px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.08); 
          /* 🟢 NEW: Border Matching Website Theme */
          border: 1px solid #e5e7eb;
          border-top: 6px solid #4285F4; /* Google Blue Accent */
        }

        /* Review Section */
        .review-section { border-top: 2px dashed #e0e0e0; padding-top: 20px; margin-top: 20px; text-align: left; }
        .review-list { max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
        .review-card { padding: 15px; border-radius: 12px; border: 1px solid #eee; background: #fafafa; }
        .rev-correct { border-left: 5px solid #34A853; background: #f0fdf4; }
        .rev-wrong { border-left: 5px solid #EA4335; background: #fef2f2; }
        .rev-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold; font-size: 0.9em; }
        .q-badge { background: #eee; padding: 2px 8px; border-radius: 4px; color: #555; }
        .rev-q-text { font-weight: 600; margin-bottom: 10px; color: #333; font-size: 1rem; }
        .rev-ans-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em; }
        .rev-box { padding: 5px 10px; border-radius: 6px; }
        .user-box { background: #fff; border: 1px solid #ddd; }
        .correct-box { background: #e6fffa; border: 1px solid #b2f5ea; color: #047481; font-weight: bold; }
        
        /* Leaderboard & Stats */
        .leaderboard-list { max-height: 250px; overflow-y: auto; }
        .leader-item { display: flex; justify-content: space-between; padding: 10px; margin-bottom: 5px; background: #f9f9f9; border-radius: 8px; }
        .gold { background: #fff8e1; border: 1px solid #ffc107; }
        .silver { background: #f5f5f5; border: 1px solid #ccc; }
        .bronze { background: #fbe9e7; border: 1px solid #ff7043; }
        .stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .mini-stat { padding: 10px; border-radius: 10px; background: #f5f5f5; text-align: center; }
        .correct-val { color: #34A853; font-weight: bold; font-size: 1.5em; }
        .incorrect-val { color: #EA4335; font-weight: bold; font-size: 1.5em; }
        .timeout-val { color: #FBBC05; font-weight: bold; font-size: 1.5em; }
        
        /* Timer & Progress */
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
        
        /* Buttons & Text */
        .question-counter { background: #ea4335; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; }
        .score-display-top { color: #34a853; font-weight: 600; padding: 8px 16px; background: rgba(52, 168, 83, 0.1); border-radius: 20px; }
        .question-text { font-size: 1.5em; color: #333; margin-bottom: 30px; font-weight: 600; text-align: center; }
        .answers-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .answer-btn { padding: 20px; border: 2px solid #a4b1ff; background: white; border-radius: 12px; font-size: 1.1em; cursor: pointer; transition: all 0.2s; font-weight: 600; display: flex; align-items: center; gap: 15px; }
        .answer-btn::before { content: attr(data-option); width: 30px; height: 30px; background: #4285f4; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .answer-btn:hover { background: #f8f9ff; }
        .selected-answer { background: #e0f2fe; border-color: #2563eb; }
        .start-screen, .results-container { text-align: center; animation: fadeIn 1s ease forwards; }
        .complete-title { color: #4285f4; font-size: 2.2em; margin-bottom: 25px; font-weight: 800; }
        .trophy-icon, .trophy-container { font-size: 4em; margin-bottom: 10px; display: inline-block; animation: pulseZoom 2s ease-in-out infinite; }
        .leaderboard-card { border: 4px solid #9eabf5; border-radius: 15px; padding: 15px; margin-bottom: 25px; }
        .leaderboard-header { font-weight: 800; margin-bottom: 12px; font-size: 0.9em; color: #333; }
        .performance-card { background: #4285f4; color: white; border-radius: 15px; padding: 25px; margin-bottom: 25px; border: 2px solid #141414; }
        .perf-label { font-size: 0.9em; font-weight: 600; opacity: 0.9; }
        .rank-value { font-size: 2.5em; font-weight: 900; margin: 5px 0; }
        .accuracy-label { font-size: 1em; font-weight: 600; opacity: 0.9; }
        .restart-btn { background: #4285f4; color: white; border: none; padding: 15px 40px; border-radius: 30px; font-weight: 800; font-size: 1em; cursor: pointer; transition: transform 0.2s; }
        .restart-btn:hover { transform: scale(1.05); }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes pulseZoom { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes pulseZoom1 { 0% { transform: scale(1); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
        @media (max-width: 600px) { .answers-grid, .stats-row { grid-template-columns: 1fr; } .quiz-card { padding: 20px; } }
      `}</style>
    </div>
  );
}