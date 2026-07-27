import styled from "styled-components";
import DeviceStatCard from "./DeviceStatCard";

const DeviceStatsSection = ({ devices }) => {
  const chargingCount = devices.filter(
    (device) => device.status === "charging"
  ).length;

  const offlineCount = devices.filter(
    (device) => device.status === "offline"
  ).length;

  return (
    <StatsGrid>
      <DeviceStatCard
        value={devices.length}
        label="전체 기기"
      />

      <DeviceStatCard
        value={chargingCount}
        label="충전 중"
        variant="charging"
      />

      <DeviceStatCard
        value={offlineCount}
        label="오프라인"
        variant="offline"
      />
    </StatsGrid>
  );
};

export default DeviceStatsSection;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;