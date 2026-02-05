import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";
import dns from "dns";

// 1. IMPORT MODELS
import Question from "./models/question.model.js";
import Session from "./models/session.model.js";

// 2. IMPORT ROUTES
import adminRoutes from "./routes/admin.routes.js";
import participantRoutes from "./routes/participant.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import questionRoutes from "./routes/question.routes.js";

// Fix for some network environments
dns.setServers(["8.8.8.8", "8.8.4.4"]);

dotenv.config();

/* ================= APP SETUP ================= */
const app = express();

// ✅ CORS: Allow connections from ANYWHERE
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());

// Basic Route
app.get("/", (req, res) => {
  res.send("GDG Quiz Backend is Running 🚀");
});

/* ================= ROUTES ================= */
app.use("/api/admin", adminRoutes);
app.use("/api/participants", participantRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/questions", questionRoutes);

/* ================= DATABASE ================= */
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/gdg-quiz";

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => console.error("❌ Mongo Error:", err.message));

/* ================= SOCKET SERVER ================= */
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Make 'io' accessible in Controllers
app.set("io", io);

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  // 🟢 1. BROADCAST LIVE COUNT TO ADMIN (On Connect)
  io.emit("admin:stats", { activeUsers: io.engine.clientsCount });

  // 2. JOIN ROOM
  socket.on("join:session", (code) => {
    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      socket.join(cleanCode);
      console.log(`User ${socket.id} joined room: ${cleanCode}`);
    }
  });

  // 3. 🟢 SYNC STATE (The Logic Fix)
  socket.on("sync:state", async (sessionCode) => {
    try {
      const code = String(sessionCode).trim().toUpperCase();
      const session = await Session.findOne({ sessionCode: code });

      if (!session) {
        socket.emit("error", "Session not found");
        return;
      }

      // A. If game is truly waiting (not started yet)
      if (session.status === "WAITING") {
        socket.emit("sync:idle");
        return;
      }

      // B. If game is FINISHED
      if (session.status === "FINISHED") {
        socket.emit("game:over", {});
        return;
      }

      // C. Check if a question is currently active
      const now = new Date();
      // Calculate remaining time if questionEndsAt exists
      const remainingTime = session.questionEndsAt
        ? Math.ceil((new Date(session.questionEndsAt) - now) / 1000)
        : 0;

      // 🟢 THE FIX: If time is remaining, show Question. 
      // If time is <= 0, show Leaderboard (NOT LOBBY).
      if (session.currentQuestionId && remainingTime > 0) {
        // Fetch the active question
        const question = await Question.findById(session.currentQuestionId).lean();

        if (question) {
          // Find the real Question Number
          const allQuestions = await Question.find({ sessionId: code })
            .sort({ createdAt: 1 })
            .select("_id")
            .lean();

          const qIndex = allQuestions.findIndex(
            (q) => q._id.toString() === question._id.toString(),
          );
          const total = allQuestions.length;

          // Send Question to user
          socket.emit("game:question", {
            qNum: qIndex + 1,
            total: total,
            time: remainingTime, 
            question: {
              _id: question._id,
              questionText: question.questionText,
              options: question.options.map((o) => ({ text: o.text })),
            },
            isSync: true,
          });
          return;
        }
      }

      // 🟢 D. If we are here, the question time is UP, so we are in "Break/Result" mode.
      // Send the Leaderboard so the user sees the result screen instead of the lobby.
      const topPlayers = await mongoose
        .model("Participant")
        .find({ sessionId: code })
        .sort({ totalScore: -1 })
        .limit(10)
        .select("name totalScore")
        .lean();

      socket.emit("game:ranks", topPlayers.map((p, idx) => ({
          id: p._id.toString(),
          rank: idx + 1,
          name: p.name,
          score: p.totalScore,
      })));

    } catch (e) {
      console.error("Sync Error:", e);
    }
  });

  // 4. DISCONNECT
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    // 🟢 BROADCAST LIVE COUNT TO ADMIN (On Disconnect)
    io.emit("admin:stats", { activeUsers: io.engine.clientsCount });
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`),
);