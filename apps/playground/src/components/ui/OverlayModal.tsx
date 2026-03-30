import React from "react";

type Props = {
  title: string;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
};

export function OverlayModal({
  title,
  onClose,
  width = 720,
  children,
}: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 23, 0.54)",
        display: "grid",
        placeItems: "center",
        zIndex: 120,
        padding: 24,
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(100%, 100%)",
          maxWidth: width,
          maxHeight: "calc(100vh - 48px)",
          overflow: "auto",
          borderRadius: 20,
          background: "#0f172a",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          boxShadow: "0 28px 56px rgba(2, 6, 23, 0.38)",
          color: "#e2e8f0",
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
          }}
        >
          <strong
            style={{
              fontSize: 15,
              letterSpacing: "0.01em",
            }}
          >
            {title}
          </strong>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 0,
              background: "rgba(148, 163, 184, 0.14)",
              color: "#e2e8f0",
              width: 32,
              height: 32,
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: 20,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
