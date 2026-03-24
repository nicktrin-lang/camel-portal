export default function Home() {
  return (
    <main style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      fontFamily: "system-ui",
      background: "#003768",
      color: "white",
      textAlign: "center",
      padding: "20px"
    }}>
      <h1 style={{ fontSize: "42px", marginBottom: "20px" }}>
        Camel Global
      </h1>

      <p style={{ fontSize: "20px", opacity: 0.9 }}>
        Customer platform coming soon.
      </p>
    </main>
  );
}