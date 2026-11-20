import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import { buildOrdersCsv, escapeCsvCell } from "@/features/orders/csv";
import { buildPrintPackZipBuffer } from "@/features/orders/print-pack";
import {
  orderFilterParamsSchema,
  orderIdSchema,
  updateOrderNotesSchema,
  updateOrderStatusSchema,
} from "@/features/orders/schemas";
import {
  canTransition,
  getAllowedNextStatuses,
  isTerminalOrderStatus,
  ORDER_STATUSES,
  requiresNote,
} from "@/features/orders/status-machine";
import { getMockOrderDetail, MOCK_ORDERS } from "@/lib/mock-data";
import type { OrderStatus } from "@/types/admin";

const VALID_UUID = "33333333-3333-4333-8333-333333333301";

describe("FR-06.3 Order Status Machine (§5.4)", () => {
  const EXPECTED_ALLOWED_MATRIX: Record<OrderStatus, readonly OrderStatus[]> = {
    pending: ["processing", "cancelled"],
    processing: ["printing", "cancelled"],
    printing: ["shipping"],
    shipping: ["completed"],
    completed: [],
    cancelled: [],
  };

  it("exposes all 6 canonical statuses", () => {
    expect(ORDER_STATUSES).toEqual([
      "pending",
      "processing",
      "printing",
      "shipping",
      "completed",
      "cancelled",
    ]);
  });

  const allPairs: Array<{ from: OrderStatus; to: OrderStatus; expected: boolean }> = [];
  for (const from of ORDER_STATUSES) {
    for (const to of ORDER_STATUSES) {
      allPairs.push({
        from,
        to,
        expected: EXPECTED_ALLOWED_MATRIX[from].includes(to),
      });
    }
  }

  it("tests all 36 (from, to) transition pairs", () => {
    expect(allPairs).toHaveLength(36);
    for (const { from, to, expected } of allPairs) {
      expect(
        canTransition(from, to),
        `canTransition("${from}", "${to}") should be ${expected}`,
      ).toBe(expected);
    }
  });

  it("returns exact allowed next statuses and terminal status flags", () => {
    for (const status of ORDER_STATUSES) {
      expect(getAllowedNextStatuses(status)).toEqual(EXPECTED_ALLOWED_MATRIX[status]);
      expect(isTerminalOrderStatus(status)).toBe(
        status === "completed" || status === "cancelled",
      );
    }
  });

  it("requires note strictly for cancelled status", () => {
    for (const status of ORDER_STATUSES) {
      expect(requiresNote(status)).toBe(status === "cancelled");
    }
  });
});

