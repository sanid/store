"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "dev-auth";
const PASSCODE = "1412";

export default function DevGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthenticated(localStorage.getItem(STORAGE_KEY) === "1");
    setReady(true);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === PASSCODE) {
      localStorage.setItem(STORAGE_KEY, "1");
      setAuthenticated(true);
    } else {
      setError(true);
      setInput("");
    }
  }

  if (!ready) return null;

  if (authenticated) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 px-6"
      >
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-stone-500">
            Development
          </p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
          placeholder="Code"
          autoFocus
          className="w-full border border-stone-700 bg-stone-900 px-4 py-3 text-center text-lg tracking-[0.5em] text-white placeholder-stone-600 focus:border-stone-500 focus:outline-none"
        />
        <button
          type="submit"
          className="w-full bg-stone-800 py-3 text-xs font-semibold uppercase tracking-widest text-stone-300 transition hover:bg-stone-700"
        >
          Enter
        </button>
        {error && (
          <p className="text-center text-xs text-red-400">Falscher Code</p>
        )}
      </form>
    </div>
  );
}
