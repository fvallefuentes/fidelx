import { describe, it, expect } from "vitest";
import { toCsv, csvResponseHeaders } from "@/lib/csv";

describe("toCsv — RFC 4180", () => {
  const cols = [
    { key: "name" as const, header: "Nom" },
    { key: "age" as const, header: "Âge" },
  ];

  it("renders a UTF-8 BOM at start", () => {
    const out = toCsv([{ name: "Marie", age: 30 }], cols);
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it("uses ';' as separator (FR/CH convention)", () => {
    const out = toCsv([{ name: "Marie", age: 30 }], cols);
    expect(out).toContain("Nom;Âge");
    expect(out).toContain("Marie;30");
  });

  it("quotes cells containing the separator", () => {
    const out = toCsv([{ name: "Doe; Marie", age: 30 }], cols);
    expect(out).toContain('"Doe; Marie";30');
  });

  it("escapes embedded quotes by doubling", () => {
    const out = toCsv([{ name: 'John "Big" Doe', age: 30 }], cols);
    expect(out).toContain('"John ""Big"" Doe";30');
  });

  it("quotes cells with newlines", () => {
    const out = toCsv([{ name: "line1\nline2", age: 30 }], cols);
    expect(out).toContain('"line1\nline2";30');
  });

  it("renders Date as ISO 8601", () => {
    const cols2 = [{ key: "createdAt" as const, header: "Created" }];
    const date = new Date("2026-05-10T14:30:00.000Z");
    const out = toCsv([{ createdAt: date }], cols2);
    expect(out).toContain("2026-05-10T14:30:00.000Z");
  });

  it("handles null/undefined as empty string", () => {
    const cols2 = [
      { key: "a" as const, header: "A" },
      { key: "b" as const, header: "B" },
    ];
    const out = toCsv([{ a: null, b: undefined }], cols2);
    const lines = out.replace(/^﻿/, "").split("\n");
    expect(lines[1]).toBe(";");
  });

  it("converts booleans to 0/1", () => {
    const cols2 = [
      { key: "active" as const, header: "Actif" },
    ];
    const out = toCsv([{ active: true }, { active: false }], cols2);
    expect(out).toContain("1\n");
    expect(out).toContain("0\n");
  });

  it("renders empty rows array with header only + final newline absent", () => {
    const out = toCsv([], cols);
    expect(out.replace(/^﻿/, "")).toBe("Nom;Âge\n");
  });

  it("respects column order", () => {
    const out = toCsv(
      [{ age: 30, name: "Marie" }],
      [
        { key: "age" as const, header: "Âge" },
        { key: "name" as const, header: "Nom" },
      ]
    );
    expect(out).toContain("Âge;Nom");
    expect(out).toContain("30;Marie");
  });
});

describe("csvResponseHeaders", () => {
  it("sets Content-Type with utf-8", () => {
    const h = csvResponseHeaders("fidlify-clients.csv");
    expect(h["Content-Type"]).toBe("text/csv; charset=utf-8");
  });

  it("sets Content-Disposition with quoted filename", () => {
    const h = csvResponseHeaders("fidlify-clients-2026-05-10.csv");
    expect(h["Content-Disposition"]).toContain('attachment; filename="fidlify-clients-2026-05-10.csv"');
  });

  it("sanitizes unsafe characters in filename", () => {
    const h = csvResponseHeaders('weird name/with;chars".csv');
    expect(h["Content-Disposition"]).toContain('"weird_name_with_chars_.csv"');
  });

  it("sets Cache-Control no-store", () => {
    const h = csvResponseHeaders("x.csv");
    expect(h["Cache-Control"]).toBe("no-store");
  });
});
