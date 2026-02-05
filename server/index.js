import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";
import dns from "dns";

import Question from "./models/question.model.js";
import Session from "./models/session.model.js";
import Participant from "./models/participant.model.js";

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

// 🟢 HELPER: Count UNIQUE Participants (Deduplicate tabs & Ignore Admin)
const getUniqueCountInRoom = (room) => {
  const ids = io.sockets.adapter.rooms.get(room);
  if (!ids) return 0;
  
  const uniqueParticipants = new Set();
  for (const id of ids) {
    const socket = io.sockets.sockets.get(id);
    // Only count if they have a participantId (Players)
    if (socket && socket.participantId) {
      uniqueParticipants.add(socket.participantId);
    }
  }
  return uniqueParticipants.size;
};

const getAdminStats = () => {
  const sessionCounts = {};
  const allUniquePlayers = new Set();

  for (const [room, ids] of io.sockets.adapter.rooms) {
    // Check if room looks like a Session Code (Uppercase, 6 chars etc)
    if (room.length <= 10 && room === room.toUpperCase()) {
       const count = getUniqueCountInRoom(room);
       sessionCounts[room] = count;
       
       // Add to global set
       const roomIds = io.sockets.adapter.rooms.get(room);
       if(roomIds) {
         for(const id of roomIds) {
            const s = io.sockets.sockets.get(id);
            if(s && s.participantId) allUniquePlayers.add(s.participantId);
         }
       }
    }
  }
  return {
    activeUsers: allUniquePlayers.size, // Truly unique players only
    sessionCounts 
  };
};

const broadcastStats = () => {
  io.emit("admin:stats", getAdminStats());
};

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);
  broadcastStats();

  // 🟢 JOIN SESSION: Now accepts participantId to tag the socket
  socket.on("join:session", (code, participantId) => {
    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      
      // Tag Socket
      if (participantId) socket.participantId = participantId;
      
      socket.join(cleanCode);
      
      // Update Lobby with UNIQUE count
      const uniqueCount = getUniqueCountInRoom(cleanCode);
      io.to(cleanCode).emit("session:update", Array(uniqueCount).fill({})); 
      
      broadcastStats();
    }
  });

  socket.on("sync:state", async (sessionCode) => {
    try {
      const code = String(sessionCode).trim().toUpperCase();
      const session = await Session.findOne({ sessionCode: code });

      if (!session) return socket.emit("error", "Session not found");
      if (session.status === "WAITING") return socket.emit("sync:idle");
      
      if (session.status === "FINISHED") {
        const winners = await Participant.find({ sessionId: code }).sort({ totalScore: -1 }).limit(3).lean();
        return socket.emit("game:over", { winners });
      }

      const now = new Date();
      const remainingTime = session.questionEndsAt ? Math.ceil((new Date(session.questionEndsAt) - now) / 1000) : 0;

      if (session.currentQuestionId && remainingTime > 0) {
        const question = await Question.findById(session.currentQuestionId).lean();
        if (question) {
          const allQuestions = await Question.find({ sessionId: code }).sort({ createdAt: 1 }).select("_id").lean();
          const qIndex = allQuestions.findIndex(q => q._id.toString() === question._id.toString());
          
          return socket.emit("game:question", {
            qNum: qIndex + 1,
            total: allQuestions.length,
            time: remainingTime,
            question: {
              _id: question._id,
              questionText: question.questionText,
              options: question.options.map(o => ({ text: o.text })),
            },
            isSync: true,
          });
        }
      }

      const topPlayers = await Participant.find({ sessionId: code }).sort({ totalScore: -1 }).limit(10).select("name totalScore").lean();
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

  socket.on("disconnect", () => {
    broadcastStats();
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));