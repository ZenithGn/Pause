import Link from "next/link";
import { PackageX } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

export default function OrderNotFoundPage() {
  return (
    <EmptyState
      icon={<PackageX size={24} />}
      title="Không tìm thấy đơn hàng"
      description="Đơn hàng không tồn tại hoặc mã đơn hàng không hợp lệ."
      action={
        <Link href="/admin/orders">
          <Button variant="primary" size="sm">
            Quay lại danh sách đơn hàng
          </Button>
        </Link>
      }
    />
  );
}
