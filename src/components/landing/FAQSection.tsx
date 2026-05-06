"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/seo";

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="section" id="faq">
      <div className="wrap">
        <div className="section-head center" style={{ marginBottom: 0 }}>
          <div className="eyebrow"><span className="dot" /><span>FAQ</span></div>
          <h2 className="h-section">
            Les questions <em>qu&apos;on nous pose souvent.</em>
          </h2>
        </div>

        <div className="faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`faq-item${open === i ? " open" : ""}`}
            >
              <button
                type="button"
                className="faq-q"
                aria-expanded={open === i}
                aria-controls={`faq-answer-${i}`}
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  width: "100%",
                  textAlign: "left",
                  font: "inherit",
                  color: "inherit",
                }}
              >
                <span>{item.q}</span>
                <span className="toggle" aria-hidden="true">
                  <Plus size={14} />
                </span>
              </button>
              <div id={`faq-answer-${i}`} className="faq-a" role="region">
                {item.a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
