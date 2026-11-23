"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Code2,
  Eye,
  LayoutTemplate,
  Plus,
  Smartphone,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button, StatusChip, Switch, TextField, useToast } from "@/components/ui";
import type { LayoutConfig, LayoutSlot, LayoutText } from "@/types/admin";
import {
  TEMPLATE_PRESETS,
  buildLayoutFromPreset,
  clampSlotToCanvas,
  reindexSlots,
  snapToGrid,
  validateLayoutJsonWithLines,
  type JsonValidationLineError,
  type TemplatePresetId,
} from "../layout";
import { layoutConfigSchema } from "../schemas";
import { MobileTemplatePreview } from "./MobileTemplatePreview";
import styles from "./VisualLayoutEditor.module.css";

type EditorMode = "visual" | "json" | "mobile";

type DragState =
  | {
      kind: "move-slot" | "resize-slot";
      slotIndex: number;
      startClientX: number;
      startClientY: number;
      initialSlot: LayoutSlot;
    }
  | {
      kind: "move-text";
      textIndex: number;
      startClientX: number;
      startClientY: number;
      initialText: LayoutText;
    };

export interface VisualLayoutEditorProps {
  value: LayoutConfig;
  onChange: (nextLayout: LayoutConfig) => void;
  templateName?: string;
  onJsonErrorChange?: (hasError: boolean, errors: JsonValidationLineError[]) => void;
  error?: string;
}

