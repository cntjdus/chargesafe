import styled from "styled-components";
import {
  BatteryCharging,
  RefreshCw,
  Thermometer,
} from "lucide-react";

const SystemInfoCard = ({
  chargeMode = "배터리 보호",
  cutoffTemperature = 50,
}) => {
  const items = [
    {
      id: "chargeMode",
      label: "충전 모드",
      value: chargeMode,
      icon: BatteryCharging,
    },
    {
      id: "temperature",
      label: "온도 차단",
      value: `${cutoffTemperature}°C`,
      icon: Thermometer,
    },
    {
      id: "firmware",
      label: "펌웨어",
      value: "최신",
      icon: RefreshCw,
    },
  ];

  return (
    <>
      <Card>
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <InfoRow key={item.id}>
              <InfoLabel>
                <Icon size={15} />
                {item.label}
              </InfoLabel>

              <InfoValue>{item.value}</InfoValue>
            </InfoRow>
          );
        })}
      </Card>

      <VersionText>
        ChargeSafe v2.4.1 · © 2026
      </VersionText>
    </>
  );
};

export default SystemInfoCard;

const Card = styled.section`
  margin-top: 14px;
  padding: 16px 18px;
  border: 1px solid var(--app-border);
  border-radius: 17px;
  background: var(--app-surface);
  box-shadow: var(--app-shadow);
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
`;

const InfoLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--app-text-secondary);
  font-size: 12px;

  svg {
    color: #92a2bd;
  }
`;

const InfoValue = styled.strong`
  color: var(--app-text-primary);
  font-size: 12px;
  font-weight: 800;
`;

const VersionText = styled.p`
  margin-top: 15px;
  color: var(--app-text-muted);
  font-size: 10px;
  text-align: center;
`;