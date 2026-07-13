"use client";

import { useMemo, useState } from "react";

const CHF = new Intl.NumberFormat("fr-CH", {
  style: "currency",
  currency: "CHF",
  maximumFractionDigits: 0,
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function Field({
  label,
  value,
  suffix,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 10,
        color: "#0E1116",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {label}
        <span
          style={{
            minWidth: 84,
            textAlign: "right",
            color: "#56750a",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          width: "100%",
          accentColor: "#D9FF3C",
        }}
      />
    </label>
  );
}

export default function LostRevenueCalculator() {
  const [monthlyClients, setMonthlyClients] = useState(420);
  const [averageTicket, setAverageTicket] = useState(24);
  const [lostRate, setLostRate] = useState(38);

  const values = useMemo(() => {
    const lostCustomers = Math.round(monthlyClients * (lostRate / 100));
    const monthlyLost = lostCustomers * averageTicket;
    const recoveredMonthly = Math.round(monthlyLost * 0.18);
    const recoveredYearly = recoveredMonthly * 12;

    return { lostCustomers, monthlyLost, recoveredMonthly, recoveredYearly };
  }, [averageTicket, lostRate, monthlyClients]);

  return (
    <div
      style={{
        maxWidth: 1440,
        margin: "0 auto 18px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
        gap: 14,
      }}
    >
      <div
        style={{
          borderRadius: 22,
          border: "1px solid rgba(14,17,22,0.1)",
          background: "#FCFCFC",
          boxShadow: "0 18px 54px rgba(24,30,10,0.08)",
          padding: "clamp(18px, 3vw, 30px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#56750a",
              }}
            >
              Calculateur
            </div>
            <h3
              style={{
                margin: "6px 0 0",
                fontSize: "clamp(24px, 3vw, 42px)",
                lineHeight: 1,
                letterSpacing: "-0.03em",
                color: "#0E1116",
              }}
            >
              Combien vous coûte l’absence de relance client ?
            </h3>
          </div>
          <div
            aria-hidden="true"
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "#D9FF3C",
              color: "#0E1116",
              fontSize: 24,
              fontWeight: 900,
              boxShadow: "0 12px 34px rgba(140,185,0,0.22)",
            }}
          >
            CHF
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 18,
          }}
        >
          <Field
            label="Clients par mois"
            value={monthlyClients}
            min={50}
            max={2000}
            step={10}
            onChange={(value) => setMonthlyClients(clamp(value, 50, 2000))}
          />
          <Field
            label="Panier moyen"
            value={averageTicket}
            suffix=" CHF"
            min={5}
            max={150}
            onChange={(value) => setAverageTicket(clamp(value, 5, 150))}
          />
          <Field
            label="Clients qui ne reviennent pas"
            value={lostRate}
            suffix="%"
            min={5}
            max={80}
            onChange={(value) => setLostRate(clamp(value, 5, 80))}
          />
        </div>
      </div>

      <div
        style={{
          borderRadius: 22,
          background: "#0E1116",
          color: "#FCFCFC",
          padding: "clamp(18px, 3vw, 30px)",
          display: "grid",
          alignContent: "space-between",
          gap: 22,
          boxShadow: "0 18px 54px rgba(14,17,22,0.18)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#D9FF3C",
            }}
          >
            Manque à gagner estimé
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: "clamp(42px, 6vw, 72px)",
              lineHeight: 0.95,
              letterSpacing: "-0.05em",
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {CHF.format(values.monthlyLost)}
          </div>
          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 420,
              color: "rgba(252,252,252,0.68)",
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            Environ {values.lostCustomers} clients par mois ne reviennent pas. Une relance
            Wallet bien ciblée peut récupérer une partie de ce revenu sans application à
            installer.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div
            style={{
              borderRadius: 16,
              background: "rgba(217,255,60,0.13)",
              border: "1px solid rgba(217,255,60,0.22)",
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#D9FF3C",
              }}
            >
              Potentiel / mois
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 25,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {CHF.format(values.recoveredMonthly)}
            </div>
          </div>
          <div
            style={{
              borderRadius: 16,
              background: "rgba(252,252,252,0.08)",
              border: "1px solid rgba(252,252,252,0.13)",
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "rgba(252,252,252,0.68)",
              }}
            >
              Potentiel / an
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 25,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {CHF.format(values.recoveredYearly)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
