import styled from "styled-components";
import {
  Clock3,
  Heart,
  Microchip,
  Zap,
} from "lucide-react";
import SummaryCard from "./SummaryCard";

const summaryData = [
  {
    id: 1,
    title: "현재 충전량",
    value: "63%",
    description: "목표 85%까지 충전 중",
    icon: Zap,
    iconColor: "#FFFFFF",
    iconBackground: "#5877F7",
  },
  {
    id: 2,
    title: "완료 예정",
    value: "11:28",
    description: "오전 · 남은 1시간 47분",
    icon: Clock3,
    iconColor: "#FFFFFF",
    iconBackground: "#5BCB65",
  },
  {
    id: 3,
    title: "배터리 건강도",
    value: "87%",
    description: "양호 · 정상 범위",
    icon: Heart,
    iconColor: "#FFFFFF",
    iconBackground: "#58BE89",
  },
  {
    id: 4,
    title: "AI 신뢰도",
    value: "94%",
    description: "최근 5회 패턴 분석",
    icon: Microchip,
    iconColor: "#FFFFFF",
    iconBackground: "#8554F5",
  },
];

const SummarySection = () => {
  return (
    <SummaryGrid>
      {summaryData.map((item) => (
        <SummaryCard key={item.id} {...item} />
      ))}
    </SummaryGrid>
  );
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