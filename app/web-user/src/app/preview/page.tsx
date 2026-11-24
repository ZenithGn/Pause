export default function PreviewPage() {
  return (
    <section
      style={{
        minHeight: "75vh",
        display: "grid",
        placeItems: "center",
        padding: "7rem 1.5rem 4rem",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "560px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display-family)",
            fontSize: "2.25rem",
            marginBottom: "0.75rem",
          }}
        >
          Studio Preview Mẫu In 3D
        </h1>
        <p style={{ color: "var(--color-ink-muted)" }}>
          Không gian thử mẫu Photobooth 3D đang được chuẩn bị.
        </p>
      </div>
    </section>
  );
}
