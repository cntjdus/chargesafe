import styled from "styled-components";

import MetricSummaryCard from "./MetricSummaryCard";

const MonitoringSummarySection = ({
  latestMeasurement,
}) => {
  if (!latestMeasurement) {
    return null;
  }

  const temperatureStatus =
    latestMeasurement.temperature < 50
      ? "normal"
      : "warning";

  const currentStatus =
    latestMeasurement.current < 4
      ? "normal"
      : "warning";

  const voltageStatus =
    latestMeasurement.voltage < 14.5
      ? "normal"
      : "warning";

  return (
    <SummaryGrid>
      <MetricSummaryCard
        label="배터리 온도"
        value={latestMeasurement.temperature.toFixed(1)}
        unit="°C"
        threshold="기준 50°C 미만"
        status={temperatureStatus}
        valueColor="#dd5a00"
      />

      <MetricSummaryCard
        label="충전 전류"
        value={latestMeasurement.current.toFixed(2)}
        unit="A"
        threshold="기준 4A 미만"
        status={currentStatus}
        valueColor="#4d63f5"
      />

      <MetricSummaryCard
        label="배터리 전압"
        value={latestMeasurement.voltage.toFixed(2)}
        unit="V"
        threshold="기준 14.5V 미만"
        status={voltageStatus}
        valueColor="#6045ec"
      />
    </SummaryGrid>
  );
};

export default MonitoringSummarySection;

const SummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 17px;

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;