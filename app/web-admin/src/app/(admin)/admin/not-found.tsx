import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

export default function AdminNotFound() {
  return (
    <EmptyState
      icon={<FileQuestion size={24} />}
      title="Không tìm thấy trang"
      description="Đường dẫn bạn truy cập không tồn tại hoặc dữ liệu đã bị gỡ bỏ."
      action={
        <Link href="/admin">
          <Button variant="primary" size="sm">
            Quay lại Dashboard
          </Button>
        </Link>
      }
    />
  );
}
