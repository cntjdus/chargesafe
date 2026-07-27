const round = (value, digits = 1) => {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
};

const padNumber = (value) => String(value).padStart(2, "0");

const formatTime = (date) =>
  `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;

const formatDay = (date) =>
  `${date.getMonth() + 1}/${date.getDate()}`;

const createRealtimeData = () => {
  const now = new Date();

  return Array.from({ length: 24 }, (_, index) => {
    const pointTime = new Date(
      now.getTime() - (23 - index) * 15 * 1000
    );

    return {
      timestamp: pointTime.toISOString(),
      label: formatTime(pointTime),
      temperature: round(
        31 +
          Math.sin(index * 0.7) * 1.2 +
          Math.cos(index * 0.25) * 0.7,
        1
      ),
      current: round(
        1.25 +
          Math.sin(index * 0.85) * 0.38 +
          Math.cos(index * 0.35) * 0.18,
        2
      ),
      voltage: round(
        12.8 +
          Math.sin(index * 0.45) * 0.5 +
          index * 0.015,
        2
      ),
    };
  });
};

const createHourlyData = () => {
  const now = new Date();

  return Array.from({ length: 30 }, (_, index) => {
    const pointTime = new Date(
      now.getTime() - (29 - index) * 2 * 60 * 1000
    );

    return {
      timestamp: pointTime.toISOString(),
      label: formatTime(pointTime),
      temperature: round(
        30.8 +
          Math.sin(index * 0.48) * 1.5 +
          Math.cos(index * 0.18) * 0.6,
        1
      ),
      current: round(
        1.18 +
          Math.sin(index * 0.62) * 0.42 +
          Math.cos(index * 0.21) * 0.17,
        2
      ),
      voltage: round(
        12.65 +
          Math.sin(index * 0.32) * 0.58 +
          index * 0.018,
        2
      ),
    };
  });
};

const createTodayData = () => {
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  return Array.from({ length: 24 }, (_, index) => {
    const pointTime = new Date(
      startOfDay.getTime() + index * 60 * 60 * 1000
    );

    return {
      timestamp: pointTime.toISOString(),
      label: `${padNumber(index)}:00`,
      temperature: round(
        29.5 +
          Math.sin((index - 6) * 0.28) * 2.2 +
          Math.max(index - 18, 0) * 0.12,
        1
      ),
      current: round(
        Math.max(
          0,
          1.1 +
            Math.sin(index * 0.52) * 0.65 +
            Math.cos(index * 0.17) * 0.2
        ),
        2
      ),
      voltage: round(
        12.1 +
          index * 0.055 +
          Math.sin(index * 0.4) * 0.35,
        2
      ),
    };
  });
};

const createWeeklyData = () => {
  const now = new Date();

  return Array.from({ length: 28 }, (_, index) => {
    const pointTime = new Date(
      now.getTime() - (27 - index) * 6 * 60 * 60 * 1000
    );

    return {
      timestamp: pointTime.toISOString(),
      label: formatDay(pointTime),
      temperature: round(
        30.2 +
          Math.sin(index * 0.42) * 2 +
          Math.cos(index * 0.16) * 0.8,
        1
      ),
      current: round(
        1.08 +
          Math.sin(index * 0.55) * 0.52 +
          Math.cos(index * 0.2) * 0.2,
        2
      ),
      voltage: round(
        12.4 +
          Math.sin(index * 0.31) * 0.62 +
          index * 0.02,
        2
      ),
    };
  });
};

export const getMockMonitoringData = (range = "realtime") => {
  switch (range) {
    case "hour":
      return createHourlyData();

    case "today":
      return createTodayData();

    case "week":
      return createWeeklyData();

    case "realtime":
    default:
      return createRealtimeData();
  }
};