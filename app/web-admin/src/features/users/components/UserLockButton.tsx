"use client";

import React, { useState, useTransition } from "react";
import { Lock, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog, Textarea, useToast } from "@/components/ui";
import type { UserRole } from "@/types/admin";
import { setUserLockAction } from "../actions";
import { LOCK_REASON_MAX_LENGTH } from "../schemas";
import styles from "./UserLockButton.module.css";

export interface UserLockButtonProps {
  userId: string;
  displayName: string;
  role: UserRole;
  isLocked: boolean;
  lockedReason?: string | null;
  currentAdminId: string;
  compact?: boolean;
}

export function UserLockButton({
  userId,
  displayName,
  role,
  isLocked,
  lockedReason,
  currentAdminId,
  compact = false,
}: UserLockButtonProps) {
  const router = useRouter();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();

  const isSelf = userId === currentAdminId;
  const isTargetAdmin = role === "admin";
  const isDisabled = isSelf || isTargetAdmin;

  const disabledReason = isSelf
    ? "Không thể tự khóa tài khoản của bạn."
    : isTargetAdmin
      ? "Không thể khóa tài khoản quản trị viên."
      : undefined;

  const targetLockState = !isLocked;
  const busy = isSubmitting || isRefreshing;

  const openDialog = () => {
    if (isDisabled) return;
    setReason("");
    setReasonError(undefined);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSubmitting) return;
    setDialogOpen(false);
    setReasonError(undefined);
  };

  const handleConfirm = async () => {
    const trimmedReason = reason.trim();
    if (targetLockState && !trimmedReason) {
      setReasonError("Vui lòng nhập lý do khóa.");
      return;
    }

    setIsSubmitting(true);
    setReasonError(undefined);

    try {
      const result = await setUserLockAction({
        userId,
        locked: targetLockState,
        reason: targetLockState ? trimmedReason : null,
      });

      if (!result.ok) {
        const fieldErr = result.fieldErrors?.reason?.[0];
        if (fieldErr) {
          setReasonError(fieldErr);
        }
        toast.error("Không thể cập nhật tài khoản", result.message);
        return;
      }

      setDialogOpen(false);
      setReason("");
      toast.success(
        targetLockState ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản",
        result.message,
      );

      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error(
        "Không thể cập nhật tài khoản",
        "Đã xảy ra lỗi kết nối. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDisabled && disabledReason) {
    return (
      <span
        className={`${styles.tooltipWrap} ${compact ? styles.tooltipLeft : styles.tooltipBelow}`}
        title={disabledReason}
        data-tooltip={disabledReason}
      >
        <Button
          variant="outlined"
          size={compact ? "sm" : "md"}
          disabled
          leftIcon={<Lock size={compact ? 14 : 16} />}
          aria-label={disabledReason}
        >
          Khóa
        </Button>
      </span>
    );
  }

  return (
    <>
      <Button
        variant={isLocked ? "tonal" : "danger"}
        size={compact ? "sm" : "md"}
        disabled={busy}
        leftIcon={
          isLocked ? (
            <Unlock size={compact ? 14 : 16} />
          ) : (
            <Lock size={compact ? 14 : 16} />
          )
        }
        onClick={openDialog}
      >
        {isLocked ? "Mở khóa" : "Khóa"}
      </Button>

      <ConfirmDialog
        open={dialogOpen}
        onClose={closeDialog}
        onConfirm={handleConfirm}
        loading={isSubmitting}
        variant={targetLockState ? "danger" : "primary"}
        title={
          targetLockState
            ? "Khóa tài khoản người dùng"
            : "Mở khóa tài khoản người dùng"
        }
        description={
          targetLockState
            ? `Tài khoản "${displayName}" sẽ bị ngắt phiên đăng nhập và không thể truy cập ứng dụng Pause.`
            : `Tài khoản "${displayName}" sẽ được khôi phục quyền đăng nhập và sử dụng bình thường.`
        }
        confirmLabel={targetLockState ? "Xác nhận khóa" : "Xác nhận mở khóa"}
        cancelLabel="Hủy"
      >
        <div className={styles.dialogBody}>
          {targetLockState ? (
            <Textarea
              label="Lý do khóa tài khoản"
              required
              placeholder="Nhập lý do khóa (ví dụ: Vi phạm điều khoản cộng đồng, hành vi spam...)"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError(undefined);
              }}
              error={reasonError}
              maxLength={LOCK_REASON_MAX_LENGTH}
              disabled={isSubmitting}
              helperText={`Tối đa ${LOCK_REASON_MAX_LENGTH} ký tự (còn ${LOCK_REASON_MAX_LENGTH - reason.length}). Lý do sẽ được lưu vào nhật ký quản trị và gửi thông báo cho người dùng.`}
            />
          ) : lockedReason ? (
            <div className={styles.previousReasonBox}>
              <span className={styles.previousReasonLabel}>Lý do khóa trước đó: </span>
              <span>{lockedReason}</span>
            </div>
          ) : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
