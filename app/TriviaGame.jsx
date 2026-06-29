"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Lock, ChevronRight, RotateCcw, Trophy, Copy, Check, Flame, Timer } from "lucide-react";

const MAX_CLUES = 5;
const POINTS_BY_CLUE = [100, 80, 60, 40, 20];
const SECONDS_PER_CLUE = 90;
const STREAK_KEY = "lsuTriviaStreak"; // { streak, lastResult, lastDate }

function dayBefore(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z]/g, "");
}

function formatShareDate(dateStr) {
  // dateStr is "YYYY-MM-DD" — build it manually to avoid timezone shifting the day.
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}`;
}

export default function TriviaGame({ puzzle }) {
  const [clueIndex, setClueIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [status, setStatus] = useState("playing");
  const [history, setHistory] = useState([]); // wrong guesses, one per clue revealed
  const [copied, setCopied] = useState(false);
  const [streak, setStreak] = useState(null); // null until loaded from localStorage
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_CLUE);
  const timerRef = useRef(null);

  // Load streak on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      setStreak(raw ? JSON.parse(raw) : { streak: 0, lastResult: null, lastDate: null });
    } catch {
      setStreak({ streak: 0, lastResult: null, lastDate: null });
    }
  }, []);

  // Record today's result into the streak exactly once, the first time this
  // puzzle's round ends (not on replays).
  useEffect(() => {
    if (status === "playing" || streak === null) return;
    if (streak.lastDate === puzzle.date) return; // already recorded today

    let nextStreak;
    if (status === "won") {
      nextStreak = streak.lastDate === dayBefore(puzzle.date) && streak.lastResult === "won"
        ? streak.streak + 1
        : 1;
    } else {
      nextStreak = 0;
    }
    const next = { streak: nextStreak, lastResult: status, lastDate: puzzle.date };
    setStreak(next);
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable (private browsing, etc) — streak just won't persist.
    }
  }, [status, streak, puzzle.date]);

  // 90-second countdown per clue. Resets whenever a new clue is revealed.
  useEffect(() => {
    if (status !== "playing") {
      clearInterval(timerRef.current);
      return;
    }
    setSecondsLeft(SECONDS_PER_CLUE);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clueIndex, status]);

  const cluesUsed = clueIndex + 1;
  // Once the round ends, show every clue (even ones never needed) so people
  // can see how the puzzle built up. While playing, only show what's revealed.
  const revealedClues =
    status === "playing" ? puzzle.clues.slice(0, clueIndex + 1) : puzzle.clues;

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

  function handleTimeout() {
    setHistory((h) => [...h, "⏰ timed out"]);
    setClueIndex((i) => {
      if (i + 1 >= MAX_CLUES) {
        setStatus("lost");
        return i;
      }
      return i + 1;
    });
  }

  function giveUp() {
    setHistory((h) => [...h, ...Array(MAX_CLUES - h.length).fill("—")]);
    setStatus("lost");
  }

  function playAgain() {
    setClueIndex(0);
    setGuess("");
    setStatus("playing");
    setHistory([]);
    setCopied(false);
  }

  const resultSquares = useMemo(() => {
    return Array.from({ length: MAX_CLUES }, (_, i) =>
      i < cluesUsed ? (status === "won" && i === cluesUsed - 1 ? "win" : "used") : "unused"
    );
  }, [cluesUsed, status]);

  const score = status === "won" ? POINTS_BY_CLUE[cluesUsed - 1] : 0;

  // Build the shareable emoji line: X for each wrong guess, tiger for the win,
  // and blank squares for clues never reached.
  const shareEmoji = useMemo(() => {
    return Array.from({ length: MAX_CLUES }, (_, i) => {
      if (status === "won" && i === cluesUsed - 1) return "🐯";
      if (i < history.length) return "❌";
      return "⬜";
    }).join("");
  }, [status, cluesUsed, history]);

  const shareText = useMemo(() => {
    const dateLabel = formatShareDate(puzzle.date);
    const resultLine =
      status === "won"
        ? `Solved in ${cluesUsed}/5 · ${score} pts`
        : `Stumped today · 0 pts`;
    return `LSU Daily Trivia · ${dateLabel}\n${shareEmoji}\n${resultLine}\nlsutrivia.com`;
  }, [puzzle.date, status, cluesUsed, score, shareEmoji]);

  async function copyResults() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — fail silently, button just won't confirm.
    }
  }

  return (
    <main
      style={{
        background: "#F4EFE3",
        minHeight: "100vh",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#241433",
        padding: "26px 16px 40px",
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
        a.footer-link { color: #461D7C; font-weight: 700; text-decoration: underline; }
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 2, opacity: 0.85 }}>
              LSU TIGER TRIVIA · {puzzle.date}
            </div>
            {streak !== null && streak.streak > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(253,208,35,0.15)",
                  borderRadius: 14,
                  padding: "3px 9px",
                }}
              >
                <Flame size={13} color="#FDD023" />
                <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                  {streak.streak}
                </span>
              </div>
            )}
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
          {status === "playing" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
                color: secondsLeft <= 15 ? "#C23B3B" : "#241433",
                fontSize: 13,
              }}
            >
              <Timer size={14} />
              <span className="mono" style={{ fontWeight: 700 }}>
                {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
                {String(secondsLeft % 60).padStart(2, "0")}
              </span>
              <span style={{ color: "#9A8E70", fontWeight: 400 }}>left on this clue</span>
            </div>
          )}

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
            {revealedClues.map((c, i) => {
              const neverReached = status !== "playing" && i >= cluesUsed;
              return (
                <div
                  key={i}
                  className="clue-row"
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    background: neverReached ? "#FBF8F1" : "#F4EFE3",
                    borderRadius: 8,
                    padding: "10px 12px",
                    opacity: neverReached ? 0.65 : 1,
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      background:
                        i === cluesUsed - 1 && status === "won" ? "#FDD023" : "#461D7C",
                      color: i === cluesUsed - 1 && status === "won" ? "#241433" : "#FDD023",
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
              );
            })}
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

              {puzzle.funFacts && puzzle.funFacts.length > 0 && (
                <div
                  style={{
                    marginTop: 14,
                    textAlign: "left",
                    background: "#F4EFE3",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    className="mono"
                    style={{ fontSize: 10.5, letterSpacing: 1, color: "#9A8E70", marginBottom: 4 }}
                  >
                    FUN FACT{puzzle.funFacts.length > 1 ? "S" : ""}
                  </div>
                  {puzzle.funFacts.map((f, i) => (
                    <div key={i} style={{ fontSize: 13.5, lineHeight: 1.45, marginBottom: 2 }}>
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {streak !== null && streak.lastDate === puzzle.date && (
                <div
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12.5,
                    color: "#5B4A78",
                  }}
                >
                  <Flame size={14} color={streak.streak > 0 ? "#E8A300" : "#9A8E70"} />
                  {streak.streak > 0
                    ? `${streak.streak} day streak`
                    : "Streak reset — get it tomorrow"}
                </div>
              )}

              {/* Share results */}
              <div
                style={{
                  marginTop: 16,
                  background: "#241433",
                  borderRadius: 10,
                  padding: "14px 16px",
                  textAlign: "left",
                }}
              >
                <div className="mono" style={{ fontSize: 12, lineHeight: 1.5, color: "#FDD023" }}>
                  LSU Daily Trivia · {formatShareDate(puzzle.date)}
                </div>
                <div style={{ fontSize: 22, letterSpacing: 3, margin: "4px 0" }}>
                  {shareEmoji}
                </div>
                <div style={{ fontSize: 13, color: "#E8DCF5" }}>
                  {status === "won"
                    ? `Solved in ${cluesUsed}/5 · ${score} pts`
                    : "Stumped today · 0 pts"}
                </div>
                <button
                  onClick={copyResults}
                  className="btn-main"
                  style={{
                    marginTop: 10,
                    background: copied ? "#3D8B5F" : "#FDD023",
                    color: copied ? "#fff" : "#241433",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy results"}
                </button>
              </div>

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

        <footer style={{ textAlign: "center", marginTop: 22 }}>
          <img
            src="/power-hour-lsu-logo.png"
            alt="Power Hour LSU"
            style={{ width: 78, height: 78, margin: "0 auto 6px", display: "block" }}
          />
          <div style={{ fontSize: 13, color: "#5B4A78" }}>
            A{" "}
            <a
              className="footer-link"
              href="https://www.youtube.com/@powerhourlsu"
              target="_blank"
              rel="noopener noreferrer"
            >
              Power Hour LSU
            </a>{" "}
            production.
          </div>
          <div style={{ fontSize: 11, color: "#9A8E70", marginTop: 8, lineHeight: 1.5 }}>
            Unofficial fan trivia game. Not affiliated with or endorsed by LSU
            or the LSU Athletic Department.
          </div>
        </footer>
      </div>
    </main>
  );
}
