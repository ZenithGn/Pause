export default function HomePage() {
  return (
    <section
      style={{
        minHeight: "75vh",
        display: "grid",
        placeItems: "center",
        padding: "7rem 1.5rem 4rem",
        background: "linear-gradient(160deg, #630D11 0%, #3B0609 100%)",
        color: "#FFFFFF",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "620px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display-family)",
            fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
            marginBottom: "1rem",
          }}
        >
          Pause — Dừng lại, lưu giữ, hiện thực hóa kỷ niệm
        </h1>
        <p style={{ color: "#EAE6E1" }}>
          Trang chủ đang được hoàn thiện.
        </p>
      </div>
    </section>
  );
}
