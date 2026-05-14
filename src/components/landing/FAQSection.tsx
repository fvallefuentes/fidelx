"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  const t = useTranslations("Landing.faq");
  const items = t.raw("items") as Array<{ q: string; a: string }>;

  return (
    <section className="section" id="faq">
      <div className="wrap">
        <div className="section-head center" style={{ marginBottom: 0 }}>
          <div className="eyebrow"><span className="dot" /><span>FAQ</span></div>
          <h2 className="h-section">
            {t("titleA")} <em>{t("titleB")}</em>
          </h2>
        </div>

        <div className="faq-list">
          {items.map((item, i) => (
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
