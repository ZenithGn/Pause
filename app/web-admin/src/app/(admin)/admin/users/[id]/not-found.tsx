import Link from "next/link";
import { UserX } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

export default function AdminUserNotFound() {
  return (
    <EmptyState
      icon={<UserX size={24} />}
      title="Không tìm thấy người dùng"
      description="Tài khoản bạn đang tìm không tồn tại hoặc đã bị xóa khỏi hệ thống."
      action={
        <Link href="/admin/users">
          <Button variant="primary" size="sm">
            Quay lại danh sách người dùng
          </Button>
        </Link>
      }
    />
  );
}
