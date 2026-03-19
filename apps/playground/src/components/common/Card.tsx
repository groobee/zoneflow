import React from "react";

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.16)",
  borderRadius: 10,
  padding: 10,
  marginBottom: 10,
  background: "rgba(15, 23, 42, 0.72)",
};

export function Card({ children }: { children: React.ReactNode }) {
  return <div style={cardStyle}>{children}</div>;
}