import { describe, expect, it } from "vitest";
import {
  BYTES_PER_GB,
  bytesToGb,
  formatStorageGb,
  gbToBytes,
  membershipPlanFormSchema,
  membershipPlanIdSchema,
  toMembershipPlanRpcPayload,
  toggleMembershipPlanActiveSchema,
} from "@/features/membership/schemas";

describe("Membership storage conversion helpers (GB <-> bytes)", () => {
  it("converts GB to exact bytes using 1024^3", () => {
    expect(BYTES_PER_GB).toBe(1073741824);
    expect(gbToBytes(0)).toBe(0);
    expect(gbToBytes(5)).toBe(5368709120);
    expect(gbToBytes(10)).toBe(10737418240);
    expect(gbToBytes(20)).toBe(21474836480);
    expect(gbToBytes(0.5)).toBe(536870912);
  });

  it("converts bytes back to GB cleanly", () => {
    expect(bytesToGb(0)).toBe(0);
    expect(bytesToGb(5368709120)).toBe(5);
    expect(bytesToGb(10737418240)).toBe(10);
    expect(bytesToGb(21474836480)).toBe(20);
    expect(bytesToGb(536870912)).toBe(0.5);
  });

  it("formats storage bytes as GB strings", () => {
    expect(formatStorageGb(0)).toBe("0 GB");
    expect(formatStorageGb(null)).toBe("0 GB");
    expect(formatStorageGb(undefined)).toBe("0 GB");
    expect(formatStorageGb(5368709120)).toBe("5 GB");
    expect(formatStorageGb(536870912)).toBe("0.5 GB");
  });

  it("throws RangeError on negative or non-finite values", () => {
    expect(() => gbToBytes(-1)).toThrow(RangeError);
    expect(() => gbToBytes(Number.NaN)).toThrow(RangeError);
    expect(() => gbToBytes(Number.POSITIVE_INFINITY)).toThrow(RangeError);

    expect(() => bytesToGb(-100)).toThrow(RangeError);
    expect(() => bytesToGb(Number.NaN)).toThrow(RangeError);
  });
});

describe("Membership plan Zod schemas", () => {
  const validPayload = {
    name: "PAUSE Go",
    description: "Gói hội viên 5GB/năm",
    price_vnd: 30000,
    duration_type: "yearly" as const,
    extra_drawers: 10,
    storage_gb: 5,
    access_premium_templates: true,
    is_active: true,
  };

  it("accepts valid payloads and applies defaults (yearly duration)", () => {
    const parsed = membershipPlanFormSchema.parse({
      name: "  PAUSE Starter  ",
      description: "   ",
      price_vnd: "0",
      extra_drawers: "3",
      storage_gb: "2.5",
    });

    expect(parsed).toEqual({
      id: null,
      name: "PAUSE Starter",
      description: null,
      price_vnd: 0,
      duration_type: "yearly",
      extra_drawers: 3,
      storage_gb: 2.5,
      access_premium_templates: true,
      is_active: true,
    });
  });

  it("accepts valid edit payload with UUID and monthly duration", () => {
    const planId = "44444444-4444-4444-8444-444444444401";
    const parsed = membershipPlanFormSchema.parse({
      ...validPayload,
      id: planId,
      duration_type: "monthly",
      access_premium_templates: false,
      is_active: false,
    });

    expect(parsed.id).toBe(planId);
    expect(parsed.duration_type).toBe("monthly");
    expect(parsed.access_premium_templates).toBe(false);
    expect(parsed.is_active).toBe(false);
  });

  it("maps validated values to admin_upsert_membership_plan RPC payload", () => {
    const parsed = membershipPlanFormSchema.parse(validPayload);
    const rpcPayload = toMembershipPlanRpcPayload(parsed);

    expect(rpcPayload).toEqual({
      p_id: null,
      p_name: "PAUSE Go",
      p_description: "Gói hội viên 5GB/năm",
      p_price_vnd: 30000,
      p_duration_type: "yearly",
      p_extra_drawers: 10,
      p_extra_storage_bytes: 5368709120,
      p_access_premium_templates: true,
      p_is_active: true,
    });
  });

  it("rejects empty or whitespace-only plan names", () => {
    const emptyResult = membershipPlanFormSchema.safeParse({
      ...validPayload,
      name: "",
    });
    expect(emptyResult.success).toBe(false);

    const spacesResult = membershipPlanFormSchema.safeParse({
      ...validPayload,
      name: "   ",
    });
    expect(spacesResult.success).toBe(false);
  });

  it("rejects negative prices", () => {
    const negNumber = membershipPlanFormSchema.safeParse({
      ...validPayload,
      price_vnd: -1,
    });
    expect(negNumber.success).toBe(false);

    const negString = membershipPlanFormSchema.safeParse({
      ...validPayload,
      price_vnd: "-30000",
    });
    expect(negString.success).toBe(false);
  });

  it("rejects float prices and blank price strings", () => {
    const floatNumber = membershipPlanFormSchema.safeParse({
      ...validPayload,
      price_vnd: 30000.5,
    });
    expect(floatNumber.success).toBe(false);

    const floatString = membershipPlanFormSchema.safeParse({
      ...validPayload,
      price_vnd: "99.9",
    });
    expect(floatString.success).toBe(false);

    const blankString = membershipPlanFormSchema.safeParse({
      ...validPayload,
      price_vnd: "",
    });
    expect(blankString.success).toBe(false);
  });

  it("rejects negative drawers, float drawers, negative storage, and invalid duration", () => {
    expect(
      membershipPlanFormSchema.safeParse({ ...validPayload, extra_drawers: -2 }).success,
    ).toBe(false);
    expect(
      membershipPlanFormSchema.safeParse({ ...validPayload, extra_drawers: 2.5 }).success,
    ).toBe(false);
    expect(
      membershipPlanFormSchema.safeParse({ ...validPayload, storage_gb: -0.5 }).success,
    ).toBe(false);
    expect(
      membershipPlanFormSchema.safeParse({ ...validPayload, duration_type: "weekly" }).success,
    ).toBe(false);
  });

  it("validates plan ID and active toggle schemas", () => {
    expect(
      membershipPlanIdSchema.safeParse({ id: "not-a-uuid" }).success,
    ).toBe(false);
    expect(
      membershipPlanIdSchema.safeParse({
        id: "44444444-4444-4444-8444-444444444401",
      }).success,
    ).toBe(true);

    expect(
      toggleMembershipPlanActiveSchema.safeParse({
        id: "44444444-4444-4444-8444-444444444401",
        is_active: false,
      }).success,
    ).toBe(true);
  });
});
