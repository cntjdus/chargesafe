import styled from "styled-components";
import {
  BatteryCharging,
  RefreshCw,
  Shield,
} from "lucide-react";

const SystemInfoCard = () => {
  const items = [
    {
      id: "plan",
      label: "구독 플랜",
      value: "Pro",
      icon: BatteryCharging,
    },
    {
      id: "security",
      label: "보안 등급",
      value: "높음",
      icon: Shield,
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
  border: 1px solid #e0e5ed;
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(32, 45, 74, 0.05);
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
  color: #768399;
  font-size: 12px;

  svg {
    color: #92a2bd;
  }
`;

const InfoValue = styled.strong`
  color: #182236;
  font-size: 12px;
  font-weight: 800;
`;

const VersionText = styled.p`
  margin-top: 15px;
  color: #9ca8bb;
  font-size: 10px;
  text-align: center;
`;