function parseIntOrFallback(raw: string, fallback: number): number {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function VisualLayoutEditor({
  value,
  onChange,
  templateName,
  onJsonErrorChange,
  error,
}: VisualLayoutEditorProps) {
  const toast = useToast();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const jsonTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [mode, setMode] = useState<EditorMode>("visual");
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(0);
  const [selectedTextIdx, setSelectedTextIdx] = useState<number | null>(
    value.texts.length > 0 ? 0 : null,
  );
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const [jsonDraft, setJsonDraft] = useState<string>(() =>
    JSON.stringify(value, null, 2),
  );
  const [jsonErrors, setJsonErrors] = useState<JsonValidationLineError[]>([]);

  useEffect(() => {
    if (mode === "json" && jsonErrors.length === 0) {
      try {
        const parsedDraft = JSON.parse(jsonDraft) as { frame_url?: string | null };
        if ((parsedDraft.frame_url ?? null) !== (value.frame_url ?? null)) {
          setJsonDraft(JSON.stringify(value, null, 2));
        }
      } catch {
        // Keep user's current JSON draft untouched while invalid.
      }
    }
  }, [mode, value, jsonDraft, jsonErrors.length]);

  const safeWidth = Math.max(100, value.width || 1200);
  const safeHeight = Math.max(100, value.height || 1800);

  const schemaCheck = useMemo(() => layoutConfigSchema.safeParse(value), [value]);
  const visualErrors = useMemo(
    () =>
      schemaCheck.success
        ? []
        : schemaCheck.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
    [schemaCheck],
  );

  const activeSlot = value.slots[selectedSlotIdx] ?? value.slots[0] ?? null;
  const activeText =
    selectedTextIdx !== null ? value.texts[selectedTextIdx] ?? null : null;

  const updateLayout = (next: LayoutConfig) => {
    onChange(next);
  };

  const handleApplyPreset = (presetId: TemplatePresetId) => {
    const built = buildLayoutFromPreset(presetId, value.frame_url);
    updateLayout(built);
    setSelectedSlotIdx(0);
    setSelectedTextIdx(built.texts.length > 0 ? 0 : null);
    setJsonDraft(JSON.stringify(built, null, 2));
    setJsonErrors([]);
    onJsonErrorChange?.(false, []);
    toast.info("Đã áp dụng bố cục mẫu");
  };

  const handleSwitchMode = (nextMode: EditorMode) => {
    if (nextMode === mode) return;

    if (mode === "json" && jsonErrors.length > 0) {
      toast.error(
        "JSON chưa hợp lệ",
        "Vui lòng sửa các lỗi cú pháp / schema trước khi chuyển chế độ.",
      );
      return;
    }

    if (nextMode === "json") {
      setJsonDraft(JSON.stringify(value, null, 2));
      setJsonErrors([]);
      onJsonErrorChange?.(false, []);
    }

    setMode(nextMode);
  };

  const handleJsonChange = (nextText: string) => {
    setJsonDraft(nextText);
    const result = validateLayoutJsonWithLines(nextText);
    if (result.valid) {
      setJsonErrors([]);
      onJsonErrorChange?.(false, []);
      updateLayout(result.data);
    } else {
      setJsonErrors(result.errors);
      onJsonErrorChange?.(true, result.errors);
    }
  };

  const handleFormatJson = () => {
    const result = validateLayoutJsonWithLines(jsonDraft);
    if (!result.valid) {
      setJsonErrors(result.errors);
      onJsonErrorChange?.(true, result.errors);
      toast.error("Không thể định dạng", "Vui lòng sửa lỗi JSON trước khi định dạng.");
      return;
    }
    const pretty = JSON.stringify(result.data, null, 2);
    setJsonDraft(pretty);
    setJsonErrors([]);
    onJsonErrorChange?.(false, []);
    updateLayout(result.data);
  };

  const handleRestoreValidJson = () => {
    setJsonDraft(JSON.stringify(value, null, 2));
    setJsonErrors([]);
    onJsonErrorChange?.(false, []);
  };

  const handleCanvasDimensionChange = (
    field: "width" | "height",
    raw: string,
  ) => {
    const nextDim = Math.max(100, Math.min(10000, parseIntOrFallback(raw, value[field])));
    const nextW = field === "width" ? nextDim : safeWidth;
    const nextH = field === "height" ? nextDim : safeHeight;

    const clampedSlots = value.slots.map((slot) =>
      clampSlotToCanvas(slot, nextW, nextH),
    );
    const clampedTexts = value.texts.map((t) => ({
      ...t,
      x: Math.min(nextW, Math.max(0, t.x)),
      y: Math.min(nextH, Math.max(0, t.y)),
    }));

    updateLayout({
      ...value,
      [field]: nextDim,
      slots: clampedSlots,
      texts: clampedTexts,
    });
  };

  const handleUpdateSlot = (
    slotPos: number,
    patch: Partial<Omit<LayoutSlot, "index">>,
  ) => {
    const nextSlots = value.slots.map((slot, idx) =>
      idx === slotPos ? { ...slot, ...patch } : slot,
    );
    updateLayout({ ...value, slots: nextSlots });
  };

  const handleAddSlot = () => {
    if (value.slots.length >= 20) {
      toast.warning("Đã đạt giới hạn", "Mỗi template hỗ trợ tối đa 20 slot.");
      return;
    }
    const defaultW = Math.min(480, Math.max(120, Math.round(safeWidth * 0.45)));
    const defaultH = Math.min(360, Math.max(120, Math.round(safeHeight * 0.22)));
    const offsetStep = (value.slots.length % 5) * 40;
    const newSlot = clampSlotToCanvas(
      {
        index: value.slots.length,
        x: snapToGrid(60 + offsetStep, 10),
        y: snapToGrid(60 + offsetStep, 10),
        width: snapToGrid(defaultW, 10),
        height: snapToGrid(defaultH, 10),
      },
      safeWidth,
      safeHeight,
    );

    const nextSlots = reindexSlots([...value.slots, newSlot]);
    updateLayout({ ...value, slots: nextSlots });
    setSelectedSlotIdx(nextSlots.length - 1);
  };

  const handleRemoveSlot = (slotPos: number) => {
    if (value.slots.length <= 1) {
      toast.warning("Không thể xóa", "Template phải có ít nhất 1 slot ảnh.");
      return;
    }
    const nextSlots = reindexSlots(value.slots.filter((_, idx) => idx !== slotPos));
    updateLayout({ ...value, slots: nextSlots });
    setSelectedSlotIdx(Math.max(0, Math.min(slotPos, nextSlots.length - 1)));
  };

  const handleMoveSlotOrder = (slotPos: number, direction: -1 | 1) => {
    const targetPos = slotPos + direction;
    if (targetPos < 0 || targetPos >= value.slots.length) return;
    const next = [...value.slots];
    const [moved] = next.splice(slotPos, 1);
    next.splice(targetPos, 0, moved);
    updateLayout({ ...value, slots: reindexSlots(next) });
    setSelectedSlotIdx(targetPos);
  };

  const handleAddText = () => {
    if (value.texts.length >= 20) {
      toast.warning("Đã đạt giới hạn", "Mỗi template hỗ trợ tối đa 20 dòng chữ.");
      return;
    }
    const newText: LayoutText = {
      content: "Pause Studio",
      x: Math.round(safeWidth / 2),
      y: Math.max(60, safeHeight - 100),
      font_size: 44,
      color: "#111111",
    };
    const nextTexts = [...value.texts, newText];
    updateLayout({ ...value, texts: nextTexts });
    setSelectedTextIdx(nextTexts.length - 1);
  };

  const handleUpdateText = (textIdx: number, patch: Partial<LayoutText>) => {
    const nextTexts = value.texts.map((item, idx) =>
      idx === textIdx ? { ...item, ...patch } : item,
    );
    updateLayout({ ...value, texts: nextTexts });
  };

  const handleRemoveText = (textIdx: number) => {
    const nextTexts = value.texts.filter((_, idx) => idx !== textIdx);
    updateLayout({ ...value, texts: nextTexts });
    setSelectedTextIdx(nextTexts.length > 0 ? Math.max(0, textIdx - 1) : null);
  };

  const handleSvgPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const scaleX = safeWidth / rect.width;
    const scaleY = safeHeight / rect.height;
    const dx = (event.clientX - dragState.startClientX) * scaleX;
    const dy = (event.clientY - dragState.startClientY) * scaleY;

    if (dragState.kind === "move-slot") {
      const nextX = snapEnabled
        ? snapToGrid(dragState.initialSlot.x + dx, 10)
        : Math.round(dragState.initialSlot.x + dx);
      const nextY = snapEnabled
        ? snapToGrid(dragState.initialSlot.y + dy, 10)
        : Math.round(dragState.initialSlot.y + dy);

      const clamped = clampSlotToCanvas(
        { ...dragState.initialSlot, x: nextX, y: nextY },
        safeWidth,
        safeHeight,
      );
      handleUpdateSlot(dragState.slotIndex, { x: clamped.x, y: clamped.y });
      return;
    }

    if (dragState.kind === "resize-slot") {
      const rawW = dragState.initialSlot.width + dx;
      const rawH = dragState.initialSlot.height + dy;
      const nextW = snapEnabled ? snapToGrid(rawW, 10) : Math.round(rawW);
      const nextH = snapEnabled ? snapToGrid(rawH, 10) : Math.round(rawH);

      const clampedWidth = Math.min(
        safeWidth - dragState.initialSlot.x,
        Math.max(40, nextW),
      );
      const clampedHeight = Math.min(
        safeHeight - dragState.initialSlot.y,
        Math.max(40, nextH),
      );

      handleUpdateSlot(dragState.slotIndex, {
        width: clampedWidth,
        height: clampedHeight,
      });
      return;
    }

    if (dragState.kind === "move-text") {
      const rawX = dragState.initialText.x + dx;
      const rawY = dragState.initialText.y + dy;
      const nextX = snapEnabled ? snapToGrid(rawX, 10) : Math.round(rawX);
      const nextY = snapEnabled ? snapToGrid(rawY, 10) : Math.round(rawY);

      handleUpdateText(dragState.textIndex, {
        x: Math.min(safeWidth, Math.max(0, nextX)),
        y: Math.min(safeHeight, Math.max(0, nextY)),
      });
    }
  };

  const endDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragState) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setDragState(null);
    }
  };

  const errorLinesSet = useMemo(() => {
    const set = new Set<number>();
    for (const item of jsonErrors) {
      if (item.line !== null) set.add(item.line);
    }
    return set;
  }, [jsonErrors]);

  const jsonLineCount = useMemo(
    () => Math.max(1, jsonDraft.split(/\r?\n/).length),
    [jsonDraft],
  );

  const handleSize = Math.max(20, Math.round(Math.min(safeWidth, safeHeight) * 0.028));

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.tabGroup} role="tablist" aria-label="Chế độ chỉnh sửa bố cục">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "visual"}
            className={`${styles.tabBtn} ${mode === "visual" ? styles.tabBtnActive : ""}`}
            onClick={() => handleSwitchMode("visual")}
          >
            <LayoutTemplate size={15} aria-hidden="true" />
            <span>Trình chỉnh trực quan</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "json"}
            className={`${styles.tabBtn} ${mode === "json" ? styles.tabBtnActive : ""}`}
            onClick={() => handleSwitchMode("json")}
          >
            <Code2 size={15} aria-hidden="true" />
            <span>JSON nâng cao</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "mobile"}
            className={`${styles.tabBtn} ${mode === "mobile" ? styles.tabBtnActive : ""}`}
            onClick={() => handleSwitchMode("mobile")}
          >
            <Smartphone size={15} aria-hidden="true" />
            <span>Xem thử như trên Mobile</span>
          </button>
        </div>

        <StatusChip
          tone="primary"
          dot={false}
          label={`slot_count = ${value.slots.length}`}
        />
      </div>

      <div className={styles.presetBar} aria-label="Bố cục mẫu nhanh">
        <span className={styles.presetLabel}>Preset nhanh:</span>
        {TEMPLATE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant="outlined"
            size="sm"
            leftIcon={<Wand2 size={14} />}
            onClick={() => handleApplyPreset(preset.id)}
            title={preset.description}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {error ? (
        <div className={styles.validationBox} role="alert">
          <p className={styles.validationTitle}>
            <AlertCircle size={15} aria-hidden="true" />
            <span>{error}</span>
          </p>
        </div>
      ) : null}

      {mode === "visual" ? (
        <div className={styles.workspace}>
          <div className={styles.canvasStage}>
            <div className={styles.canvasHeader}>
              <span className={styles.canvasTitle}>Canvas tương tác</span>
              <span className={styles.canvasMeta}>
                {safeWidth} × {safeHeight} px · {value.slots.length} slot
              </span>
            </div>

            <div className={styles.svgViewport}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${safeWidth} ${safeHeight}`}
                className={styles.svgCanvas}
                onPointerMove={handleSvgPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                aria-label="Khung thiết kế bố cục template"
              >
                <rect
                  x={0}
                  y={0}
                  width={safeWidth}
                  height={safeHeight}
                  fill={value.background_color || "#FFFFFF"}
                />

                {snapEnabled ? (
                  <g opacity={0.18} pointerEvents="none">
                    {Array.from(
                      { length: Math.floor(safeWidth / 100) },
                      (_, i) => (i + 1) * 100,
                    ).map((gx) => (
                      <line
                        key={`gx-${gx}`}
                        x1={gx}
                        y1={0}
                        x2={gx}
                        y2={safeHeight}
                        stroke="#630D11"
                        strokeWidth={1}
                        strokeDasharray="6 6"
                      />
                    ))}
                    {Array.from(
                      { length: Math.floor(safeHeight / 100) },
                      (_, i) => (i + 1) * 100,
                    ).map((gy) => (
                      <line
                        key={`gy-${gy}`}
                        x1={0}
                        y1={gy}
                        x2={safeWidth}
                        y2={gy}
                        stroke="#630D11"
                        strokeWidth={1}
                        strokeDasharray="6 6"
                      />
                    ))}
                  </g>
                ) : null}

                {value.slots.map((slot, idx) => {
                  const isSelected = idx === selectedSlotIdx;
                  const outOfBounds =
                    slot.x < 0 ||
                    slot.y < 0 ||
                    slot.x + slot.width > safeWidth ||
                    slot.y + slot.height > safeHeight;

                  return (
                    <g
                      key={`canvas-slot-${idx}`}
                      style={{ cursor: "move" }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setSelectedSlotIdx(idx);
                        setSelectedTextIdx(null);
                        svgRef.current?.setPointerCapture(event.pointerId);
                        setDragState({
                          kind: "move-slot",
                          slotIndex: idx,
                          startClientX: event.clientX,
                          startClientY: event.clientY,
                          initialSlot: { ...slot },
                        });
                      }}
                    >
                      <rect
                        x={slot.x}
                        y={slot.y}
                        width={Math.max(1, slot.width)}
                        height={Math.max(1, slot.height)}
                        fill={
                          outOfBounds
                            ? "rgba(179, 38, 30, 0.22)"
                            : isSelected
                              ? "rgba(99, 13, 17, 0.16)"
                              : "rgba(92, 64, 51, 0.12)"
                        }
                        stroke={
                          outOfBounds
                            ? "#B3261E"
                            : isSelected
                              ? "#630D11"
                              : "#7A746E"
                        }
                        strokeWidth={isSelected ? 6 : 3}
                      />
                      <text
                        x={slot.x + slot.width / 2}
                        y={slot.y + slot.height / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={outOfBounds ? "#B3261E" : "#111111"}
                        fontSize={Math.max(24, Math.round(Math.min(slot.width, slot.height) * 0.12))}
                        fontWeight={700}
                        pointerEvents="none"
                      >
                        #{slot.index + 1}
                      </text>
                      <text
                        x={slot.x + slot.width / 2}
                        y={
                          slot.y +
                          slot.height / 2 +
                          Math.max(26, Math.round(Math.min(slot.width, slot.height) * 0.13))
                        }
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#595552"
                        fontSize={Math.max(18, Math.round(Math.min(slot.width, slot.height) * 0.065))}
                        pointerEvents="none"
                      >
                        {slot.width}×{slot.height}
                      </text>

                      {isSelected ? (
                        <rect
                          x={slot.x + slot.width - handleSize}
                          y={slot.y + slot.height - handleSize}
                          width={handleSize}
                          height={handleSize}
                          rx={4}
                          fill="#630D11"
                          stroke="#FFFFFF"
                          strokeWidth={3}
                          style={{ cursor: "nwse-resize" }}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            svgRef.current?.setPointerCapture(event.pointerId);
                            setDragState({
                              kind: "resize-slot",
                              slotIndex: idx,
                              startClientX: event.clientX,
                              startClientY: event.clientY,
                              initialSlot: { ...slot },
                            });
                          }}
                        />
                      ) : null}
                    </g>
                  );
                })}

                {value.frame_url ? (
                  <image
                    href={value.frame_url}
                    x={0}
                    y={0}
                    width={safeWidth}
                    height={safeHeight}
                    preserveAspectRatio="none"
                    opacity={0.85}
                    pointerEvents="none"
                  />
                ) : null}

                {value.texts.map((textItem, idx) => {
                  const isSelected = selectedTextIdx === idx;
                  return (
                    <g
                      key={`canvas-text-${idx}`}
                      style={{ cursor: "grab" }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setSelectedTextIdx(idx);
                        svgRef.current?.setPointerCapture(event.pointerId);
                        setDragState({
                          kind: "move-text",
                          textIndex: idx,
                          startClientX: event.clientX,
                          startClientY: event.clientY,
                          initialText: { ...textItem },
                        });
                      }}
                    >
                      <text
                        x={textItem.x}
                        y={textItem.y}
                        textAnchor="middle"
                        fill={textItem.color || "#111111"}
                        fontSize={textItem.font_size}
                        fontWeight={600}
                        textDecoration={isSelected ? "underline" : undefined}
                      >
                        {textItem.content}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className={styles.canvasHeader}>
              <p className={styles.canvasHint}>
                Kéo trực tiếp để di chuyển slot/chữ; kéo góc dưới-phải slot đang chọn để đổi kích thước.
              </p>
              <Switch
                checked={snapEnabled}
                onCheckedChange={setSnapEnabled}
                label="Snap lưới 10px"
              />
            </div>
          </div>

          <div className={styles.inspector}>
            {visualErrors.length > 0 ? (
              <div className={styles.validationBox} role="alert">
                <p className={styles.validationTitle}>
                  <AlertCircle size={15} aria-hidden="true" />
                  <span>Cấu hình bố cục cần điều chỉnh ({visualErrors.length} lỗi):</span>
                </p>
                <ul className={styles.validationList}>
                  {visualErrors.slice(0, 5).map((item, idx) => (
                    <li key={idx}>{item.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <section className={styles.section} aria-label="Thông số Canvas">
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>Kích thước Canvas &amp; Màu nền</h4>
              </div>
              <div className={styles.grid2}>
                <TextField
                  label="Chiều rộng (px)"
                  type="number"
                  min={100}
                  max={10000}
                  value={value.width}
                  onChange={(e) => handleCanvasDimensionChange("width", e.target.value)}
                />
                <TextField
                  label="Chiều cao (px)"
                  type="number"
                  min={100}
                  max={10000}
                  value={value.height}
                  onChange={(e) => handleCanvasDimensionChange("height", e.target.value)}
                />
              </div>

              <div className={styles.colorRow}>
                <input
                  type="color"
                  aria-label="Chọn màu nền canvas"
                  className={styles.colorSwatch}
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(value.background_color)
                      ? value.background_color
                      : "#FFFFFF"
                  }
                  onChange={(e) =>
                    updateLayout({
                      ...value,
                      background_color: e.target.value.toUpperCase(),
                    })
                  }
                />
                <TextField
                  label="Màu nền (#RRGGBB)"
                  value={value.background_color}
                  onChange={(e) =>
                    updateLayout({
                      ...value,
                      background_color: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="#FFFFFF"
                />
              </div>
            </section>

            <section className={styles.section} aria-label="Quản lý Slots">
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>
                  Khung ảnh / Slots ({value.slots.length})
                </h4>
                <Button
                  variant="tonal"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={handleAddSlot}
                >
                  Thêm slot
                </Button>
              </div>

              <div className={styles.chipList}>
                {value.slots.map((slot, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.itemChip} ${
                      selectedSlotIdx === idx ? styles.itemChipActive : ""
                    }`}
                    onClick={() => {
                      setSelectedSlotIdx(idx);
                      setSelectedTextIdx(null);
                    }}
                  >
                    <span>Slot #{slot.index + 1}</span>
                    <span style={{ opacity: 0.75 }}>
                      ({slot.width}×{slot.height})
                    </span>
                  </button>
                ))}
              </div>

              {activeSlot ? (
                <>
                  <div className={styles.grid4}>
                    <TextField
                      label="X (px)"
                      type="number"
                      min={0}
                      max={safeWidth}
                      value={activeSlot.x}
                      onChange={(e) =>
                        handleUpdateSlot(selectedSlotIdx, {
                          x: Math.max(0, parseIntOrFallback(e.target.value, activeSlot.x)),
                        })
                      }
                    />
                    <TextField
                      label="Y (px)"
                      type="number"
                      min={0}
                      max={safeHeight}
                      value={activeSlot.y}
                      onChange={(e) =>
                        handleUpdateSlot(selectedSlotIdx, {
                          y: Math.max(0, parseIntOrFallback(e.target.value, activeSlot.y)),
                        })
                      }
                    />
                    <TextField
                      label="Rộng (px)"
                      type="number"
                      min={1}
                      max={safeWidth}
                      value={activeSlot.width}
                      onChange={(e) =>
                        handleUpdateSlot(selectedSlotIdx, {
                          width: Math.max(
                            1,
                            parseIntOrFallback(e.target.value, activeSlot.width),
                          ),
                        })
                      }
                    />
                    <TextField
                      label="Cao (px)"
                      type="number"
                      min={1}
                      max={safeHeight}
                      value={activeSlot.height}
                      onChange={(e) =>
                        handleUpdateSlot(selectedSlotIdx, {
                          height: Math.max(
                            1,
                            parseIntOrFallback(e.target.value, activeSlot.height),
                          ),
                        })
                      }
                    />
                  </div>

                  <div className={styles.itemActions}>
                    <div className={styles.orderBtns}>
                      <Button
                        variant="outlined"
                        size="sm"
                        disabled={selectedSlotIdx <= 0}
                        leftIcon={<ArrowUp size={13} />}
                        onClick={() => handleMoveSlotOrder(selectedSlotIdx, -1)}
                      >
                        Đưa lên
                      </Button>
                      <Button
                        variant="outlined"
                        size="sm"
                        disabled={selectedSlotIdx >= value.slots.length - 1}
                        leftIcon={<ArrowDown size={13} />}
                        onClick={() => handleMoveSlotOrder(selectedSlotIdx, 1)}
                      >
                        Đưa xuống
                      </Button>
                    </div>

                    <Button
                      variant="danger"
                      size="sm"
                      disabled={value.slots.length <= 1}
                      leftIcon={<Trash2 size={13} />}
                      onClick={() => handleRemoveSlot(selectedSlotIdx)}
                    >
                      Xóa slot #{activeSlot.index + 1}
                    </Button>
                  </div>
                </>
              ) : null}
            </section>

            <section className={styles.section} aria-label="Quản lý Chữ">
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>
                  Chữ trang trí / Texts ({value.texts.length})
                </h4>
                <Button
                  variant="tonal"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={handleAddText}
                >
                  Thêm chữ
                </Button>
              </div>

              {value.texts.length > 0 ? (
                <div className={styles.chipList}>
                  {value.texts.map((txt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`${styles.itemChip} ${
                        selectedTextIdx === idx ? styles.itemChipActive : ""
                      }`}
                      onClick={() => setSelectedTextIdx(idx)}
                    >
                      <span>{txt.content.slice(0, 18) || `Chữ #${idx + 1}`}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.canvasHint}>
                  Chưa có dòng chữ cố định nào trên mẫu. Bấm &ldquo;Thêm chữ&rdquo; nếu muốn đặt
                  tiêu đề hoặc logo.
                </p>
              )}

              {activeText && selectedTextIdx !== null ? (
                <>
                  <TextField
                    label="Nội dung chữ"
                    value={activeText.content}
                    maxLength={120}
                    onChange={(e) =>
                      handleUpdateText(selectedTextIdx, { content: e.target.value })
                    }
                    placeholder="PAUSE STUDIO"
                  />

                  <div className={styles.grid4}>
                    <TextField
                      label="X (px)"
                      type="number"
                      min={0}
                      max={safeWidth}
                      value={activeText.x}
                      onChange={(e) =>
                        handleUpdateText(selectedTextIdx, {
                          x: Math.max(0, parseIntOrFallback(e.target.value, activeText.x)),
                        })
                      }
                    />
                    <TextField
                      label="Y (px)"
                      type="number"
                      min={0}
                      max={safeHeight}
                      value={activeText.y}
                      onChange={(e) =>
                        handleUpdateText(selectedTextIdx, {
                          y: Math.max(0, parseIntOrFallback(e.target.value, activeText.y)),
                        })
                      }
                    />
                    <TextField
                      label="Cỡ chữ"
                      type="number"
                      min={8}
                      max={300}
                      value={activeText.font_size}
                      onChange={(e) =>
                        handleUpdateText(selectedTextIdx, {
                          font_size: Math.max(
                            8,
                            parseIntOrFallback(e.target.value, activeText.font_size),
                          ),
                        })
                      }
                    />
                    <div className={styles.colorRow}>
                      <input
                        type="color"
                        aria-label="Chọn màu chữ"
                        className={styles.colorSwatch}
                        value={
                          /^#[0-9A-Fa-f]{6}$/.test(activeText.color)
                            ? activeText.color
                            : "#111111"
                        }
                        onChange={(e) =>
                          handleUpdateText(selectedTextIdx, {
                            color: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    <TextField
                      label="Mã màu chữ (#RRGGBB)"
                      value={activeText.color}
                      onChange={(e) =>
                        handleUpdateText(selectedTextIdx, {
                          color: e.target.value.toUpperCase(),
                        })
                      }
                      fullWidth={false}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash2 size={13} />}
                      onClick={() => handleRemoveText(selectedTextIdx)}
                    >
                      Xóa chữ
                    </Button>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}

      {mode === "json" ? (
        <div className={styles.jsonPanel}>
          <div className={styles.jsonToolbar}>
            {jsonErrors.length === 0 ? (
              <span className={styles.jsonValidBanner}>
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>JSON hợp lệ · Tự động đồng bộ với trình trực quan</span>
              </span>
            ) : (
              <span
                style={{
                  color: "var(--md-sys-color-error)",
                  fontWeight: 600,
                  fontSize: "var(--text-body-sm)",
                }}
              >
                Phát hiện {jsonErrors.length} lỗi trong JSON
              </span>
            )}

            <div className={styles.orderBtns}>
              <Button variant="outlined" size="sm" onClick={handleFormatJson}>
                Định dạng JSON
              </Button>
              {jsonErrors.length > 0 ? (
                <Button variant="text" size="sm" onClick={handleRestoreValidJson}>
                  Khôi phục bản hợp lệ
                </Button>
              ) : null}
              <Button
                variant="tonal"
                size="sm"
                leftIcon={<Eye size={14} />}
                onClick={() => handleSwitchMode("mobile")}
              >
                Xem thử Mobile
              </Button>
            </div>
          </div>

          <div
            className={`${styles.jsonEditorShell} ${
              jsonErrors.length > 0 ? styles.jsonEditorShellError : ""
            }`}
          >
            <div ref={gutterRef} className={styles.lineGutter} aria-hidden="true">
              {Array.from({ length: jsonLineCount }, (_, idx) => {
                const lineNum = idx + 1;
                const hasLineErr = errorLinesSet.has(lineNum);
                return (
                  <span
                    key={lineNum}
                    className={`${styles.lineNumber} ${
                      hasLineErr ? styles.lineNumberError : ""
                    }`}
                  >
                    {lineNum}
                  </span>
                );
              })}
            </div>

            <textarea
              ref={jsonTextareaRef}
              aria-label="Trình chỉnh sửa JSON layout_config"
              className={styles.jsonTextarea}
              spellCheck={false}
              value={jsonDraft}
              onScroll={(e) => {
                if (gutterRef.current) {
                  gutterRef.current.scrollTop = e.currentTarget.scrollTop;
                }
              }}
              onChange={(e) => handleJsonChange(e.target.value)}
            />
          </div>

          {jsonErrors.length > 0 ? (
            <div className={styles.validationBox} role="alert">
              <p className={styles.validationTitle}>
                <AlertCircle size={15} aria-hidden="true" />
                <span>Chi tiết lỗi validate theo dòng:</span>
              </p>
              <ul className={styles.validationList}>
                {jsonErrors.map((err, idx) => (
                  <li key={idx}>
                    {err.line ? <strong>Dòng {err.line}</strong> : <strong>Lỗi</strong>} ·{" "}
                    <code>{err.path}</code>: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "mobile" ? (
        <MobileTemplatePreview layout={value} templateName={templateName} />
      ) : null}
    </div>
  );
}
