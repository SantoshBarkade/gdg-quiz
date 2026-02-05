import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";
import dns from "dns";

import Question from "./models/question.model.js";
import Session from "./models/session.model.js";

import adminRoutes from "./routes/admin.routes.js";
import participantRoutes from "./routes/participant.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import questionRoutes from "./routes/question.routes.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"], credentials: true }));
app.use(express.json());

app.get("/", (req, res) => res.send("GDG Quiz Backend is Running 🚀"));

app.use("/api/admin", adminRoutes);
app.use("/api/participants", participantRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/questions", questionRoutes);

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/gdg-quiz";
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ Mongo Error:", err.message));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
app.set("io", io);

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  // 🟢 1. BROADCAST LIVE COUNT TO ADMIN
  io.emit("admin:stats", { activeUsers: io.engine.clientsCount });

  socket.on("join:session", (code) => {
    if (code) {
      socket.join(String(code).trim().toUpperCase());
    }
  });

  // 2. SYNC STATE
  socket.on("sync:state", async (sessionCode) => {
    try {
      const code = String(sessionCode).trim().toUpperCase();
      const session = await Session.findOne({ sessionCode: code });

      if (!session) { socket.emit("error", "Session not found"); return; }
      if (session.status === "WAITING") { socket.emit("sync:idle"); return; }
      if (session.status === "FINISHED") { socket.emit("game:over", {}); return; }

      const now = new Date();
      if (session.currentQuestionId && session.questionEndsAt > now) {
        const remainingTime = Math.ceil((new Date(session.questionEndsAt) - now) / 1000);
        const question = await Question.findById(session.currentQuestionId).lean();

        if (question) {
          const allQuestions = await Question.find({ sessionId: code }).sort({ createdAt: 1 }).select("_id").lean();
          const qIndex = allQuestions.findIndex((q) => q._id.toString() === question._id.toString());
          
          socket.emit("game:question", {
            qNum: qIndex + 1,
            total: allQuestions.length,
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

      // If in break, send ranks
      const topPlayers = await mongoose.model("Participant").find({ sessionId: code })
        .sort({ totalScore: -1 }).limit(10).select("name totalScore").lean();

      socket.emit("game:ranks", topPlayers.map((p, idx) => ({
        id: p._id.toString(),
        rank: idx + 1,
        name: p.name,
        score: p.totalScore,
      })));
    } catch (e) { console.error("Sync Error:", e); }
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    // 🟢 UPDATE COUNT ON DISCONNECT
    io.emit("admin:stats", { activeUsers: io.engine.clientsCount });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));