describe("FR-06.3 Order Zod Schemas", () => {
  describe("updateOrderStatusSchema", () => {
    it("accepts non-cancel transitions without a note and trims optional notes", () => {
      const noNote = updateOrderStatusSchema.safeParse({
        orderId: VALID_UUID,
        newStatus: "processing",
      });
      expect(noNote.success).toBe(true);
      if (noNote.success) {
        expect(noNote.data.note).toBeNull();
      }

      const blankNote = updateOrderStatusSchema.safeParse({
        orderId: VALID_UUID,
        newStatus: "printing",
        note: "   ",
      });
      expect(blankNote.success).toBe(true);
      if (blankNote.success) {
        expect(blankNote.data.note).toBeNull();
      }

      const withNote = updateOrderStatusSchema.safeParse({
        orderId: VALID_UUID,
        newStatus: "shipping",
        note: "  Bàn giao GHN  ",
      });
      expect(withNote.success).toBe(true);
      if (withNote.success) {
        expect(withNote.data.note).toBe("Bàn giao GHN");
      }
    });

    it("rejects cancelled status without a non-empty note", () => {
      for (const emptyNote of [undefined, null, "", "   \n\t  "]) {
        const res = updateOrderStatusSchema.safeParse({
          orderId: VALID_UUID,
          newStatus: "cancelled",
          note: emptyNote,
        });
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error.flatten().fieldErrors.note).toContain(
            "Vui lòng nhập lý do hủy đơn.",
          );
        }
      }
    });

    it("accepts cancelled status when a valid note is provided", () => {
      const res = updateOrderStatusSchema.safeParse({
        orderId: VALID_UUID,
        newStatus: "cancelled",
        note: "Khách yêu cầu hủy trước khi in",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.note).toBe("Khách yêu cầu hủy trước khi in");
      }
    });

    it("rejects invalid UUID, invalid status, and overly long notes", () => {
      expect(
        updateOrderStatusSchema.safeParse({
          orderId: "not-a-uuid",
          newStatus: "processing",
        }).success,
      ).toBe(false);

      expect(
        updateOrderStatusSchema.safeParse({
          orderId: VALID_UUID,
          newStatus: "confirmed",
        }).success,
      ).toBe(false);

      expect(
        updateOrderStatusSchema.safeParse({
          orderId: VALID_UUID,
          newStatus: "processing",
          note: "a".repeat(501),
        }).success,
      ).toBe(false);
    });
  });

  describe("updateOrderNotesSchema", () => {
    it("accepts valid notes and empty notes for clearing", () => {
      const valid = updateOrderNotesSchema.safeParse({
        orderId: VALID_UUID,
        adminNotes: "  Kiểm tra lại màu bìa cứng  ",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.adminNotes).toBe("Kiểm tra lại màu bìa cứng");
      }

      const empty = updateOrderNotesSchema.safeParse({
        orderId: VALID_UUID,
        adminNotes: "   ",
      });
      expect(empty.success).toBe(true);
      if (empty.success) {
        expect(empty.data.adminNotes).toBe("");
      }
    });

    it("rejects invalid UUID and notes exceeding 2000 characters", () => {
      expect(
        updateOrderNotesSchema.safeParse({
          orderId: "bad-id",
          adminNotes: "ok",
        }).success,
      ).toBe(false);

      expect(
        updateOrderNotesSchema.safeParse({
          orderId: VALID_UUID,
          adminNotes: "x".repeat(2001),
        }).success,
      ).toBe(false);
    });
  });

  describe("orderIdSchema & orderFilterParamsSchema", () => {
    it("validates UUIDs and normalizes list filters safely", () => {
      expect(orderIdSchema.safeParse(VALID_UUID).success).toBe(true);
      expect(orderIdSchema.safeParse("123").success).toBe(false);

      const parsed = orderFilterParamsSchema.safeParse({
        q: "  Minh Anh ",
        status: "PROCESSING",
        from: "2026-11-01",
        to: "invalid-date",
        sort: "unknown.sort",
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual({
          q: "Minh Anh",
          status: "processing",
          from: "2026-11-01",
          to: undefined,
          sort: "created_at.desc",
        });
      }
    });
  });
});

describe("FR-06.3 CSV Export & Print-Pack ZIP Helpers", () => {
  it("escapes CSV cells against quotes, commas, and spreadsheet formula injection", () => {
    expect(escapeCsvCell("Nguyễn, Minh Anh")).toBe('"Nguyễn, Minh Anh"');
    expect(escapeCsvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(escapeCsvCell("=CMD()")).toBe("'=CMD()");
    expect(escapeCsvCell("+84901234567")).toBe("'+84901234567");

    const csv = buildOrdersCsv(MOCK_ORDERS);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Mã đơn");
    expect(csv).toContain("#33333301");
    expect(csv).toContain("Nguyễn Minh Anh");
  });

  it("packages order.txt and fetched images into a valid ZIP archive", async () => {
    const detail = getMockOrderDetail(VALID_UUID);
    expect(detail).not.toBeNull();
    if (!detail) return;

    const fakeFetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("Order+01")) {
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }
      return new Response(new Uint8Array([255, 216, 255]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    }) as unknown as typeof fetch;

    const buffer = await buildPrintPackZipBuffer(detail, fakeFetch);
    const zip = await JSZip.loadAsync(buffer);

    const orderTxt = await zip.file("order.txt")?.async("string");
    expect(orderTxt).toContain(`#${detail.order.short_code}`);
    expect(orderTxt).toContain(detail.order.shipping_address);
    expect(zip.file("preview.png")).not.toBeNull();
    expect(zip.file("slots/slot-01.jpg")).not.toBeNull();
    expect(zip.file("fetch-errors.txt")).toBeNull();
  });

  it("produces a valid ZIP with fetch-errors.txt when image URLs are unreachable", async () => {
    const detail = getMockOrderDetail(VALID_UUID);
    expect(detail).not.toBeNull();
    if (!detail) return;

    const failingFetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("Slot+1")) {
        return new Response("Not Found", { status: 404, statusText: "Not Found" });
      }
      throw new Error("Network unreachable");
    }) as unknown as typeof fetch;

    const buffer = await buildPrintPackZipBuffer(detail, failingFetch);
    const zip = await JSZip.loadAsync(buffer);

    expect(zip.file("order.txt")).not.toBeNull();
    const errorTxt = await zip.file("fetch-errors.txt")?.async("string");
    expect(errorTxt).toBeDefined();
    expect(errorTxt).toContain("HTTP 404 Not Found");
    expect(errorTxt).toContain("Network unreachable");
  });
});

