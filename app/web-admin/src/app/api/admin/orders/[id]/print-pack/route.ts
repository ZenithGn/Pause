import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { hasPublicSupabaseEnv, isMockAdminMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPrintPackZipBuffer } from "@/features/orders/print-pack";
import { getOrderDetail } from "@/features/orders/queries";
import { orderIdSchema } from "@/features/orders/schemas";

export const dynamic = "force-dynamic";

function isNextRedirectError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isMockAdminMode() && hasPublicSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." },
        { status: 401 },
      );
    }

    const { data: isAdminResult, error: rpcError } = await supabase.rpc("is_admin");
    if (rpcError || isAdminResult !== true) {
      return NextResponse.json(
        { error: "Bạn không có quyền quản trị." },
        { status: 403 },
      );
    }
  }

  try {
    await requireAdmin();
  } catch (error) {
    if (isNextRedirectError(error)) {
      return NextResponse.json(
        { error: "Bạn không có quyền quản trị." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "Không thể xác thực quyền quản trị." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const parsedId = orderIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Mã đơn hàng không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const detail = await getOrderDetail(parsedId.data);
    if (!detail) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng." },
        { status: 404 },
      );
    }

    const zipBuffer = await buildPrintPackZipBuffer(detail);
    const safeShortCode = detail.order.short_code.replace(/[^A-Za-z0-9_-]/g, "") || "order";

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="pause-order-${safeShortCode}-print-pack.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tạo gói in cho đơn hàng.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
