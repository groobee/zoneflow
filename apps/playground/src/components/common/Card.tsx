import React from "react";

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--pg-card-border, rgba(148, 163, 184, 0.16))",
  borderRadius: 10,
  padding: 10,
  marginBottom: 10,
  background: "var(--pg-card-bg, rgba(15, 23, 42, 0.72))",
  color: "var(--pg-panel-text, inherit)",
};

export function Card({
  children,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      style={{
        ...cardStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
