import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 560, margin: "48px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1>Tezera</h1>
      <ul>
        <li><Link href="/weatherforecast">Weather Forecast</Link></li>
        <li><Link href="/status">Status</Link></li>
      </ul>
    </main>
  );
}
