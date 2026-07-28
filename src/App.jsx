function ErrorButton() {
  return (
    <button
      onClick={() => {
        throw new Error("This is your first error!");
      }}
    >
      Break the world
    </button>
  );
}

export default function App() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Sentry test</h1>
      <p>Click the button to send a test error to Sentry.</p>
      <ErrorButton />
    </main>
  );
}
