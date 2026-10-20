export const dynamic = "force-dynamic";

const FORECAST_URL = 
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=6.9271&longitude=79.8612" +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=Asia%2FColombo&forecast_days=7";

type Forecast = {
    daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
    };
};

export default async function WeatherPage() {
    const res = await fetch(FORECAST_URL, { cache: "no-store" });
    if (!res.ok) return <p>Could not load the forecast (HTTP {res.status})</p>;
    const { daily } = (await res.json()) as Forecast;

    return (
        <main style={{ maxWidth: 560, margin: "48px auto", padding: "0 24px", fontFamily: "system-ui" }}>
            <h1>Colombo : 7 days (upcoming)</h1>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th align="left">Day</th>
                        <th align="right">Min Temp</th>
                        <th align="right">Max Temp</th>
                        <th align="right">Precipitation</th>
                    </tr>
                </thead>
                <tbody>
                    {daily.time.map((day, i) => (
                    <tr key={day}>
                        <td>
                            {new Date(day).toLocaleDateString("en-LK", {
                                weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Colombo",
                            })}
                        </td>
                        <td align="right">{daily.temperature_2m_min[i]}°C </td>
                        <td align="right">{daily.temperature_2m_max[i]}°C </td>
                        <td align="right">{daily.precipitation_probability_max[i]}% </td>
                    </tr>
                    ))}
                </tbody>
            </table>
        </main>
    )
}