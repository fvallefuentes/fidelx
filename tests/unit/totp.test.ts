import { describe, it, expect } from "vitest";
import { generateSync } from "otplib";
import {
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCode,
  findMatchingBackupHash,
  TOTP_BACKUP_CODE_COUNT,
} from "@/lib/auth/totp";

describe("generateTotpSecret", () => {
  it("génère un secret base32 de longueur standard", () => {
    const s = generateTotpSecret();
    // Base32 d'un secret 160 bits = 32 chars (sans padding)
    expect(s.length).toBeGreaterThanOrEqual(16);
    expect(s).toMatch(/^[A-Z2-7]+$/);
  });

  it("génère un secret différent à chaque appel", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).not.toBe(b);
  });
});

describe("buildOtpAuthUrl", () => {
  it("retourne une URL otpauth:// valide avec issuer Fidlify", () => {
    const url = buildOtpAuthUrl("test@fidlify.com", "JBSWY3DPEHPK3PXP");
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain("issuer=Fidlify");
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
  });

  it("encode correctement les caractères spéciaux dans l'email", () => {
    const url = buildOtpAuthUrl("a+b@x.com", "JBSWY3DPEHPK3PXP");
    // L'email contient + et @ → doit être URL-encodé
    expect(url).toContain("a%2Bb%40x.com");
  });
});

describe("verifyTotpCode", () => {
  it("accepte un code généré à partir du même secret", async () => {
    const secret = generateTotpSecret();
    const code = generateSync({ secret });
    expect(await verifyTotpCode(secret, code)).toBe(true);
  });

  it("rejette un code aléatoire", async () => {
    const secret = generateTotpSecret();
    expect(await verifyTotpCode(secret, "000000")).toBe(false);
  });

  it("rejette si secret vide", async () => {
    expect(await verifyTotpCode("", "123456")).toBe(false);
  });

  it("rejette si code vide", async () => {
    const secret = generateTotpSecret();
    expect(await verifyTotpCode(secret, "")).toBe(false);
  });

  it("rejette un code avec moins de 6 chiffres", async () => {
    const secret = generateTotpSecret();
    expect(await verifyTotpCode(secret, "12345")).toBe(false);
  });

  it("normalise les espaces dans le code saisi", async () => {
    const secret = generateTotpSecret();
    const code = generateSync({ secret });
    // Découpe le code avec un espace au milieu, comme un user qui le tape
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(await verifyTotpCode(secret, spaced)).toBe(true);
  });
});

describe("generateBackupCodes", () => {
  it("génère le nombre attendu de codes", () => {
    const { plainCodes, hashedCodes } = generateBackupCodes();
    expect(plainCodes.length).toBe(TOTP_BACKUP_CODE_COUNT);
    expect(hashedCodes.length).toBe(TOTP_BACKUP_CODE_COUNT);
  });

  it("génère des codes au format XXXX-XXXX-XX", () => {
    const { plainCodes } = generateBackupCodes();
    for (const c of plainCodes) {
      expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{2}$/);
    }
  });

  it("ne contient pas les caractères ambigus I/O/0/1", () => {
    const { plainCodes } = generateBackupCodes();
    for (const c of plainCodes) {
      expect(c).not.toMatch(/[IO01]/);
    }
  });

  it("les codes en clair sont tous uniques", () => {
    const { plainCodes } = generateBackupCodes();
    expect(new Set(plainCodes).size).toBe(plainCodes.length);
  });

  it("les hashes correspondent aux codes en clair", () => {
    const { plainCodes, hashedCodes } = generateBackupCodes();
    for (let i = 0; i < plainCodes.length; i++) {
      expect(hashBackupCode(plainCodes[i])).toBe(hashedCodes[i]);
    }
  });
});

describe("findMatchingBackupHash", () => {
  it("retourne le hash matché si le code est dans la liste", () => {
    const { plainCodes, hashedCodes } = generateBackupCodes();
    const code = plainCodes[3];
    const expectedHash = hashedCodes[3];
    expect(findMatchingBackupHash(hashedCodes, code)).toBe(expectedHash);
  });

  it("retourne null si le code ne matche aucun hash", () => {
    const { hashedCodes } = generateBackupCodes();
    expect(findMatchingBackupHash(hashedCodes, "ZZZZ-ZZZZ-ZZ")).toBe(null);
  });

  it("est case-insensitive (uppercase/lowercase)", () => {
    const { plainCodes, hashedCodes } = generateBackupCodes();
    const lower = plainCodes[0].toLowerCase();
    expect(findMatchingBackupHash(hashedCodes, lower)).toBe(hashedCodes[0]);
  });

  it("ignore les tirets dans le code saisi", () => {
    const { plainCodes, hashedCodes } = generateBackupCodes();
    const noDash = plainCodes[0].replace(/-/g, "");
    expect(findMatchingBackupHash(hashedCodes, noDash)).toBe(hashedCodes[0]);
  });

  it("ignore les espaces dans le code saisi", () => {
    const { plainCodes, hashedCodes } = generateBackupCodes();
    const spaced = plainCodes[0].replace(/-/g, " ");
    expect(findMatchingBackupHash(hashedCodes, spaced)).toBe(hashedCodes[0]);
  });

  it("retourne null si la longueur ne matche pas (10 chars sans tirets attendu)", () => {
    const { hashedCodes } = generateBackupCodes();
    expect(findMatchingBackupHash(hashedCodes, "ABC")).toBe(null);
  });
});

describe("Constantes 2FA", () => {
  it("TOTP_BACKUP_CODE_COUNT = 10 (standard)", () => {
    expect(TOTP_BACKUP_CODE_COUNT).toBe(10);
  });
});
