import { describe, expect, it } from "vitest";
import {
  combineJoinFormRequirements,
  getJoinFormRequirements,
  validateJoinFormRequirements,
} from "@/lib/join-form";

describe("join form requirements", () => {
  it("keeps the historical defaults for existing programs", () => {
    expect(getJoinFormRequirements({ maxStamps: 10 })).toEqual({
      emailRequired: false,
      phoneRequired: false,
      birthDateRequired: false,
    });
  });

  it("reads only explicit boolean requirements", () => {
    expect(
      getJoinFormRequirements({
        joinForm: {
          emailRequired: true,
          phoneRequired: "true",
          birthDateRequired: true,
        },
      })
    ).toEqual({
      emailRequired: true,
      phoneRequired: false,
      birthDateRequired: true,
    });
  });

  it("combines requirements from selected programs", () => {
    expect(
      combineJoinFormRequirements([
        {
          emailRequired: true,
          phoneRequired: false,
          birthDateRequired: false,
        },
        {
          emailRequired: false,
          phoneRequired: true,
          birthDateRequired: true,
        },
      ])
    ).toEqual({
      emailRequired: true,
      phoneRequired: true,
      birthDateRequired: true,
    });
  });

  it("requires at least one contact even when both fields are optional", () => {
    expect(
      validateJoinFormRequirements(
        {
          firstName: "Lina",
          email: null,
          phone: null,
          birthDate: null,
        },
        {
          emailRequired: false,
          phoneRequired: false,
          birthDateRequired: false,
        }
      )
    ).toMatchObject({ reason: "missing_email_phone" });
  });

  it("enforces every enabled field", () => {
    const requirements = {
      emailRequired: true,
      phoneRequired: true,
      birthDateRequired: true,
    };

    expect(
      validateJoinFormRequirements(
        {
          firstName: "Lina",
          email: "lina@example.com",
          phone: "+41791234567",
          birthDate: null,
        },
        requirements
      )
    ).toMatchObject({ reason: "missing_birth_date" });
  });
});
