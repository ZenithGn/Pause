"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Save } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
  useToast,
} from "@/components/ui";
import { updateOrderNotesAction } from "../actions";
import styles from "./OrderDetail.module.css";

export interface OrderNotesEditorProps {
  orderId: string;
  initialNotes: string | null;
}

export function OrderNotesEditor({
  orderId,
  initialNotes,
}: OrderNotesEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const normalizedInitial = initialNotes ?? "";
  const [notes, setNotes] = useState(normalizedInitial);
  const [savedBaseline, setSavedBaseline] = useState(normalizedInitial);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const isDirty = notes.trim() !== savedBaseline.trim();

  const handleSave = () => {
    setFieldError(undefined);
    startTransition(async () => {
      const result = await updateOrderNotesAction({
        orderId,
        adminNotes: notes,
      });

      if (!result.ok) {
        const msg = result.fieldErrors?.adminNotes?.[0] ?? result.message;
        setFieldError(msg);
        toast.error("Không thể lưu ghi chú nội bộ", msg);
        return;
      }

      const nextBaseline = result.data.adminNotes ?? "";
      setNotes(nextBaseline);
      setSavedBaseline(nextBaseline);
      toast.success(result.message ?? "Đã lưu ghi chú nội bộ.");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Ghi chú nội bộ (Admin)</CardTitle>
          <CardDescription>Theo dõi vận hành và phối hợp xưởng in</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <div className={styles.internalNotice}>
          <Lock size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Chỉ hiển thị nội bộ cho quản trị viên — khách hàng không nhìn thấy ghi chú này.
          </span>
        </div>

        <Textarea
          label="Nội dung ghi chú nội bộ"
          placeholder="Ví dụ: Đã gửi file qua xưởng A lúc 14:00, lưu ý đóng gói chống ẩm..."
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            if (fieldError) setFieldError(undefined);
          }}
          error={fieldError}
          disabled={isPending}
          rows={4}
        />

        <div className={styles.notesFooter}>
          <Button
            variant="tonal"
            size="sm"
            leftIcon={<Save size={14} />}
            loading={isPending}
            disabled={!isDirty || isPending}
            onClick={handleSave}
          >
            Lưu ghi chú nội bộ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
