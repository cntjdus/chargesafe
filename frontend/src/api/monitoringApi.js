import { getMockMonitoringData } from "../data/mockMonitoringData";

const USE_MOCK_DATA = true;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export const getMonitoringData = async ({
  deviceId,
  range,
}) => {
  if (USE_MOCK_DATA) {
    await wait(250);

    return {
      deviceId: deviceId ?? "CS-0042",
      range,
      updatedAt: new Date().toISOString(),
      measurements: getMockMonitoringData(range),
    };
  }

  const query = new URLSearchParams({
    range,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/devices/${deviceId}/monitoring/?${query.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("모니터링 데이터를 불러오지 못했습니다.");
  }

  return response.json();
};