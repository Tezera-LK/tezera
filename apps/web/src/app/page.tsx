import Weather from "./pages/WeatherForecast";

export default function Home() {
  return (
    <main style={{ maxWidth: 560, margin: "48px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1>Tezera </h1>
      <Weather />
    </main>
  );
}
