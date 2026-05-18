"use client";

import { useState, type FormEvent } from "react";

export default function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg(null);
    try {
      await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, hp }),
      });
      // Réponse opaque côté API → on affiche toujours le même message
      setMsg({
        type: "success",
        text: "Vérifie ta boîte mail pour confirmer ton inscription.",
      });
      setEmail("");
    } catch {
      setMsg({ type: "error", text: "Erreur — réessaie plus tard." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="newsletter-form-wrap" onSubmit={handleSubmit} noValidate>
      <div className="newsletter-form">
        <input
          type="email"
          placeholder="ton@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          maxLength={200}
          disabled={loading}
        />
        {/* Honeypot anti-bot (caché via CSS — un humain ne le voit pas) */}
        <input
          type="text"
          name="hp"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          style={{
            position: "absolute",
            left: "-9999px",
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
        <button type="submit" disabled={loading || !email}>
          {loading ? "..." : "S'inscrire"}
        </button>
      </div>
      {msg && (
        <p className={`newsletter-form-msg ${msg.type === "success" ? "success" : ""}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
