import type {
  BackgroundComponent,
  BackgroundComponentProps,
} from "@zoneflow/react";

export type WeatherBackgroundId =
  | "off"
  | "sunny"
  | "cloudy"
  | "foggy"
  | "rainy";

export const weatherBackgroundOptions: ReadonlyArray<{
  id: WeatherBackgroundId;
  label: string;
}> = [
  { id: "off", label: "Off" },
  { id: "sunny", label: "Sunny" },
  { id: "cloudy", label: "Cloudy" },
  { id: "foggy", label: "Foggy" },
  { id: "rainy", label: "Rainy" },
];

type ActiveWeather = Exclude<WeatherBackgroundId, "off">;

const GRADIENTS: Record<ActiveWeather, string> = {
  sunny: "linear-gradient(180deg, #fff8e1 0%, #fff3cf 35%, #ffe7b8 70%, #ffd9a4 100%)",
  cloudy: "linear-gradient(180deg, #eef2f6 0%, #dfe6ed 55%, #d2dae3 100%)",
  foggy: "linear-gradient(180deg, #ecedef 0%, #e3e5e8 50%, #d9dbde 100%)",
  rainy: "linear-gradient(180deg, #c8d2dc 0%, #a8b6c4 55%, #8e9eae 100%)",
};

const ACCENTS: Record<ActiveWeather, string | null> = {
  sunny:
    "radial-gradient(circle at 12% 18%, rgba(255, 218, 138, 0.55) 0%, rgba(255, 218, 138, 0) 36%)",
  cloudy:
    "radial-gradient(ellipse at 28% 38%, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0) 52%), radial-gradient(ellipse at 76% 62%, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0) 52%)",
  foggy:
    "radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.46) 0%, rgba(255, 255, 255, 0) 72%)",
  rainy: null,
};

export function makeWeatherBackground(
  weather: WeatherBackgroundId
): BackgroundComponent | undefined {
  if (weather === "off") return undefined;

  function WeatherBackground({ mount }: BackgroundComponentProps) {
    const { sceneBounds } = mount.context;
    const accent = ACCENTS[weather as ActiveWeather];
    const backgroundImage = accent
      ? `${accent}, ${GRADIENTS[weather as ActiveWeather]}`
      : GRADIENTS[weather as ActiveWeather];

    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: sceneBounds.width,
          height: sceneBounds.height,
          backgroundImage,
        }}
      />
    );
  }

  WeatherBackground.displayName = `WeatherBackground(${weather})`;
  return WeatherBackground;
}
