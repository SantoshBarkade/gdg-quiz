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
    // Optional: Reset stuck sessions on restart
    // await Session.updateMany({ status: "ACTIVE" }, { status: "WAITING" });
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

  // 1. JOIN ROOM
  socket.on("join:session", (code) => {
    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      socket.join(cleanCode);
      console.log(`User ${socket.id} joined room: ${cleanCode}`);

      // Update lobby count
      const roomSize = io.sockets.adapter.rooms.get(cleanCode)?.size || 0;
      io.to(cleanCode).emit("session:update", Array(roomSize).fill({}));
    }
  });

  // 2. SYNC STATE (For Reconnecting Users)
  socket.on("sync:state", async (sessionCode) => {
    try {
      const code = String(sessionCode).trim().toUpperCase();
      const session = await Session.findOne({ sessionCode: code });

      // If game isn't active or no question is currently running
      if (
        !session ||
        session.status !== "ACTIVE" ||
        !session.currentQuestionId
      ) {
        socket.emit("sync:idle");
        return;
      }

      // Check time remaining
      const remaining = session.questionEndsAt
        ? Math.floor(
            (new Date(session.questionEndsAt).getTime() - Date.now()) / 1000,
          )
        : 0;

      if (remaining <= 0) {
        // If time is up, we are likely in the "Result" or "Break" phase
        // You could emit the last result here if you wanted
        socket.emit("sync:idle");
        return;
      }

      // If time remains, send the current question immediately
      const q = await Question.findById(session.currentQuestionId);
      if (!q) return;

      socket.emit("game:question", {
        qNum: 999, // We might not know exact qNum here without complex queries, usually fine to omit or fetch
        total: "?",
        time: remaining,
        question: {
          _id: q._id,
          questionText: q.questionText,
          options: q.options.map((o) => ({ text: o.text })), // Hide Correct Answer
        },
        isSync: true,
      });
    } catch (e) {
      console.error("❌ Sync error:", e);
    }
  });

  // 3. DISCONNECT
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`),
);
