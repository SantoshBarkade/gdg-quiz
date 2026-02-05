import Participant from "../models/participant.model.js";
import Session from "../models/session.model.js";
import Question from "../models/question.model.js";
import Response from "../models/response.model.js"; 

export const joinSession = async (req, res, next) => {
  try {
    const { name, sessionCode, existingParticipantId } = req.body;

    const session = await Session.findOne({
      sessionCode: { $regex: new RegExp(`^${sessionCode}$`, "i") },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (!["WAITING", "ACTIVE"].includes(session.status)) {
      return res.status(400).json({ success: false, message: "Session closed" });
    }

    if (existingParticipantId) {
      const existingUser = await Participant.findOne({
        _id: existingParticipantId,
        sessionId: session.sessionCode,
      });

      if (existingUser) {
        return res.json({
          success: true,
          message: "Welcome back!",
          data: {
            participantId: existingUser._id,
            name: existingUser.name,
            uniqueCode: existingUser.participantNumber,
            sessionCode: session.sessionCode,
            sessionTitle: session.title || "Untitled Session",
            sessionStatus: session.status, 
            totalScore: existingUser.totalScore,
          },
        });
      }
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Invalid name" });
    }

    const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const participant = await Participant.create({
      sessionId: session.sessionCode,
      name: name.trim(),
      participantNumber: uniqueCode,
    });

    res.json({
      success: true,
      data: {
        participantId: participant._id,
        name: participant.name,
        uniqueCode: participant.participantNumber,
        sessionCode: session.sessionCode,
        sessionTitle: session.title || "Untitled Session",
        sessionStatus: session.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const submitAnswer = async (req, res, next) => {
  try {
    const { participantId, questionId, selectedOption, timeLeft } = req.body;
    
    // 🟢 FIND SESSION BY ID, NOT QUESTION (More Robust)
    // Finding by currentQuestionId is risky if user is late
    // But since we don't have sessionCode here, let's keep it but cast strict.
    const session = await Session.findOne({ currentQuestionId: questionId });

    if (!session || !session.currentQuestionId || String(session.currentQuestionId) !== String(questionId) || new Date() > session.questionEndsAt) {
      return res.status(400).json({ success: false, message: "Question not active or time up" });
    }

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ success: false, message: "Question not found" });

    const correctOptionObj = question.options.find((o) => o.isCorrect);
    const correctText = correctOptionObj ? correctOptionObj.text.trim().toLowerCase() : "";
    const userText = selectedOption ? String(selectedOption).trim().toLowerCase() : "";
    const isCorrect = correctText === userText;
    const safeTime = Math.max(0, Math.min(Number(timeLeft || 0), 15));
    const scoreDelta = isCorrect ? 10 + Math.round((safeTime / 15) * 10) : 0;

    const result = await Participant.updateOne(
      { _id: participantId, attemptedQuestions: { $ne: questionId } },
      { $inc: { totalScore: scoreDelta }, $addToSet: { attemptedQuestions: questionId, ...(isCorrect && { rightAnswersBucket: questionId }) } }
    );

    if (result.matchedCount === 0) return res.json({ success: true, message: "Already answered" });

    try {
      await Response.create({ questionId, participantId, selectedOption, isCorrect, marksObtained: scoreDelta, sessionId: session.sessionCode });
    } catch (e) { console.log("History save skipped"); }

    req.app.get("io")?.to(session.sessionCode)?.emit("leaderboard:update");
    res.json({ success: true, message: isCorrect ? "Correct" : "Wrong", added: scoreDelta });
  } catch (err) { next(err); }
};

export const getLeaderboard = async (req, res, next) => {
  try {
    const { sessionCode } = req.params;
    const participants = await Participant.find({ sessionId: { $regex: new RegExp(`^${sessionCode}$`, "i") } })
      .sort({ totalScore: -1, createdAt: 1 }).limit(50).select("name participantNumber totalScore createdAt");
    const leaderboard = participants.map((p, index) => ({ rank: index + 1, name: p.name, uniqueCode: p.participantNumber, totalScore: p.totalScore, joinedAt: p.createdAt }));
    res.json({ success: true, count: leaderboard.length, data: leaderboard });
  } catch (err) { next(err); }
};

export const getParticipantStats = async (req, res, next) => {
  try {
    const { participantId } = req.params;
    const participant = await Participant.findById(participantId);
    if (!participant) return res.status(404).json({ success: false, message: "Participant not found" });
    const totalQuestions = await Question.countDocuments({ sessionId: participant.sessionId });
    const correct = participant.rightAnswersBucket.length;
    const attempted = participant.attemptedQuestions.length;
    res.json({ success: true, data: { correct, wrong: attempted - correct, timeout: totalQuestions - attempted, totalScore: participant.totalScore } });
  } catch (err) { next(err); }
};

export const getGameHistory = async (req, res, next) => {
  try {
    const { participantId } = req.params;
    const participant = await Participant.findById(participantId);
    if (!participant) return res.status(404).json({ message: "Participant not found" });
    const questions = await Question.find({ sessionId: participant.sessionId }).sort({ order: 1 }).lean();
    const responses = await Response.find({ participantId }).lean();
    const history = questions.map(q => {
      // 🟢 STRING COMPARISON (Fix for Timeout Error)
      const userResponse = responses.find(r => String(r.questionId) === String(q._id));
      const correctOption = q.options.find(o => o.isCorrect);
      let status = "TIMEOUT"; let userSelected = "No Attempt";
      if (userResponse) { status = userResponse.isCorrect ? "CORRECT" : "WRONG"; userSelected = userResponse.selectedOption; }
      return { questionText: q.questionText, correctAnswer: correctOption ? correctOption.text : "N/A", userSelected: userSelected, status: status };
    });
    res.json({ success: true, data: history });
  } catch (err) { next(err); }
};