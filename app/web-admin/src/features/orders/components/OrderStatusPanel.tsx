"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  StatusChip,
  Textarea,
  useToast,
} from "@/components/ui";
import type { OrderStatus } from "@/types/admin";
import { updateOrderStatusAction } from "../actions";
import {
  getAllowedNextStatuses,
  ORDER_STATUS_LABELS,
  ORDER_TRANSITION_ACTION_LABELS,
  ORDER_TRANSITION_DESCRIPTIONS,
  requiresNote,
} from "../status-machine";
import styles from "./OrderDetail.module.css";

export interface OrderStatusPanelProps {
  orderId: string;
  shortCode: string;
  currentStatus: OrderStatus;
}

export function OrderStatusPanel({
  orderId,
  shortCode,
  currentStatus,
}: OrderStatusPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | undefined>();
  const [pendingCancelOpen, setPendingCancelOpen] = useState(false);

  const allowedNextStatuses = getAllowedNextStatuses(currentStatus);

  const executeTransition = (nextStatus: OrderStatus, transitionNote: string) => {
    setNoteError(undefined);
    startTransition(async () => {
      const result = await updateOrderStatusAction({
        orderId,
        newStatus: nextStatus,
        note: transitionNote,
      });

      if (!result.ok) {
        const msg = result.fieldErrors?.note?.[0] ?? result.message;
        if (result.fieldErrors?.note) {
          setNoteError(msg);
        }
        toast.error("Cập nhật trạng thái thất bại", msg);
        return;
      }

      setNote("");
      setPendingCancelOpen(false);
      toast.success(
        result.message ?? `Đã chuyển sang trạng thái ${ORDER_STATUS_LABELS[nextStatus]}.`,
      );
      router.refresh();
    });
  };

  const handleActionClick = (nextStatus: OrderStatus) => {
    if (nextStatus === "cancelled") {
      setNoteError(undefined);
      setPendingCancelOpen(true);
      return;
    }

    executeTransition(nextStatus, note);
  };

  const handleConfirmCancel = () => {
    const trimmed = note.trim();
    if (!trimmed) {
      setNoteError("Vui lòng nhập lý do hủy đơn.");
      return;
    }
    executeTransition("cancelled", trimmed);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Cập nhật trạng thái</CardTitle>
          <CardDescription>
            Chuyển bước xử lý theo quy trình in ấn và thông báo cho khách hàng
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <div className={styles.statusPanelBody}>
          <div className={styles.currentStatusRow}>
            <span className={styles.metaLabel}>Trạng thái hiện tại</span>
            <StatusChip status={currentStatus} size="md" />
          </div>

          {allowedNextStatuses.length === 0 ? (
            <p className={styles.terminalNotice}>
              Đơn hàng đang ở trạng thái cuối (
              <strong>{ORDER_STATUS_LABELS[currentStatus]}</strong>), không thể chuyển tiếp.
            </p>
          ) : (
            <>
              <Textarea
                label="Ghi chú chuyển trạng thái"
                placeholder={
                  allowedNextStatuses.some((status) => requiresNote(status))
                    ? "Nhập ghi chú (bắt buộc nhập lý do nếu hủy đơn hàng)..."
                    : "Nhập ghi chú cho bước này (tùy chọn)..."
                }
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  if (noteError) setNoteError(undefined);
                }}
                error={noteError}
                disabled={isPending}
                rows={3}
              />

              <div className={styles.transitionButtons}>
                {allowedNextStatuses.map((nextStatus) => {
                  const isCancel = nextStatus === "cancelled";
                  return (
                    <Button
                      key={nextStatus}
                      variant={isCancel ? "danger" : "primary"}
                      loading={isPending && !pendingCancelOpen}
                      disabled={isPending}
                      title={ORDER_TRANSITION_DESCRIPTIONS[nextStatus]}
                      onClick={() => handleActionClick(nextStatus)}
                    >
                      {ORDER_TRANSITION_ACTION_LABELS[nextStatus]}
                    </Button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={pendingCancelOpen}
        onClose={() => setPendingCancelOpen(false)}
        onConfirm={handleConfirmCancel}
        variant="danger"
        loading={isPending}
        confirmLabel="Xác nhận hủy đơn"
        cancelLabel="Đóng"
        title={`Hủy đơn hàng #${shortCode}?`}
        description="Khách hàng sẽ nhận được thông báo đơn hàng bị hủy. Thao tác này không thể hoàn tác."
      >
        <Textarea
          label="Lý do hủy đơn"
          required
          placeholder="Ví dụ: Khách hàng yêu cầu hủy, ảnh không đủ độ phân giải in..."
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            if (noteError) setNoteError(undefined);
          }}
          error={noteError}
          disabled={isPending}
          rows={3}
        />
      </ConfirmDialog>
    </Card>
  );
}