describe("FR-06.3 Print-Pack Route Handler (/api/admin/orders/[id]/print-pack)", () => {
  it("returns 401 in non-mock mode when user is not authenticated", async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    vi.doMock("@/lib/env", () => ({
      isMockAdminMode: () => false,
      hasPublicSupabaseEnv: () => true,
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
        rpc: vi.fn(),
      }),
    }));
    vi.doMock("@/lib/auth/require-admin", () => ({
      requireAdmin: vi.fn(),
    }));

    const { GET } = await import("@/app/api/admin/orders/[id]/print-pack/route");
    const response = await GET({} as never, {
      params: Promise.resolve({ id: VALID_UUID }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 in non-mock mode when authenticated user is not an admin", async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    vi.doMock("@/lib/env", () => ({
      isMockAdminMode: () => false,
      hasPublicSupabaseEnv: () => true,
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
        },
        rpc: async () => ({ data: false, error: null }),
      }),
    }));
    vi.doMock("@/lib/auth/require-admin", () => ({
      requireAdmin: vi.fn(),
    }));

    const { GET } = await import("@/app/api/admin/orders/[id]/print-pack/route");
    const response = await GET({} as never, {
      params: Promise.resolve({ id: VALID_UUID }),
    });

    expect(response.status).toBe(403);
  });

  it("calls requireAdmin and returns 400/404/200 zip in mock admin mode", async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    const requireAdminMock = vi.fn(async () => ({
      user: { id: "admin-1", email: "admin@pause.vn" },
      profile: {
        id: "admin-1",
        display_name: "Admin",
        avatar_url: null,
        phone: null,
        role: "admin",
        is_locked: false,
      },
      isMock: true,
    }));

    vi.doMock("@/lib/env", () => ({
      isMockAdminMode: () => true,
      hasPublicSupabaseEnv: () => false,
    }));
    vi.doMock("@/lib/auth/require-admin", () => ({
      requireAdmin: requireAdminMock,
    }));
    vi.doMock("@/features/orders/print-pack", async () => {
      const actual = await vi.importActual<typeof import("@/features/orders/print-pack")>(
        "@/features/orders/print-pack",
      );
      return {
        ...actual,
        buildPrintPackZipBuffer: async (detail: Parameters<typeof actual.buildPrintPackZipBuffer>[0]) =>
          actual.buildPrintPackZipBuffer(detail, (async () => {
            throw new Error("Offline test");
          }) as unknown as typeof fetch),
      };
    });

    const { GET } = await import("@/app/api/admin/orders/[id]/print-pack/route");

    const badRes = await GET({} as never, {
      params: Promise.resolve({ id: "invalid-id" }),
    });
    expect(badRes.status).toBe(400);
    expect(requireAdminMock).toHaveBeenCalledTimes(1);

    const notFoundRes = await GET({} as never, {
      params: Promise.resolve({ id: "99999999-9999-4999-8999-999999999999" }),
    });
    expect(notFoundRes.status).toBe(404);

    const okRes = await GET({} as never, {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get("content-type")).toBe("application/zip");
    const zipData = await okRes.arrayBuffer();
    const loadedZip = await JSZip.loadAsync(zipData);
    expect(loadedZip.file("order.txt")).not.toBeNull();
    expect(loadedZip.file("fetch-errors.txt")).not.toBeNull();
  });
});

