"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Lock, ChevronRight, RotateCcw, Trophy, Check, Flame, Share2, HelpCircle, X } from "lucide-react";

const MAX_CLUES = 5;
const POINTS_BY_CLUE = [100, 80, 60, 40, 20];
const STREAK_KEY = "lsuTriviaStreak";

function dayBefore(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z]/g, "");
}

function isCorrectGuess(guess, answer) {
  const g = normalize(guess);
  if (!g) return false;
  if (g === normalize(answer)) return true;
  const parts = answer.split(" ").filter(p => !/^(jr\.?|sr\.?|i{1,3}|iv)$/i.test(p.trim()));
  return g === normalize(parts[parts.length - 1]);
}

// Format date as "JULY 13, 2026"
function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  return `${months[m - 1]} ${d}, ${y}`;
}

function formatShareDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}`;
}

export default function TriviaGame({ puzzle }) {
  const [clueIndex, setClueIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [status, setStatus] = useState("playing");
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [streak, setStreak] = useState(null);
  const [showHow, setShowHow] = useState(false);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);

  const cluesUsed = clueIndex + 1;
  const revealedClues = status === "playing" ? puzzle.clues.slice(0, clueIndex + 1) : puzzle.clues;

  // Load streak
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      setStreak(raw ? JSON.parse(raw) : { streak: 0, lastResult: null, lastDate: null });
    } catch {
      setStreak({ streak: 0, lastResult: null, lastDate: null });
    }
  }, []);

  // Save streak once per day on round end
  useEffect(() => {
    if (status === "playing" || streak === null) return;
    if (streak.lastDate === puzzle.date) return;
    let nextStreak;
    if (status === "won") {
      nextStreak = streak.lastDate === dayBefore(puzzle.date) && streak.lastResult === "won"
        ? streak.streak + 1 : 1;
    } else {
      nextStreak = 0;
    }
    const next = { streak: nextStreak, lastResult: status, lastDate: puzzle.date };
    setStreak(next);
    try { localStorage.setItem(STREAK_KEY, JSON.stringify(next)); } catch {}
  }, [status, streak, puzzle.date]);

  function submitGuess(e) {
    e.preventDefault();
    if (status !== "playing" || !guess.trim()) return;
    if (isCorrectGuess(guess, puzzle.answer)) {
      setStatus("won");
    } else {
      const newHistory = [...history, guess.trim()];
      setHistory(newHistory);
      if (cluesUsed >= MAX_CLUES) {
        setStatus("lost");
      } else {
        setClueIndex(i => i + 1);
      }
    }
    setGuess("");
    setShowGiveUpConfirm(false);
  }

  function confirmGiveUp() {
    setStatus("lost");
    setShowGiveUpConfirm(false);
  }

  function playAgain() {
    setClueIndex(0); setGuess(""); setStatus("playing");
    setHistory([]); setCopied(false); setShowGiveUpConfirm(false);
  }

  const resultSquares = useMemo(() =>
    Array.from({ length: MAX_CLUES }, (_, i) =>
      i < cluesUsed ? (status === "won" && i === cluesUsed - 1 ? "win" : "used") : "unused"
    ), [cluesUsed, status]);

  const score = status === "won" ? POINTS_BY_CLUE[cluesUsed - 1] : 0;

  const shareEmoji = useMemo(() =>
    Array.from({ length: MAX_CLUES }, (_, i) => {
      if (status === "won" && i === cluesUsed - 1) return "🐯";
      if (i < history.length) return "❌";
      return "⬜";
    }).join(""), [status, cluesUsed, history]);

  const shareText = useMemo(() => {
    const dateLabel = formatShareDate(puzzle.date);
    const resultLine = status === "won"
      ? `Solved in ${cluesUsed}/5 · ${score} pts`
      : "Stumped today · 0 pts";
    return `LSU Tiger Trivia · ${dateLabel}\n${shareEmoji}\n${resultLine}\nlsutrivia.com`;
  }, [puzzle.date, status, cluesUsed, score, shareEmoji]);

  async function shareResults() {
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <main style={{ background: "#F4EFE3", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: "#241433", padding: "26px 16px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
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
        .modal-overlay { position: fixed; inset: 0; background: rgba(10,5,20,0.65); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
        .modal-box { background: #FFFDF8; border-radius: 14px; padding: 24px 22px; max-width: 380px; width: 100%; position: relative; }
        /* MailerLite embed overrides */
        .ml-form-embedWrapper { background: transparent !important; }
        .ml-form-embedBody { padding: 0 !important; }
      `}</style>

      {/* How to play modal */}
      {showHow && (
        <div className="modal-overlay" onClick={() => setShowHow(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHow(false)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", cursor: "pointer", color: "#9A8E70" }}>
              <X size={18} />
            </button>
            <h2 className="pf" style={{ color: "#461D7C", fontSize: 20, margin: "0 0 14px" }}>How to Play</h2>
            <div style={{ display: "grid", gap: 10, fontSize: 14, lineHeight: 1.5, color: "#3A2A5A" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🏈</span>
                <span>A new LSU football player (or rival) is revealed every day.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🔍</span>
                <span>You get <strong>5 clues</strong>, revealed one at a time. Clue 1 is the hardest, clue 5 is the easiest.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <span>Each wrong guess reveals the next clue. <strong>Fewer clues used = higher score.</strong></span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <span>You can type the player's <strong>first and last name, or just their last name</strong> — both count.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🔥</span>
                <span>Solve daily to build your streak. Miss a day and it resets.</span>
              </div>
            </div>
            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button onClick={() => setShowHow(false)} className="btn-main" style={{ background: "#461D7C", color: "#FDD023", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Let's play!
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Header */}
        <div style={{ background: "#461D7C", borderRadius: "14px 14px 0 0", padding: "18px 20px 22px", color: "#FDD023" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, opacity: 0.85 }}>
              LSU TIGER TRIVIA · {formatDisplayDate(puzzle.date)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {streak !== null && streak.streak > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(253,208,35,0.15)", borderRadius: 14, padding: "3px 9px" }}>
                  <Flame size={13} color="#FDD023" />
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{streak.streak}</span>
                </div>
              )}
              <button onClick={() => setShowHow(true)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#FDD023" }} aria-label="How to play">
                <HelpCircle size={16} />
              </button>
            </div>
          </div>
          <h1 className="pf" style={{ fontSize: 28, margin: "6px 0 0", color: "#FDD023" }}>Who Am I?</h1>
          <div style={{ fontSize: 13, color: "#E8DCF5", marginTop: 2 }}>Each wrong guess reveals your next clue.</div>
        </div>

        {/* Perforation */}
        <div style={{ height: 0, borderTop: "2px dashed #C9BFA8", position: "relative" }}>
          {[...Array(14)].map((_, i) => (
            <span key={i} style={{ position: "absolute", top: -7, left: `${(i / 13) * 100}%`, width: 14, height: 14, borderRadius: "50%", background: "#F4EFE3" }} />
          ))}
        </div>

        {/* Card body */}
        <div style={{ background: "#FFFDF8", border: "1px solid #E3DBC8", borderTop: "none", borderRadius: "0 0 14px 14px", padding: "20px 20px 24px", boxShadow: "0 6px 18px rgba(70,29,124,0.08)" }}>

          {/* Progress bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {resultSquares.map((s, i) => (
              <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: s === "win" ? "#FDD023" : s === "used" ? "#461D7C" : "#E3DBC8", transition: "background .2s" }} />
            ))}
          </div>

          {/* Clues */}
          <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
            {revealedClues.map((c, i) => {
              const neverReached = status !== "playing" && i >= cluesUsed;
              return (
                <div key={i} className="clue-row" style={{ display: "flex", gap: 10, alignItems: "flex-start", background: neverReached ? "#FBF8F1" : "#F4EFE3", borderRadius: 8, padding: "10px 12px", opacity: neverReached ? 0.65 : 1 }}>
                  <span className="mono" style={{ background: i === cluesUsed - 1 && status === "won" ? "#FDD023" : "#461D7C", color: i === cluesUsed - 1 && status === "won" ? "#241433" : "#FDD023", borderRadius: "50%", width: 22, height: 22, minWidth: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 14.5, lineHeight: 1.4, paddingTop: 1 }}>{c}</span>
                </div>
              );
            })}
          </div>

          {/* Wrong guesses while playing */}
          {history.length > 0 && status === "playing" && (
            <div style={{ marginBottom: 14, fontSize: 12.5, color: "#9A8E70" }}>
              Already tried: {history.join(", ")}
            </div>
          )}

          {/* Input or result */}
          {status === "playing" ? (
            <>
              <form onSubmit={submitGuess} style={{ display: "flex", gap: 8 }}>
                <input
                  className="guess-input"
                  value={guess}
                  onChange={e => setGuess(e.target.value)}
                  placeholder="Type your guess..."
                  style={{ flex: 1, border: "1.5px solid #D8CBB0", borderRadius: 8, padding: "10px 12px", fontSize: 14.5, background: "#FFFDF8", color: "#241433" }}
                  aria-label="Your guess"
                />
                <button type="submit" className="btn-main" style={{ background: "#FDD023", color: "#241433", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  Guess <ChevronRight size={16} />
                </button>
              </form>

              {/* Give up — requires two taps */}
              <div style={{ marginTop: 14, borderTop: "1px solid #EDE8DC", paddingTop: 12 }}>
                {!showGiveUpConfirm ? (
                  <button
                    onClick={() => setShowGiveUpConfirm(true)}
                    style={{ background: "transparent", border: "none", color: "#C9BFA8", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0 }}
                  >
                    I give up — reveal the answer
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12.5, color: "#9A8E70" }}>Are you sure?</span>
                    <button onClick={confirmGiveUp} style={{ background: "#E8D0D0", color: "#8B2020", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                      Yes, reveal it
                    </button>
                    <button onClick={() => setShowGiveUpConfirm(false)} style={{ background: "transparent", border: "none", color: "#9A8E70", fontSize: 12.5, cursor: "pointer", textDecoration: "underline" }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "10px 4px 2px" }}>
              {status === "won" ? (
                <>
                  <Trophy size={28} color="#FDD023" style={{ marginBottom: 6 }} />
                  <div className="pf" style={{ fontSize: 22, color: "#461D7C" }}>{puzzle.answer}</div>
                  <div style={{ fontSize: 13.5, color: "#5B4A78", marginTop: 4 }}>
                    Solved in {cluesUsed} clue{cluesUsed > 1 ? "s" : ""} · <span style={{ fontWeight: 700 }}>{score} pts</span>
                  </div>
                </>
              ) : (
                <>
                  <Lock size={26} color="#9A8E70" style={{ marginBottom: 6 }} />
                  <div className="pf" style={{ fontSize: 20, color: "#461D7C" }}>{puzzle.answer}</div>
                  <div style={{ fontSize: 13.5, color: "#9A8E70", marginTop: 4 }}>Out of clues — better luck tomorrow.</div>
                </>
              )}

              {puzzle.isRival && (
                <div style={{ display: "inline-block", marginTop: 10, fontSize: 11.5, background: "#EFE4F7", color: "#461D7C", borderRadius: 12, padding: "3px 10px", fontWeight: 600 }}>
                  vs. LSU player
                </div>
              )}

              {/* Streak badge */}
              {streak !== null && streak.lastDate === puzzle.date && (
                <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#5B4A78" }}>
                  <Flame size={14} color={streak.streak > 0 ? "#E8A300" : "#9A8E70"} />
                  {streak.streak > 0 ? `${streak.streak} day streak 🔥` : "Streak reset — get it tomorrow"}
                </div>
              )}

              {/* Fun facts */}
              {puzzle.funFacts && puzzle.funFacts.length > 0 && (
                <div style={{ marginTop: 14, textAlign: "left", background: "#F4EFE3", borderRadius: 8, padding: "10px 12px" }}>
                  <div className="mono" style={{ fontSize: 10.5, letterSpacing: 1, color: "#9A8E70", marginBottom: 6 }}>
                    FUN FACT{puzzle.funFacts.length > 1 ? "S" : ""}
                  </div>
                  {puzzle.funFacts.map((f, i) => (
                    <div key={i} style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: i < puzzle.funFacts.length - 1 ? 6 : 0, display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 16, lineHeight: 1.3, flexShrink: 0 }}>🏈</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Share card */}
              <div style={{ marginTop: 16, background: "#241433", borderRadius: 10, padding: "14px 16px", textAlign: "left" }}>
                <div className="mono" style={{ fontSize: 12, lineHeight: 1.5, color: "#FDD023" }}>
                  LSU Tiger Trivia · {formatShareDate(puzzle.date)}
                </div>
                <div style={{ fontSize: 22, letterSpacing: 3, margin: "4px 0" }}>{shareEmoji}</div>
                <div style={{ fontSize: 13, color: "#E8DCF5" }}>
                  {status === "won" ? `Solved in ${cluesUsed}/5 · ${score} pts` : "Stumped today · 0 pts"}
                </div>
                <button onClick={shareResults} className="btn-main" style={{ marginTop: 10, background: copied ? "#3D8B5F" : "#FDD023", color: copied ? "#fff" : "#241433", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {copied ? <Check size={14} /> : <Share2 size={14} />}
                  {copied ? "Copied to clipboard!" : "Share my results"}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                <button onClick={playAgain} className="btn-main" style={{ background: "transparent", border: "1.5px solid #461D7C", color: "#461D7C", borderRadius: 8, padding: "8px 14px", fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <RotateCcw size={14} /> Replay today's puzzle
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#9A8E70", marginTop: 10 }}>Come back tomorrow for a new player.</div>
            </div>
          )}
        </div>

       {/* MailerLite email signup — only shown after round ends */}
{status !== "playing" && <div style={{ marginTop: 20, background: "#461D7C", borderRadius: 14, padding: "20px 20px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#FDD023", fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
            🏈 Get the daily puzzle in your inbox
          </div>
          <div style={{ fontSize: 12, color: "#C9B8E8", marginBottom: 14 }}>
            Never miss a day!
          </div>

          {/*
            ==========================================
           <style type="text/css">@import url("https://assets.mlcdn.com/fonts.css?version=1783523");</style>
    <style type="text/css">
    /* LOADER */
    .ml-form-embedSubmitLoad {
      display: inline-block;
      width: 20px;
      height: 20px;
    }

    .g-recaptcha {
    transform: scale(1);
    -webkit-transform: scale(1);
    transform-origin: 0 0;
    -webkit-transform-origin: 0 0;
    height: ;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      border: 0;
    }

    .ml-form-embedSubmitLoad:after {
      content: " ";
      display: block;
      width: 11px;
      height: 11px;
      margin: 1px;
      border-radius: 50%;
      border: 4px solid #fff;
    border-color: #ffffff #ffffff #ffffff transparent;
    animation: ml-form-embedSubmitLoad 1.2s linear infinite;
    }
    @keyframes ml-form-embedSubmitLoad {
      0% {
      transform: rotate(0deg);
      }
      100% {
      transform: rotate(360deg);
      }
    }
      #mlb2-43671474.ml-form-embedContainer {
        box-sizing: border-box;
        display: table;
        margin: 0 auto;
        position: static;
        width: 100% !important;
      }
      #mlb2-43671474.ml-form-embedContainer h4,
      #mlb2-43671474.ml-form-embedContainer p,
      #mlb2-43671474.ml-form-embedContainer span,
      #mlb2-43671474.ml-form-embedContainer button {
        text-transform: none !important;
        letter-spacing: normal !important;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper {
        background-color: #f6f6f6;
        
        border-width: 0px;
        border-color: transparent;
        border-radius: 4px;
        border-style: solid;
        box-sizing: border-box;
        display: inline-block !important;
        margin: 0;
        padding: 0;
        position: relative;
              }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper.embedPopup,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper.embedDefault { width: 400px; }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper.embedForm { max-width: 400px; width: 100%; }
      #mlb2-43671474.ml-form-embedContainer .ml-form-align-left { text-align: left; }
      #mlb2-43671474.ml-form-embedContainer .ml-form-align-center { text-align: center; }
      #mlb2-43671474.ml-form-embedContainer .ml-form-align-default { display: table-cell !important; vertical-align: middle !important; text-align: center !important; }
      #mlb2-43671474.ml-form-embedContainer .ml-form-align-right { text-align: right; }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedHeader img {
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
        height: auto;
        margin: 0 auto !important;
        max-width: 100%;
        width: undefinedpx;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody {
        padding: 20px 20px 0 20px;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody.ml-form-embedBodyHorizontal {
        padding-bottom: 0;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent {
        text-align: left;
        margin: 0 0 20px 0;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent h4,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent h4 {
        color: #000000;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        font-size: 30px;
        font-weight: 400;
        margin: 0 0 10px 0;
        text-align: left;
        word-break: break-word;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent p,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent p {
        color: #000000;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        font-size: 14px;
        font-weight: 400;
        line-height: 20px;
        margin: 0 0 10px 0;
        text-align: left;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent ul,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent ol,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent ul,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent ol {
        color: #000000;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        font-size: 14px;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent ol ol,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent ol ol {
        list-style-type: lower-alpha;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent ol ol ol,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent ol ol ol {
        list-style-type: lower-roman;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent p a,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent p a {
        color: #000000;
        text-decoration: underline;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-block-form .ml-field-group {
        text-align: left!important;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-block-form .ml-field-group label {
        margin-bottom: 5px;
        color: #333333;
        font-size: 14px;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        font-weight: bold; font-style: normal; text-decoration: none;;
        display: inline-block;
        line-height: 20px;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent p:last-child,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent p:last-child {
        margin: 0;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody form {
        margin: 0;
        width: 100%;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-formContent,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow {
        margin: 0 0 20px 0;
        width: 100%;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow {
        float: left;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-formContent.horozintalForm {
        margin: 0;
        padding: 0 0 20px 0;
        width: 100%;
        height: auto;
        float: left;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow {
        margin: 0 0 10px 0;
        width: 100%;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow.ml-last-item {
        margin: 0;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow.ml-formfieldHorizintal {
        margin: 0;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input {
        background-color: #ffffff !important;
        color: #333333 !important;
        border-color: #cccccc;
        border-radius: 4px !important;
        border-style: solid !important;
        border-width: 1px !important;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        font-size: 14px !important;
        height: auto;
        line-height: 21px !important;
        margin-bottom: 0;
        margin-top: 0;
        margin-left: 0;
        margin-right: 0;
        padding: 10px 10px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        max-width: 100% !important;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input::-webkit-input-placeholder,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow input::-webkit-input-placeholder { color: #333333; }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input::-moz-placeholder,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow input::-moz-placeholder { color: #333333; }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input:-ms-input-placeholder,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow input:-ms-input-placeholder { color: #333333; }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input:-moz-placeholder,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow input:-moz-placeholder { color: #333333; }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow textarea, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow textarea {
        background-color: #ffffff !important;
        color: #333333 !important;
        border-color: #cccccc;
        border-radius: 4px !important;
        border-style: solid !important;
        border-width: 1px !important;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        font-size: 14px !important;
        height: auto;
        line-height: 21px !important;
        margin-bottom: 0;
        margin-top: 0;
        padding: 10px 10px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        max-width: 100% !important;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::before {
          border-color: #cccccc!important;
          background-color: #ffffff!important;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input.custom-control-input[type="checkbox"]{
        box-sizing: border-box;
        padding: 0;
        position: absolute;
        z-index: -1;
        opacity: 0;
        margin-top: 5px;
        margin-left: -1.5rem;
        overflow: visible;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::before {
        border-radius: 4px!important;
      }


      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow input[type=checkbox]:checked~.label-description::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox input[type=checkbox]:checked~.label-description::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-input:checked~.custom-control-label::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-input:checked~.custom-control-label::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox input[type=checkbox]:checked~.label-description::after {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%23fff' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3e%3c/svg%3e");
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-input:checked~.custom-control-label::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-input:checked~.custom-control-label::after {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e");
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-input:checked~.custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-input:checked~.custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-input:checked~.custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-input:checked~.custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox input[type=checkbox]:checked~.label-description::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox input[type=checkbox]:checked~.label-description::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow input[type=checkbox]:checked~.label-description::before  {
          border-color: #000000!important;
          background-color: #000000!important;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-label::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-label::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-label::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-label::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-label::after {
           top: 2px;
           box-sizing: border-box;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::after {
           top: 0px!important;
           box-sizing: border-box!important;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::after {
        top: 0px!important;
           box-sizing: border-box!important;
      }

       #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::after {
            top: 0px!important;
            box-sizing: border-box!important;
            position: absolute;
            left: -1.5rem;
            display: block;
            width: 1rem;
            height: 1rem;
            content: "";
       }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::before {
        top: 0px!important;
        box-sizing: border-box!important;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .custom-control-label::before {
          position: absolute;
          top: 4px;
          left: -1.5rem;
          display: block;
          width: 16px;
          height: 16px;
          pointer-events: none;
          content: "";
          background-color: #ffffff;
          border: #adb5bd solid 1px;
          border-radius: 50%;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .custom-control-label::after {
          position: absolute;
          top: 2px!important;
          left: -1.5rem;
          display: block;
          width: 1rem;
          height: 1rem;
          content: "";
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::before, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::before {
          position: absolute;
          top: 4px;
          left: -1.5rem;
          display: block;
          width: 16px;
          height: 16px;
          pointer-events: none;
          content: "";
          background-color: #ffffff;
          border: #adb5bd solid 1px;
          border-radius: 50%;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::after {
          position: absolute;
          top: 0px!important;
          left: -1.5rem;
          display: block;
          width: 1rem;
          height: 1rem;
          content: "";
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::after {
          position: absolute;
          top: 0px!important;
          left: -1.5rem;
          display: block;
          width: 1rem;
          height: 1rem;
          content: "";
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .custom-radio .custom-control-label::after {
          background: no-repeat 50%/50% 50%;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .custom-checkbox .custom-control-label::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::after, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::after {
          background: no-repeat 50%/50% 50%;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-control, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-control {
        position: relative;
        display: block;
        min-height: 1.5rem;
        padding-left: 1.5rem;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-input, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-input, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-input, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-input {
          position: absolute;
          z-index: -1;
          opacity: 0;
          box-sizing: border-box;
          padding: 0;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-label, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-label, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-label, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-label {
          color: #000000;
          font-size: 12px!important;
          font-family: 'Open Sans', Arial, Helvetica, sans-serif;
          line-height: 22px;
          margin-bottom: 0;
          position: relative;
          vertical-align: top;
          font-style: normal;
          font-weight: 700;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-select, #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-select {
        background-color: #ffffff !important;
        color: #333333 !important;
        border-color: #cccccc;
        border-radius: 4px !important;
        border-style: solid !important;
        border-width: 1px !important;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        font-size: 14px !important;
        line-height: 20px !important;
        margin-bottom: 0;
        margin-top: 0;
        padding: 10px 28px 10px 12px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        max-width: 100% !important;
        height: auto;
        display: inline-block;
        vertical-align: middle;
        background: url('https://assets.mlcdn.com/ml/images/default/dropdown.svg') no-repeat right .75rem center/8px 10px;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
      }


      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow {
        height: auto;
        width: 100%;
        float: left;
      }
      .ml-form-formContent.horozintalForm .ml-form-horizontalRow .ml-input-horizontal { width: 70%; float: left; }
      .ml-form-formContent.horozintalForm .ml-form-horizontalRow .ml-button-horizontal { width: 30%; float: left; }
      .ml-form-formContent.horozintalForm .ml-form-horizontalRow .ml-button-horizontal.labelsOn { padding-top: 25px;  }
      .ml-form-formContent.horozintalForm .ml-form-horizontalRow .horizontal-fields { box-sizing: border-box; float: left; padding-right: 10px;  }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow input {
        background-color: #ffffff;
        color: #333333;
        border-color: #cccccc;
        border-radius: 4px;
        border-style: solid;
        border-width: 1px;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        font-size: 14px;
        line-height: 20px;
        margin-bottom: 0;
        margin-top: 0;
        padding: 10px 10px;
        width: 100%;
        box-sizing: border-box;
        overflow-y: initial;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow button {
        background-color: #a38b22 !important;
        border-color: #a38b22;
        border-style: solid;
        border-width: 1px;
        border-radius: 5px;
        box-shadow: none;
        color: #ffffff !important;
        cursor: pointer;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        font-size: 20px !important;
        font-weight: 700;
        line-height: 20px;
        margin: 0 !important;
        padding: 10px !important;
        width: 100%;
        height: auto;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow button:hover {
        background-color: #333333 !important;
        border-color: #333333 !important;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow input[type="checkbox"] {
        box-sizing: border-box;
        padding: 0;
        position: absolute;
        z-index: -1;
        opacity: 0;
        margin-top: 5px;
        margin-left: -1.5rem;
        overflow: visible;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description {
        color: #000000;
        display: block;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        font-size: 12px;
        text-align: left;
        margin-bottom: 0;
        position: relative;
        vertical-align: top;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow label {
        font-weight: normal;
        margin: 0;
        padding: 0;
        position: relative;
        display: block;
        min-height: 24px;
        padding-left: 24px;

      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow label a {
        color: #000000;
        text-decoration: underline;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow label p {
        color: #000000 !important;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif !important;
        font-size: 12px !important;
        font-weight: normal !important;
        line-height: 18px !important;
        padding: 0 !important;
        margin: 0 5px 0 0 !important;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow label p:last-child {
        margin: 0;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedSubmit {
        margin: 0 0 20px 0;
        float: left;
        width: 100%;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedSubmit button {
        background-color: #a38b22 !important;
        border: none !important;
        border-radius: 5px !important;
        box-shadow: none !important;
        color: #ffffff !important;
        cursor: pointer;
        font-family: 'Open Sans', Arial, Helvetica, sans-serif !important;
        font-size: 20px !important;
        font-weight: 700 !important;
        line-height: 21px !important;
        height: auto;
        padding: 10px !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedSubmit button.loading {
        display: none;
      }
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedSubmit button:hover {
        background-color: #333333 !important;
      }
      .ml-subscribe-close {
        width: 30px;
        height: 30px;
        background: url('https://assets.mlcdn.com/ml/images/default/modal_close.png') no-repeat;
        background-size: 30px;
        cursor: pointer;
        margin-top: -10px;
        margin-right: -10px;
        position: absolute;
        top: 0;
        right: 0;
      }
      .ml-error input, .ml-error textarea, .ml-error select {
        border-color: red!important;
      }

      .ml-error .custom-checkbox-radio-list {
        border: 1px solid red !important;
        border-radius: 4px;
        padding: 10px;
      }

      .ml-error .label-description,
      .ml-error .label-description p,
      .ml-error .label-description p a,
      .ml-error label:first-child {
        color: #ff0000 !important;
      }

      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow.ml-error .label-description p,
      #mlb2-43671474.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow.ml-error .label-description p:first-letter {
        color: #ff0000 !important;
      }
            @media only screen and (max-width: 400px){

        .ml-form-embedWrapper.embedDefault, .ml-form-embedWrapper.embedPopup { width: 100%!important; }
        .ml-form-formContent.horozintalForm { float: left!important; }
        .ml-form-formContent.horozintalForm .ml-form-horizontalRow { height: auto!important; width: 100%!important; float: left!important; }
        .ml-form-formContent.horozintalForm .ml-form-horizontalRow .ml-input-horizontal { width: 100%!important; }
        .ml-form-formContent.horozintalForm .ml-form-horizontalRow .ml-input-horizontal > div { padding-right: 0px!important; padding-bottom: 10px; }
        .ml-form-formContent.horozintalForm .ml-button-horizontal { width: 100%!important; }
        .ml-form-formContent.horozintalForm .ml-button-horizontal.labelsOn { padding-top: 0px!important; }

      }
    </style>

    
  
    
    

    
    

    
    

    

      
        
        
      

      
        
        
      

      

            
            
            
            
            
            
      

      

      
        
        
         
        
        
      

        
        
        
        
        
        
      

       

        
        
        
        
        
        
        
       


      
        
        
        
        
  



  
        
        
        
      


      
    
    
    
    
    
    
    
  

  
        
        
        
        
        
      

      
        
        
        
        
        
      

      
        
        
        
        
        
      

       

        
        
        
        
       

       
        
        
        
        
      

      
        
        
        
        
        
        
        
       

    

    


      


      

      
      

      

      





    

      
    <div id="mlb2-43671474" class="ml-form-embedContainer ml-subscribe-form ml-subscribe-form-43671474">
      <div class="ml-form-align-center ">
        <div class="ml-form-embedWrapper embedForm">

          
          

          <div class="ml-form-embedBody ml-form-embedBodyDefault row-form">

            <div class="ml-form-embedContent" style=" ">
              
                <h4>LET'S GEAUX!</h4>
                <p>Signup to get Bonus Trivia &amp; LSU News!</p>
              
            </div>

            <form class="ml-block-form" action="https://assets.mailerlite.com/jsonp/2506104/forms/192852546941879342/subscribe" data-code="" method="post" target="_blank">
              <div class="ml-form-formContent">
                

                  
                  <div class="ml-form-fieldRow ml-last-item">
                    <div class="ml-field-group ml-field-email ml-validate-email ml-validate-required">

                      


                      <!-- input -->
                      <input aria-label="email" aria-required="true" type="email" class="form-control" data-inputmask="" name="fields[email]" placeholder="Email" autocomplete="email">
                      <!-- /input -->

                      <!-- textarea -->
                      
                      <!-- /textarea -->

                      <!-- select -->
                      
                      <!-- /select -->

                      <!-- checkboxes -->
            
            <!-- /checkboxes -->

                      <!-- radio -->
                      
                      <!-- /radio -->

                      <!-- countries -->
                      
                      <!-- /countries -->





                    </div>
                  </div>
                
              </div>

              

              <!-- Privacy policy -->
              
              <!-- /Privacy policy -->

              

              

              






              
              <input type="hidden" name="ml-submit" value="1">

              <div class="ml-form-embedSubmit">
                
                  <button type="submit" class="primary">Subscribe!</button>
                
                <button disabled="disabled" style="display: none;" type="button" class="loading">
                  <div class="ml-form-embedSubmitLoad"></div>
                  <span class="sr-only">Loading...</span>
                </button>
              </div>

              
              <input type="hidden" name="anticsrf" value="true">
            </form>
          </div>

          <div class="ml-form-successBody row-success" style="display: none">

            <div class="ml-form-successContent">
              
                <h4>Thank you!</h4>
                
                  <p>You have successfully joined our subscriber list.</p>
                
              
            </div>

          </div>
        </div>
      </div>
    </div>

  

  
  
  <script>
    function ml_webform_success_43671474() {
      var $ = ml_jQuery || jQuery;
      $('.ml-subscribe-form-43671474 .row-success').show();
      $('.ml-subscribe-form-43671474 .row-form').hide();
    }
      </script>
  
  
      <script src="https://groot.mailerlite.com/js/w/webforms.min.js?v83147fa8ce2d95cb73ece7f28b469519" type="text/javascript"></script>
        <script>
            fetch("https://assets.mailerlite.com/jsonp/2506104/forms/192852546941879342/takel")
        </script>
            ==========================================
            The form will inherit the purple background from the parent div.
            In MailerLite's form editor, set the button color to #FDD023 (gold)
            and text to #241433 (dark) to match the site style.
          */}

          {/* PLACEHOLDER — remove this block once you paste the real MailerLite embed above */}
          <form
            onSubmit={e => { e.preventDefault(); alert("Replace this placeholder with your real MailerLite embed code — see the comment in TriviaGame.jsx"); }}
            style={{ display: "flex", gap: 8, maxWidth: 360, margin: "0 auto" }}
          >
            <input
              type="email"
              placeholder="your@email.com"
              style={{ flex: 1, border: "none", borderRadius: 8, padding: "10px 12px", fontSize: 14, background: "rgba(255,255,255,0.12)", color: "#fff", outline: "none" }}
            />
            <button type="submit" style={{ background: "#FDD023", color: "#241433", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap" }}>
              Subscribe
            </button>
          </form>
          {/* END PLACEHOLDER */}

          <div style={{ fontSize: 10.5, color: "#9A8E70", marginTop: 10 }}>No spam. Unsubscribe anytime.</div>
        </div>}

        {/* Footer */}
        <footer style={{ textAlign: "center", marginTop: 22 }}>
          <img src="/power-hour-lsu-logo.png" alt="Power Hour LSU" style={{ width: 78, height: 78, margin: "0 auto 6px", display: "block" }} />
          <div style={{ fontSize: 13, color: "#5B4A78" }}>
            A{" "}
            <a className="footer-link" href="https://www.youtube.com/@powerhourlsu" target="_blank" rel="noopener noreferrer">
              Power Hour LSU
            </a>{" "}
            production.
          </div>
          <div style={{ fontSize: 11, color: "#9A8E70", marginTop: 8, lineHeight: 1.5 }}>
            Unofficial fan trivia game. Not affiliated with or endorsed by LSU or the LSU Athletic Department.
          </div>
        </footer>
      </div>
    </main>
  );
}
