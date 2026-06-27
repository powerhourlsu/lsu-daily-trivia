"use client";

import { useState, useMemo } from "react";
import { Lock, ChevronRight, RotateCcw, Trophy } from "lucide-react";

const MAX_CLUES = 5;
const POINTS_BY_CLUE = [100, 80, 60, 40, 20];

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z]/g, "");
}

export default function TriviaGame({ puzzle }) {
  const [clueIndex, setClueIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [status, setStatus] = useState("playing");
  const [history, setHistory] = useState([]);

  const revealedClues = puzzle.clues.slice(0, clueIndex + 1);
  const cluesUsed = clueIndex + 1;

  function submitGuess(e) {
    e.preventDefault();
    if (status !== "playing" || !guess.trim()) return;

    if (normalize(guess) === normalize(puzzle.answer)) {
      setStatus("won");
    } else {
      setHistory((h) => [...h, guess.trim()]);
      if (cluesUsed >= MAX_CLUES) {
        setStatus("lost");
      } else {
        setClueIndex((i) => i + 1);
      }
    }
    setGuess("");
  }

  function giveUp() {
    setStatus("lost");
  }

  function playAgain() {
    setClueIndex(0);
    setGuess("");
    setStatus("playing");
    setHistory([]);
  }

  const resultSquares = useMemo(() => {
    return Array.from({ length: MAX_CLUES }, (_, i) =>
      i < cluesUsed ? (status === "won" && i === cluesUsed - 1 ? "win" : "used") : "unused"
    );
  }, [cluesUsed, status]);

  const score = status === "won" ? POINTS_BY_CLUE[cluesUsed - 1] : 0;

  return (
    <main
      style={{
        background: "#F4EFE3",
        minHeight: "100vh",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#241433",
        padding: "26px 16px 48px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        .pf { font-family: 'Playfair Display', serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .clue-row { animation: slideIn .25s ease both; }
        @keyframes slideIn { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }
        .guess-input:focus { outline: 3px solid #461D7C; outline-offset: 1px; }
        .btn-main { transition: transform .12s ease; }
        .btn-main:hover { transform: translateY(-1px); }
        .btn-main:active { transform: translateY(0); }
      `}</style>

      <div style={{ width: "100%", maxWidth: 480 }}>
        <div
          style={{
            background: "#461D7C",
            borderRadius: "14px 14px 0 0",
            padding: "18px 20px 22px",
            color: "#FDD023",
          }}
        >
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2, opacity: 0.85 }}>
            DAILY · {puzzle.date}
          </div>
          <h1 className="pf" style={{ fontSize: 28, margin: "4px 0 0", color: "#FDD023" }}>
            Who Am I?
          </h1>
          <div style={{ fontSize: 13, color: "#E8DCF5", marginTop: 2 }}>
            5 clues. Fewer clues, higher score.
          </div>
        </div>

        <div
          style={{
            height: 0,
            borderTop: "2px dashed #C9BFA8",
            background: "#F4EFE3",
            position: "relative",
          }}
        >
          {[...Array(14)].map((_, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                top: -7,
                left: `${(i / 13) * 100}%`,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#F4EFE3",
              }}
            />
          ))}
        </div>

        <div
          style={{
            background: "#FFFDF8",
            border: "1px solid #E3DBC8",
            borderTop: "none",
            borderRadius: "0 0 14px 14px",
            padding: "20px 20px 24px",
            boxShadow: "0 6px 18px rgba(70,29,124,0.08)",
          }}
        >
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {resultSquares.map((s, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  background: s === "win" ? "#FDD023" : s === "used" ? "#461D7C" : "#E3DBC8",
                }}
              />
            ))}
          </div>

          <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
            {revealedClues.map((c, i) => (
              <div
                key={i}
                className="clue-row"
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  background: "#F4EFE3",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <span
                  className="mono"
                  style={{
                    background: "#461D7C",
                    color: "#FDD023",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    minWidth: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 14.5, lineHeight: 1.4, paddingTop: 1 }}>{c}</span>
              </div>
            ))}
          </div>

          {history.length > 0 && status === "playing" && (
            <div style={{ marginBottom: 14, fontSize: 12.5, color: "#9A8E70" }}>
              Already tried: {history.join(", ")}
            </div>
          )}

          {status === "playing" ? (
            <form onSubmit={submitGuess} style={{ display: "flex", gap: 8 }}>
              <input
                className="guess-input"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Type your guess..."
                style={{
                  flex: 1,
                  border: "1.5px solid #D8CBB0",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 14.5,
                  background: "#FFFDF8",
                  color: "#241433",
                }}
                aria-label="Your guess"
              />
              <button
                type="submit"
                className="btn-main"
                style={{
                  background: "#FDD023",
                  color: "#241433",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Guess <ChevronRight size={16} />
              </button>
            </form>
          ) : (
            <div style={{ textAlign: "center", padding: "10px 4px 2px" }}>
              {status === "won" ? (
                <>
                  <Trophy size={28} color="#FDD023" style={{ marginBottom: 6 }} />
                  <div className="pf" style={{ fontSize: 22, color: "#461D7C" }}>
                    {puzzle.answer}
                  </div>
                  <div style={{ fontSize: 13.5, color: "#5B4A78", marginTop: 4 }}>
                    Solved in {cluesUsed} clue{cluesUsed > 1 ? "s" : ""} ·{" "}
                    <span style={{ fontWeight: 700 }}>{score} pts</span>
                  </div>
                </>
              ) : (
                <>
                  <Lock size={26} color="#9A8E70" style={{ marginBottom: 6 }} />
                  <div className="pf" style={{ fontSize: 20, color: "#461D7C" }}>
                    {puzzle.answer}
                  </div>
                  <div style={{ fontSize: 13.5, color: "#9A8E70", marginTop: 4 }}>
                    Out of clues — better luck tomorrow.
                  </div>
                </>
              )}

              {puzzle.isRival && (
                <div
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    fontSize: 11.5,
                    background: "#EFE4F7",
                    color: "#461D7C",
                    borderRadius: 12,
                    padding: "3px 10px",
                    fontWeight: 600,
                  }}
                >
                  vs. LSU player
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                <button
                  onClick={playAgain}
                  className="btn-main"
                  style={{
                    background: "transparent",
                    border: "1.5px solid #461D7C",
                    color: "#461D7C",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 13.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <RotateCcw size={14} /> Replay today's puzzle
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#9A8E70", marginTop: 10 }}>
                Come back tomorrow for a new player.
              </div>
            </div>
          )}

          {status === "playing" && (
            <button
              onClick={giveUp}
              style={{
                marginTop: 10,
                background: "transparent",
                border: "none",
                color: "#9A8E70",
                fontSize: 12.5,
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Give up & reveal answer
            </button>
          )}
        </div>

        <footer
          style={{
            textAlign: "center",
            fontSize: 11.5,
            color: "#9A8E70",
            marginTop: 18,
            lineHeight: 1.5,
          }}
        >
          Unofficial fan trivia game. Not affiliated with or endorsed by LSU
          or the LSU Athletic Department.
        </footer>
      </div>
    </main>
  );
}
