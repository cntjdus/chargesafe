import styled from "styled-components";
import {
  CircleCheck,
  Clock3,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";

import HistoryStatCard from "./HistoryStatCard";

const HistoryStatsSection = ({ summary }) => {
  const cards = [
    {
      id: "total-time",
      icon: Clock3,
      title: "총 충전 시간",
      value: summary.totalChargingTime,
      description: "최근 8회 기준",
      iconBackground: "#5878F7",
    },
    {
      id: "completed",
      icon: CircleCheck,
      title: "정상 완료",
      value: summary.completedCount,
      description: "정상 종료 회차",
      iconBackground: "#59C766",
    },
    {
      id: "blocked",
      icon: TriangleAlert,
      title: "자동 차단",
      value: summary.blockedCount,
      description: "온도 초과 차단",
      iconBackground: "#E94447",
    },
    {
      id: "target",
      icon: TrendingUp,
      title: "평균 목표량",
      value: `${summary.averageTargetBattery}%`,
      description: "AI 추천 기준",
      iconBackground: "#8553F5",
    },
  ];

  return (
    <StatsGrid>
      {cards.map((card) => (
        <HistoryStatCard key={card.id} {...card} />
      ))}
    </StatsGrid>
  );
};

export default HistoryStatsSection;

const StatsGrid = styled.section`
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