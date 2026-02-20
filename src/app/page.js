"use client";

import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { FaInstagram, FaLinkedin, FaGithub, FaEnvelope } from "react-icons/fa";

export default function GDGLandingPage() {
  const [quizState, setQuizState] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState(0);

  const processRef = useRef(null);

  // --- Quiz Animation Loop ---
  useEffect(() => {
    const runQuizCycle = () => {
      setQuizState(0);
      setTimeout(() => setQuizState(1), 1000);
      setTimeout(() => setQuizState(2), 2000);
      setTimeout(() => setQuizState(3), 2800);
      setTimeout(() => setQuizState(4), 3500);
    };

    runQuizCycle();
    const interval = setInterval(runQuizCycle, 6500);
    return () => clearInterval(interval);
  }, []);

  // --- Intersection Observer ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let count = 0;
          const interval = setInterval(() => {
            count++;
            setVisibleSteps(count);
            if (count >= 4) clearInterval(interval);
          }, 1200);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    if (processRef.current) observer.observe(processRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="light">
      <Head>
        <title>GDG SKNCOE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        :root {
          --bg-primary: #ffffff;
          --bg-secondary: #f9fafb;
          --bg-card: #ffffff;
          --bg-grid: rgba(8, 75, 162, 0.12);
          --text-primary: #333333;
          --text-secondary: #4b5563;
          --border-color: #e5e7eb;
          --google-blue: #2563eb;
          --google-red: #ef4444;
          --google-green: #10b981;
          --google-yellow: #f59e0b;
          --navbar-bg: rgba(255, 255, 255, 0.95);
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: "Inter", sans-serif;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          background-image:
            linear-gradient(to right, var(--bg-grid) 1px, transparent 1px),
            linear-gradient(to bottom, var(--bg-grid) 1px, transparent 1px);
          background-size: 40px 40px;
          transition: background-color 0.3s ease;
          overflow-x: hidden;
        }

        /* --- Navbar Styles --- */
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 5%;
          background: var(--navbar-bg);
          backdrop-filter: blur(10px);
          position: fixed;
          top: 0;
          width: 100%;
          z-index: 2000;
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
        }

        .logo {
          display: flex;
          align-items: center;
          text-decoration: none;
          transition: transform 0.2s ease;
        }

        .logo:hover {
          transform: translateY(-2px);
        }

        /* Makes the dark JPEG look like a premium badge */
        .navbar-logo-img {
          height: 48px;
          width: auto;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        nav {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        nav a {
          text-decoration: none;
          color: var(--text-primary);
          font-weight: 600;
          transition: color 0.3s;
        }
        nav a:hover {
          color: var(--google-blue);
        }

        /* --- Hero Styles --- */
        .hero {
          display: flex;
          min-height: 100vh;
          padding: 8rem 6% 4rem;
          gap: 10rem;
          align-items: center;
        }
        .main-heading {
          font-family: "Poppins", sans-serif;
          font-size: 5rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
        }
        .text-blue { color: var(--google-blue); }
        .text-green { color: var(--google-green); }
        .text-red { color: var(--google-red); }

        .hero-description {
          font-size: 1.15rem;
          color: var(--text-secondary);
          margin-bottom: 2.5rem;
          max-width: 540px;
          line-height: 1.6;
        }
        .highlight-line {
          display: block;
          margin-top: 1rem;
          padding: 1rem;
          border-left: 4px solid var(--google-blue);
          background: rgba(37, 99, 235, 0.05);
          border-radius: 0 12px 12px 0;
        }

        .hero-btn {
          padding: 1rem 2.5rem;
          background: linear-gradient(135deg, var(--google-blue), #1e40af);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.3);
          display: inline-block;
          text-decoration: none;
        }
        .hero-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(37, 99, 235, 0.4);
        }

        /* --- Mockup Styles --- */
        .quiz-phone-mockup {
          width: 320px;
          height: 600px;
          background: #1f2937;
          border-radius: 35px;
          padding: 12px;
          position: relative;
          animation: float 6s ease-in-out infinite;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        .phone-screen {
          background: #ffffff;
          width: 100%;
          height: 100%;
          border-radius: 25px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .quiz-header {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 2rem 1.5rem;
          text-align: center;
          position: relative;
        }

        .score-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          opacity: 0;
          transition: 0.5s;
        }
        .score-badge.show {
          opacity: 1;
          transform: translateY(5px);
        }

        .quiz-option {
          margin: 10px 20px;
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          transition: 0.3s;
          color: #374151;
          font-weight: 500;
          font-size: 0.95rem;
        }
        .quiz-option.selected {
          border-color: #667eea;
          background: #f0f4ff;
        }
        .quiz-option.correct {
          border-color: var(--google-green);
          background: #d1fae5;
          transform: scale(1.05);
        }

        .celebration-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s;
          z-index: 50;
        }
        .celebration-overlay.active {
          opacity: 1;
        }

        .confetti-piece {
          position: absolute;
          width: 8px;
          height: 8px;
          top: 50%;
          left: 50%;
          opacity: 0;
          border-radius: 2px;
        }
        .celebration-overlay.active .confetti-piece {
          animation: burst 1s ease-out forwards;
        }

        @keyframes burst {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) rotate(var(--r));
          }
        }

        .trophy {
          font-size: 4rem;
          z-index: 60;
          transform: scale(0);
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .celebration-overlay.active .trophy {
          transform: scale(1);
          animation: trophy-bounce 1s infinite;
        }

        @keyframes trophy-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        /* --- Process Timeline Styles --- */
        .process-section-wrapper {
          padding: 6rem 5%;
          text-align: center;
        }
        .timeline {
          display: flex;
          justify-content: space-between;
          position: relative;
          margin-top: 4rem;
          gap: 1rem;
        }
        .timeline-line {
          position: absolute;
          top: 10px;
          width: 100%;
          height: 4px;
          background: var(--border-color);
          z-index: 0;
        }
        .timeline-progress {
          height: 100%;
          background: var(--google-blue);
          transition: width 1s ease;
        }

        .timeline-item {
          flex: 1;
          z-index: 1;
          opacity: 0;
          transform: translateY(20px);
          transition: 0.5s;
        }
        .timeline-item.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .timeline-node {
          width: 20px;
          height: 20px;
          background: var(--bg-card);
          border: 4px solid var(--google-blue);
          border-radius: 50%;
          margin: 0 auto 1.5rem;
          transition: all 0.3s ease;
        }
        .active-node {
          background: var(--google-blue);
          box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.2);
        }
        .process-card {
          background: var(--bg-card);
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          border-top: 4px solid var(--google-blue);
          width: 200px;
          margin: 0 auto;
        }

        /* --- Footer Styles --- */
        .footer {
          background-color: #4285f4;
          padding: 80px 5% 40px;
          border-top-left-radius: 80px;
          border-top-right-radius: 80px;
          color: white;
          font-family: "Poppins", sans-serif;
          margin-top: 4rem;
        }
        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr;
          align-items: center;
          gap: 2rem;
        }
        
        .footer-logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          /* Magic trick 2: Match the background of the JPEG so it blends invisibly */
          background: #000000; 
          padding: 12px;
          border-radius: 12px;
          width: fit-content;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .footer-logo-img {
          height: 55px;
          width: auto;
          object-fit: contain;
          border-radius: 4px; /* subtle inner radius */
        }

        .footer-center {
          text-align: center;
          font-family: "Inter", sans-serif;
        }
        .copyright {
          font-weight: 500;
          margin-bottom: 15px;
          opacity: 0.9;
        }
        .email-pill {
          background: rgba(255, 255, 255, 0.15);
          padding: 12px 24px;
          border-radius: 50px;
          color: white;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
          font-weight: 500;
        }
        .email-pill:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }

        .social-links {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
        }
        .social-links a {
          width: 45px;
          height: 45px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2rem;
          transition: all 0.3s ease;
        }
        .social-links a:hover {
          transform: translateY(-5px);
          background: white;
          color: #4285f4;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        /* --- Media Queries --- */
        @media (max-width: 1024px) {
          .hero {
            flex-direction: column;
            text-align: center;
            padding: 8rem 5% 4rem;
            gap: 4rem;
          }
          .hero-content {
            align-items: center;
            display: flex;
            flex-direction: column;
          }
          .main-heading { font-size: 3.5rem; }
          .quiz-phone-mockup {
            width: 280px;
            height: 520px;
          }
        }
        
        @media (max-width: 850px) {
          .timeline {
            flex-direction: column;
            align-items: center;
            gap: 2rem;
          }
          .timeline-line {
            left: 50%;
            top: 0;
            width: 4px;
            height: 100%;
            transform: translateX(-50%);
          }
          .timeline-progress {
            width: 100% !important;
            height: ${(visibleSteps / 4) * 100}%;
          }
        }
        
        @media (max-width: 768px) {
          .footer-container {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 2.5rem;
          }
          .footer-logo-container {
            margin: 0 auto;
          }
          .social-links {
            justify-content: center;
          }
          .footer {
            border-top-left-radius: 40px;
            border-top-right-radius: 40px;
            padding: 60px 5% 30px;
          }
          .navbar { padding: 1rem 4%; }
        }
        
        @media (max-width: 480px) {
          .main-heading { font-size: 2.5rem; }
          .hero-btn {
            width: 100%;
            padding: 1rem;
            text-align: center;
          }
        }
      `}</style>

      <div className="app-container">
        <header className="navbar">
          {/* Changed: Removed the redundant "GDG SKNCOE" text because your logo banner already says it! */}
          <Link href="/" className="logo">
            <img 
              src="/assests/logo1.jpeg" 
              alt="GDG Logo Banner" 
              className="navbar-logo-img"
            />
          </Link>
          
          <nav>
            <div className="header-socials-wrapper hidden md:block">
              <div
                className="social-links"
                style={{ justifyContent: "center", gap: "10px" }}>
                <a
                  href="https://www.instagram.com/gdg_skncoe?igsh=MWNrcmlha2NzejJmag=="
                  aria-label="Instagram">
                  <FaInstagram size={18} />
                </a>
                <a
                  href="https://www.linkedin.com/company/gdgoncampus/"
                  aria-label="LinkedIn">
                  <FaLinkedin size={18} />
                </a>
              </div>
            </div>
            <Link
              href="/admin"
              className="text-sm font-semibold text-gray-600 hover:text-blue-600"
              style={{ textDecoration: "none" }}>
              Admin Portal
            </Link>
          </nav>
        </header>

        <main>
          <section className="hero" id="home">
            <div className="hero-content">
              <h1 className="main-heading">
                <span className="text-blue">Play.</span>{" "}
                <span className="text-green">Learn.</span>{" "}
                <span className="text-red">Compete.</span>
              </h1>
              <p className="hero-description">
                Participate in <strong>quizzes</strong> and{" "}
                <strong>exciting mini-competitions</strong> after the event.
                <span className="highlight-line">
                  Test your knowledge, engage with peers, and make the
                  experience unforgettable.
                </span>
              </p>
              
              <a 
                href="https://gdg.community.dev/gdg-on-campus-shrimati-kashibai-navale-college-of-engineering-pune-india/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hero-btn"
              >
                Join Community
              </a>
            </div>

            <div className="hero-right">
              <div className="quiz-phone-mockup">
                <div className="phone-screen">
                  <div className="quiz-header">
                    <div
                      className={`score-badge ${quizState >= 3 ? "show" : ""}`}>
                      🎯 Score: 100
                    </div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.8, fontFamily: "Inter" }}>
                      Question 1 of 5
                    </div>
                    <div style={{ fontWeight: 700, marginTop: "10px", fontFamily: "Inter" }}>
                      What does GDG stand for?
                    </div>
                  </div>
                  <div style={{ padding: "20px 0", fontFamily: "Inter" }}>
                    {[
                      "Google Developer Group",
                      "Global Design Guild",
                      "Game Dev Group",
                      "General Data Gateway",
                    ].map((opt, i) => (
                      <div
                        key={opt}
                        className={`quiz-option 
                          ${i === 0 && quizState === 1 ? "selected" : ""} 
                          ${i === 0 && quizState >= 2 ? "correct" : ""}
                        `}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    ))}
                  </div>
                  <div
                    className={`celebration-overlay ${quizState === 4 ? "active" : ""}`}>
                    <span className="trophy">🏆</span>
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="confetti-piece"
                        style={{
                          "--x": `${(Math.random() - 0.5) * 200}px`,
                          "--y": `${(Math.random() - 0.5) * 200}px`,
                          "--r": `${Math.random() * 360}deg`,
                          backgroundColor: [
                            "#4285F4",
                            "#EA4335",
                            "#FBBC05",
                            "#34A853",
                          ][i % 4],
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="process-section-wrapper" ref={processRef}>
            <h2 style={{ fontSize: "2.5rem", marginBottom: "2rem", fontFamily: "Poppins" }}>
              How it Works
            </h2>
            <div className="timeline">
              <div className="timeline-line">
                <div
                  className="timeline-progress"
                  style={{ width: `${(visibleSteps / 4) * 100}%` }}></div>
              </div>

              {["Join Event", "Think & Answer", "Compete", "Win Rewards"].map(
                (step, i) => (
                  <div
                    key={step}
                    className={`timeline-item ${visibleSteps > i ? "visible" : ""}`}>
                    <div
                      className={`timeline-node ${visibleSteps > i ? "active-node" : ""}`}></div>
                    <div className="process-card">
                      <div
                        style={{
                          color: "var(--google-blue)",
                          fontWeight: 800,
                          fontFamily: "Poppins",
                          fontSize: "1.2rem",
                          marginBottom: "0.5rem"
                        }}>
                        0{i + 1}
                      </div>
                      <h3 style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>{step}</h3>
                    </div>
                  </div>
                ),
              )}
            </div>

            <Link href="/user" style={{ textDecoration: "none" }}>
              <button
                className="hero-btn"
                style={{
                  marginTop: "4rem",
                  padding: "1.2rem 3rem",
                  fontSize: "1.1rem",
                }}>
                Join Room Now
              </button>
            </Link>
          </section>
        </main>

        <footer className="footer">
          <div className="footer-container">
            <div className="footer-section footer-brand">
              {/* Changed: Removed redundant HTML text and changed container to black */}
              <div className="footer-logo-container">
                <img
                  src="/assests/logo1.jpeg"
                  alt="GDG Logo Banner"
                  className="footer-logo-img"
                />
              </div>
            </div>

            <div className="footer-section footer-center">
              <p className="copyright">© 2024 All Rights Reserved</p>
              <a href="mailto:contact@gdgskncoe.com" className="email-pill">
                <FaEnvelope /> contact@gdgskncoe.com
              </a>
            </div>

            <div className="footer-section footer-socials-wrapper">
              <div className="social-links">
                <a
                  href="https://www.instagram.com/gdg_skncoe?igsh=MWNrcmlha2NzejJmag=="
                  aria-label="Instagram">
                  <FaInstagram size={20} />
                </a>
                <a
                  href="https://www.linkedin.com/company/gdgoncampus/"
                  aria-label="LinkedIn">
                  <FaLinkedin size={20} />
                </a>
                <a href="#" aria-label="GitHub">
                  <FaGithub size={20} />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}