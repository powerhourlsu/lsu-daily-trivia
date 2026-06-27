// Tiny CSV parser that correctly handles quoted fields containing commas.
// Good enough for our sheet (no embedded newlines inside cells).
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && next === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// Expected sheet columns, in this order:
// date | answer | isRival | clue1 | clue2 | clue3 | clue4 | clue5
function rowsToPuzzles(rows) {
  const [header, ...dataRows] = rows;
  return dataRows.map((cols) => {
    const [date, answer, isRivalRaw, c1, c2, c3, c4, c5] = cols;
    return {
      date: (date || "").trim(),
      answer: (answer || "").trim(),
      isRival: (isRivalRaw || "").trim().toUpperCase() === "TRUE",
      clues: [c1, c2, c3, c4, c5].map((c) => (c || "").trim()).filter(Boolean),
    };
  });
}

function todayDateString() {
  // YYYY-MM-DD in server time. Good enough for a single-timezone daily game.
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export async function getTodaysPuzzle() {
  const url = process.env.SHEET_CSV_URL;

  if (!url || url.includes("PASTE-YOUR-ID-HERE")) {
    return {
      error:
        "No sheet connected yet. Add SHEET_CSV_URL in your environment variables (see README).",
    };
  }

  let text;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    text = await res.text();
  } catch (err) {
    return { error: `Could not load puzzles from the sheet: ${err.message}` };
  }

  const puzzles = rowsToPuzzles(parseCSV(text)).filter(
    (p) => p.date && p.answer && p.clues.length === 5
  );

  if (puzzles.length === 0) {
    return { error: "Sheet is connected but has no valid rows yet." };
  }

  puzzles.sort((a, b) => (a.date < b.date ? -1 : 1));

  const today = todayDateString();

  // Exact match for today, else the most recent past puzzle, else the earliest one.
  const exact = puzzles.find((p) => p.date === today);
  if (exact) return { puzzle: exact };

  const past = puzzles.filter((p) => p.date <= today);
  if (past.length > 0) return { puzzle: past[past.length - 1] };

  return { puzzle: puzzles[0] };
}
