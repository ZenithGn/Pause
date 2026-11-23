import React from "react";
import styles from "./Button.module.css";

export type IconButtonVariant = "standard" | "tonal" | "outlined" | "danger";
export type IconButtonSize = "sm" | "md";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  standard: styles.iconStandard,
  tonal: styles.iconTonal,
  outlined: styles.iconOutlined,
  danger: styles.iconDanger,
};

export function IconButton({
  variant = "standard",
  size = "md",
  className = "",
  type = "button",
  children,
  ...props
}: IconButtonProps) {
  const classes = [
    styles.iconButton,
    VARIANT_CLASS[variant],
    size === "sm" ? styles.iconSm : styles.iconMd,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
