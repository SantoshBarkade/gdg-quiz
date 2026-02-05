"use client";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";

const API_URL = "https://gdg-quiz.onrender.com/api";

export default function Dashboard() {
  const router = useRouter();
  const socket = getSocket();

  const [passcode, setPasscode] = useState("");
  const [sessions, setSessions] = useState([]);
  const [questions, setQuestions] = useState([]);
  
  // 🟢 NEW STATS STATE
  const [stats, setStats] = useState({ activeUsers: 0, sessionCounts: {} });

  const [currentSessionCode, setCurrentSessionCode] = useState(null);
  const [managerView, setManagerView] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [qText, setQText] = useState("");
  const [options, setOptions] = useState([{ text: "", isCorrect: false }, { text: "", isCorrect: false }]);
  const [previewQ, setPreviewQ] = useState(null);
  const [updateQ, setUpdateQ] = useState(null);
  const [updateText, setUpdateText] = useState("");
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const p = sessionStorage.getItem("ADMIN_PASSCODE");
    if (!p) return router.push("/admin");
    setPasscode(p);
    loadSessions(p);

    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    // 🟢 LISTEN FOR DETAILED STATS
    socket.on("admin:stats", (data) => {
      setStats({ 
        activeUsers: data.activeUsers, 
        sessionCounts: data.sessionCounts || {} 
      });
    });

    return () => socket.off("admin:stats");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const loadSessions = async (token = passcode) => {
    try {
      const res = await fetch(`${API_URL}/sessions`);
      const data = await res.json();
      setSessions(data.data || []);
    } catch (e) { console.error("Load Error", e); }
  };

  const createSession = async () => {
    if (!newTitle || !newCode) return alert("Please fill in both fields.");
    try {
      await fetch(`${API_URL}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "admin-passcode": passcode },
        body: JSON.stringify({ title: newTitle, sessionCode: newCode.toUpperCase() }),
      });
      setNewTitle(""); setNewCode(""); loadSessions();
    } catch (e) { console.error(e); }
  };

  const startSession = async (id, code) => {
    if (!confirm(`Start Session ${code}? Players can join now.`)) return;
    window.open(`/leaderboard?code=${code}`, "_blank");
    try {
      await fetch(`${API_URL}/sessions/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "admin-passcode": passcode },
        body: JSON.stringify({ sessionCode: code }),
      });
      loadSessions();
    } catch (e) { alert("Network error starting session"); }
  };

  const stopSession = async (id) => {
    if (!confirm("Stop Session? Users will be redirected.")) return;
    await fetch(`${API_URL}/sessions/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "admin-passcode": passcode },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    loadSessions();
  };

  const deleteSession = async (code) => {
    if (!confirm("PERMANENTLY DELETE Session?")) return;
    await fetch(`${API_URL}/sessions/code/${code}/permanent`, {
      method: "DELETE", headers: { "admin-passcode": passcode },
    });
    if (currentSessionCode === code) closeManager();
    loadSessions();
  };

  const resetSession = async (id) => {
    if (!confirm("Reset Session Data?")) return;
    await fetch(`${API_URL}/sessions/${id}/data`, {
      method: "DELETE", headers: { "admin-passcode": passcode },
    });
    alert("Session data cleared.");
    loadSessions();
  };

  const openQManager = (code) => {
    setCurrentSessionCode(code);
    setManagerView(true);
    fetchQuestions(code);
    setQText("");
    setOptions([{ text: "", isCorrect: false }, { text: "", isCorrect: false }]);
  };

  const closeManager = () => { setManagerView(false); setCurrentSessionCode(null); };

  const fetchQuestions = async (code) => {
    try {
      const res = await fetch(`${API_URL}/questions/session/${code}`);
      const data = await res.json();
      const qList = data.data || [];
      setQuestions(qList);
    } catch (e) { console.error(e); }
  };

  const handleOptionChange = (index, field, value) => {
    const newOpts = [...options];
    if (field === "isCorrect") {
      newOpts.forEach((o) => (o.isCorrect = false));
      newOpts[index].isCorrect = true;
    } else {
      newOpts[index][field] = value;
    }
    setOptions(newOpts);
  };

  const saveQuestion = async () => {
    if (!qText || options.some((o) => !o.text)) return alert("Question and Options cannot be empty");
    if (!options.some((o) => o.isCorrect)) return alert("Select at least one correct answer");
    await fetch(`${API_URL}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "admin-passcode": passcode },
      body: JSON.stringify({ sessionId: currentSessionCode, questionText: qText, options, marks: 10 }),
    });
    setQText(""); setOptions([{ text: "", isCorrect: false }, { text: "", isCorrect: false }]);
    fetchQuestions(currentSessionCode);
  };

  const deleteQuestion = async (id) => {
    if (!confirm("Delete this question?")) return;
    await fetch(`${API_URL}/questions/${id}`, { method: "DELETE", headers: { "admin-passcode": passcode } });
    fetchQuestions(currentSessionCode);
  };

  const moveQuestion = async (id, dir) => {
    await fetch(`${API_URL}/questions/reorder/all`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "admin-passcode": passcode },
      body: JSON.stringify({ questionId: id, direction: dir }),
    });
    fetchQuestions(currentSessionCode);
  };

  const openUpdateModal = (q) => { setUpdateQ(q); setUpdateText(q.questionText); };

  const confirmUpdate = async () => {
    if (!updateText || !updateQ) return;
    await fetch(`${API_URL}/questions/${updateQ._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "admin-passcode": passcode },
      body: JSON.stringify({ sessionId: currentSessionCode, questionText: updateText, options: updateQ.options, marks: 10 }),
    });
    setUpdateQ(null); fetchQuestions(currentSessionCode);
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo"><div className="logo-icon">🛠</div><span>Admin Panel</span></div>
        <div className="card" style={{ padding: "20px", background: "var(--bg-light)", boxShadow: "none" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "16px" }}>Create Session</h3>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title (e.g. JS Quiz)" />
          <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="Code (e.g. QUIZ101)" />
          <button className="btn-blue" style={{ width: "100%" }} onClick={createSession}>+ Add Session</button>
        </div>
        <h3 style={{ fontSize: "0.938rem", color: "var(--text-secondary)", margin: "24px 0 16px 12px", fontWeight: 500 }}>Your Sessions</h3>
        <div>
          {sessions.map((s) => (
            <div key={s._id} className={`session-item ${s.status === "ACTIVE" ? "active-session" : ""}`}>
              <div className="session-info">
                <div className="session-title">{s.title}</div>
                <div className="session-meta">
                  <span className="code-pill">{s.sessionCode}</span>
                  <span className={`badge ${s.status}`}>{s.status}</span>
                  {/* 🟢 NEW: Player Count for this Session */}
                  <span className="player-count">👥 {stats.sessionCounts[s.sessionCode] || 0}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button className="btn-blue" onClick={() => openQManager(s.sessionCode)} style={{ gridColumn: "span 2" }}>Manage Questions</button>
                {s.status === "ACTIVE" ? (<button className="btn-yellow" onClick={() => stopSession(s._id)}>Stop</button>) : (<button className="btn-green" onClick={() => startSession(s._id, s.sessionCode)}>Start</button>)}
                <button className="btn-purple" onClick={() => resetSession(s._id)} title="Reset Scores">♻️</button>
                <button className="btn-red" onClick={() => deleteSession(s.sessionCode)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="top-navbar">
          <div className="page-title">Dashboard Overview</div>
          <div className="navbar-actions">
            <button className="leaderboard-link" onClick={() => currentSessionCode ? window.open(`/leaderboard?code=${currentSessionCode}`) : alert("Select a session first")} style={{ marginRight: "10px" }}>
              <span className="leaderboard-icon">🏆</span><span>Leaderboard</span>
            </button>
            <button className="theme-toggle" onClick={toggleTheme}>{theme === "light" ? "🌙" : "☀️"}</button>
          </div>
        </div>

        {/* Global Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🌐</div>
            {/* 🟢 Subtract 1 to hide admin self-connection */}
            <div className="stat-value">{Math.max(0, stats.activeUsers - 1)}</div>
            <div className="stat-label">Total Connections</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{sessions.length}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>

        {/* Manager View (Kept same) */}
        {!managerView ? (
          <div className="card">
            <div className="placeholder-content">
              <div className="placeholder-icon">📋</div>
              <div className="placeholder-text">Select a session to manage questions</div>
            </div>
          </div>
        ) : (
          <div>
            <div className="section-header">
              <h2 style={{ margin: 0 }}>Managing: <span className="code-badge">{currentSessionCode}</span></h2>
              <button className="btn-grey" onClick={closeManager}>Close</button>
            </div>
            {/* ... Question Forms (Same as before) ... */}
            <div className="card">
              <h3>Add New Question</h3>
              <input value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Enter question..." style={{ fontSize: "1rem", padding: "16px" }} />
              <div>{options.map((opt, idx) => (<div key={idx} className="option-row"><input type="radio" name="correct" checked={opt.isCorrect} onChange={() => handleOptionChange(idx, "isCorrect", true)} /><input className="opt-text" placeholder="Option text..." value={opt.text} onChange={(e) => handleOptionChange(idx, "text", e.target.value)} />{options.length > 2 && <button className="btn-red" onClick={() => setOptions(options.filter((_, i) => i !== idx))}>✕</button>}</div>))}</div>
              <button className="btn-grey" style={{ marginTop: "10px" }} onClick={() => setOptions([...options, { text: "", isCorrect: false }])}>+ Add Option</button>
              <div style={{ marginTop: "24px" }}><button className="btn-blue" onClick={saveQuestion}>Save Question</button></div>
            </div>
            <h3 style={{ margin: "32px 0 16px 0" }}>Existing Questions</h3>
            <div>{questions.map((q, index) => (<div key={q._id} className="question-box"><div className="q-header"><div style={{ display: "flex", alignItems: "center", flex: 1 }}><span className="question-number">{index + 1}</span><strong>{q.questionText}</strong></div><div style={{ display: "flex", gap: "12px", alignItems: "center" }}><div className="reorder-controls"><button className="reorder-btn" disabled={index === 0} onClick={() => moveQuestion(q._id, "up")}>▲</button><button className="reorder-btn" disabled={index === questions.length - 1} onClick={() => moveQuestion(q._id, "down")}>▼</button></div><div className="q-actions"><button className="btn-outline" onClick={() => setPreviewQ(q)}>Preview</button><button className="btn-blue" onClick={() => openUpdateModal(q)}>Update</button><button className="btn-red" onClick={() => deleteQuestion(q._id)}>Delete</button></div></div></div></div>))}</div>
          </div>
        )}
      </main>

      {/* Modals & CSS (Keep same) */}
      {previewQ && (<div className="modal show" onClick={(e) => e.target.className.includes("modal") && setPreviewQ(null)}><div className="modal-content"><span className="close" onClick={() => setPreviewQ(null)}>✕</span><h2>Preview</h2><p>{previewQ.questionText}</p></div></div>)}
      {updateQ && (<div className="modal show" onClick={(e) => e.target.className.includes("modal") && setUpdateQ(null)}><div className="modal-content"><span className="close" onClick={() => setUpdateQ(null)}>✕</span><h2>Update</h2><input value={updateText} onChange={(e) => setUpdateText(e.target.value)} /><button className="btn-blue" onClick={confirmUpdate}>Save</button></div></div>)}
      
      <style jsx global>{`
        /* ... existing styles ... */
        @import url("https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto:wght@300;400;500;700&display=swap");
        :root { --google-blue: #4285f4; --google-red: #ea4335; --google-yellow: #fbbc05; --google-green: #34a853; --white: #ffffff; --bg-light: #f8f9fa; --text-primary: #202124; --text-secondary: #5f6368; --border-light: #dadce0; --shadow-sm: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15); }
        [data-theme="dark"] { --white: #1f1f1f; --bg-light: #121212; --text-primary: #e8eaed; --text-secondary: #9aa0a6; --border-light: #3c4043; }
        body { margin: 0; font-family: "Roboto", sans-serif; background: var(--bg-light); color: var(--text-primary); }
        .layout { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
        .sidebar { background: var(--white); padding: 24px 16px; position: sticky; top: 0; height: 100vh; overflow-y: auto; border-right: 1px solid var(--border-light); }
        .logo { font-family: "Google Sans", sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 32px; display: flex; align-items: center; gap: 8px; padding: 0 12px; }
        .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, var(--google-blue), var(--google-green)); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; }
        .main-content { padding: 32px 40px; max-width: 1400px; }
        .top-navbar { background: var(--white); padding: 20px 32px; border-radius: 16px; margin-bottom: 32px; box-shadow: var(--shadow-sm); display: flex; justify-content: space-between; align-items: center; }
        .page-title { font-family: "Google Sans", sans-serif; font-size: 1.75rem; font-weight: 700; color: var(--text-primary); }
        .navbar-actions { display: flex; align-items: center; gap: 12px; }
        .leaderboard-link { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, var(--google-blue), var(--google-green)); color: white; text-decoration: none; border-radius: 12px; font-family: "Google Sans", sans-serif; font-weight: 600; font-size: 0.875rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .theme-toggle { background: var(--bg-light); border: 2px solid var(--border-light); cursor: pointer; padding: 10px; display: flex; align-items: center; justify-content: center; border-radius: 12px; width: 44px; height: 44px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 32px; }
        .stat-card { background: var(--white); padding: 24px; border-radius: 16px; box-shadow: var(--shadow-sm); position: relative; overflow: hidden; }
        .stat-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--google-blue); }
        .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 24px; background: rgba(66, 133, 244, 0.1); color: var(--google-blue); }
        .stat-value { font-family: "Google Sans", sans-serif; font-size: 2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .stat-label { font-size: 0.875rem; color: var(--text-secondary); font-weight: 500; }
        .card { background: var(--white); padding: 28px; border-radius: 16px; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
        input { width: 100%; padding: 14px 16px; margin-bottom: 16px; background: var(--white); border: 2px solid var(--border-light); border-radius: 12px; color: var(--text-primary); font-size: 0.938rem; font-family: "Roboto", sans-serif; box-sizing: border-box; }
        input:focus { outline: none; border-color: var(--google-blue); }
        button { padding: 12px 24px; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 0.875rem; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: "Google Sans", sans-serif; transition: all 0.2s; }
        button:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .btn-blue { background: var(--google-blue); color: white; }
        .btn-green { background: var(--google-green); color: white; }
        .btn-red { background: var(--google-red); color: white; }
        .btn-yellow { background: var(--google-yellow); color: var(--text-primary); }
        .btn-purple { background: #9334e9; color: white; }
        .btn-grey { background: #e8eaed; color: var(--text-primary); }
        .btn-outline { background: transparent; color: var(--google-blue); border: 2px solid var(--google-blue); }
        .session-item { padding: 20px; background: var(--white); border: 2px solid var(--border-light); border-radius: 12px; margin-bottom: 12px; }
        .active-session { border-color: var(--google-green); background: rgba(52, 168, 83, 0.03); }
        .session-title { font-weight: 700; font-size: 1.063rem; color: var(--text-primary); margin-bottom: 6px; }
        .session-meta { font-size: 0.875rem; color: var(--text-secondary); display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
        .code-pill { background: #e8f0fe; color: var(--google-blue); padding: 4px 8px; border-radius: 6px; font-weight: 700; }
        .player-count { background: #fce8e6; color: #c5221f; padding: 4px 8px; border-radius: 6px; font-weight: 600; margin-left: auto; }
        .badge { padding: 4px 12px; font-size: 0.75rem; border-radius: 12px; font-weight: 700; text-transform: uppercase; }
        .WAITING { background: rgba(251, 188, 5, 0.15); color: #e37400; }
        .ACTIVE { background: rgba(52, 168, 83, 0.15); color: #188038; }
        .COMPLETED { background: rgba(0, 0, 0, 0.05); color: var(--text-secondary); }
        .section-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 28px; background: linear-gradient(135deg, rgba(66, 133, 244, 0.05), rgba(52, 168, 83, 0.05)); border-radius: 12px; margin-bottom: 20px; border-left: 4px solid var(--google-blue); }
        .code-badge { color: var(--google-blue); font-weight: 700; font-size: 1.125rem; }
        .question-box { border: 2px solid var(--border-light); padding: 24px; margin-bottom: 16px; background: var(--white); border-radius: 12px; }
        .question-number { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; background: var(--google-blue); color: white; border-radius: 8px; font-weight: 700; margin-right: 12px; }
        .reorder-controls { display: flex; flex-direction: column; gap: 4px; }
        .reorder-btn { padding: 4px 8px; font-size: 12px; min-width: 32px; background: var(--border-light); color: var(--text-primary); border-radius: 6px; }
        .reorder-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .option-row { display: flex; gap: 12px; margin-bottom: 12px; align-items: center; }
        .option-row input[type="radio"] { width: 20px; height: 20px; margin-bottom: 0; cursor: pointer; accent-color: var(--google-blue); }
        .placeholder-content { text-align: center; padding: 80px 20px; }
        .placeholder-icon { font-size: 64px; margin-bottom: 24px; opacity: 0.3; }
        .placeholder-text { font-size: 1.25rem; color: var(--text-secondary); }
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
        .modal.show { display: flex; align-items: center; justify-content: center; }
        .modal-content { background: var(--white); padding: 32px; width: 90%; max-width: 600px; border-radius: 16px; box-shadow: var(--shadow-lg); position: relative; animation: slideUp 0.3s ease; }
        .close { position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-secondary); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .close:hover { background: var(--bg-light); color: var(--text-primary); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}