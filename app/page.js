import { getTodaysPuzzle } from "../lib/getPuzzle";
import TriviaGame from "./TriviaGame";

// Always fetch fresh data so the daily puzzle updates without a redeploy.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { puzzle, error } = await getTodaysPuzzle();

  if (error) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4EFE3",
          fontFamily: "system-ui, sans-serif",
          color: "#241433",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ color: "#461D7C" }}>LSU Daily Trivia</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return <TriviaGame puzzle={puzzle} />;
}
