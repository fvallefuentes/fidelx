import { describe, it, expect } from "vitest";
import {
  verificationCodeEmail,
  recoveryEmail,
  passwordResetEmail,
} from "@/lib/email/templates";

describe("verificationCodeEmail", () => {
  it("returns subject containing the code", () => {
    const { subject } = verificationCodeEmail({ code: "123456", ttlMinutes: 15 });
    expect(subject).toContain("123456");
  });

  it("text version contains code + TTL + greeting", () => {
    const { text } = verificationCodeEmail({ code: "654321", ttlMinutes: 30 });
    expect(text).toContain("654321");
    expect(text).toContain("30 minutes");
    expect(text).toContain("Bienvenue");
    expect(text).toContain("fidlify.com");
  });

  it("html version is valid HTML5 doctype", () => {
    const { html } = verificationCodeEmail({ code: "111111", ttlMinutes: 15 });
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('lang="fr"');
    expect(html).toContain("111111");
  });

  it("html includes Fidlify branding", () => {
    const { html } = verificationCodeEmail({ code: "1", ttlMinutes: 15 });
    expect(html).toContain("FIDLIFY");
  });
});

describe("recoveryEmail", () => {
  it("includes recovery URL + firstName + merchantName + programName", () => {
    const { text, html, subject } = recoveryEmail({
      firstName: "Marie",
      programName: "Café Lumen",
      merchantName: "Boulangerie du Lac",
      recoveryUrl: "https://example.com/carte/ABCD-EFGH-IJKL",
    });
    expect(subject).toContain("Café Lumen");
    expect(text).toContain("Marie");
    expect(text).toContain("Boulangerie du Lac");
    expect(text).toContain("https://example.com/carte/ABCD-EFGH-IJKL");
    expect(html).toContain("Marie");
    expect(html).toContain("https://example.com/carte/ABCD-EFGH-IJKL");
  });
});

describe("passwordResetEmail", () => {
  it("includes reset URL + TTL + optional firstName", () => {
    const { html, text } = passwordResetEmail({
      firstName: "Paul",
      resetUrl: "https://example.com/reset-password?token=abc",
      ttlHours: 24,
    });
    expect(html).toContain("Paul");
    expect(html).toContain("https://example.com/reset-password?token=abc");
    expect(html).toContain("24");
    expect(text).toContain("Paul");
  });

  it("works without firstName (anonymous greeting)", () => {
    const { text } = passwordResetEmail({
      firstName: null,
      resetUrl: "https://example.com/reset",
      ttlHours: 24,
    });
    expect(text).toContain("Bonjour,");
  });

  it("subject is in French and mentions Fidlify", () => {
    const { subject } = passwordResetEmail({
      resetUrl: "x",
      ttlHours: 1,
    });
    expect(subject).toContain("Fidlify");
    expect(subject.toLowerCase()).toContain("mot de passe");
  });
});
