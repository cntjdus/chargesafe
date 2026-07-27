import styled from "styled-components";
import { Clock3, Heart, Microchip, Zap } from "lucide-react";

import SummaryCard from "./SummaryCard";

const SummarySection = ({ data }) => {
  const summaryData = [
    {
      id: "charge",
      title: "현재 충전량",
      value: `${data.chargePercent ?? 0}%`,
      description: `목표 ${data.targetPercent ?? 0}%까지 ${
        data.chargingStatus ?? "대기 중"
      }`,
      icon: Zap,
      iconBackground: "#5877F7",
    },
    {
      id: "completion",
      title: "완료 예정",
      value: data.completionTime ?? "--:--",
      description: `${data.completionPeriod ?? ""} · 남은 ${
        data.remainingTime ?? "-"
      }`,
      icon: Clock3,
      iconBackground: "#5BCB65",
    },
    {
      id: "health",
      title: "배터리 건강도",
      value: `${data.batteryHealth ?? 0}%`,
      description: getHealthDescription(data.batteryHealth),
      icon: Heart,
      iconBackground: "#58BE89",
    },
    {
      id: "confidence",
      title: "AI 신뢰도",
      value: `${data.aiConfidence ?? 0}%`,
      description: "최근 5회 패턴 분석",
      icon: Microchip,
      iconBackground: "#8554F5",
    },
  ];

  return (
    <SummaryGrid>
      {summaryData.map((item) => (
        <SummaryCard key={item.id} {...item} />
      ))}
    </SummaryGrid>
  );
};

const getHealthDescription = (health) => {
  if (health >= 80) return "양호 · 정상 범위";
  if (health >= 60) return "주의 · 점검 권장";
  return "위험 · 교체 권장";
};

export default SummarySection;

const SummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;