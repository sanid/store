"use client";

import { useState } from "react";

export default function DevGatePage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch("/api/dev-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: input }),
      });
      if (res.ok) {
        const redirect = new URLSearchParams(window.location.search).get("next") || "/";
        window.location.replace(redirect);
      } else {
        setError(true);
        setInput("");
      }
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 px-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-stone-500">Development</p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
          placeholder="Code"
          autoFocus
          disabled={submitting}
          className="w-full border border-stone-700 bg-stone-900 px-4 py-3 text-center text-lg tracking-[0.5em] text-white placeholder-stone-600 focus:border-stone-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-stone-800 py-3 text-xs font-semibold uppercase tracking-widest text-stone-300 transition hover:bg-stone-700 disabled:opacity-50"
        >
          {submitting ? "..." : "Enter"}
        </button>
        {error && <p className="text-center text-xs text-red-400">Falscher Code</p>}
      </form>
    </div>
  );
}
