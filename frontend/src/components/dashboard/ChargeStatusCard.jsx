import styled from "styled-components";
import { Clock3, TrendingUp } from "lucide-react";

const ChargeStatusCard = ({
  chargePercent = 0,
  targetPercent = 0,
  completionTime = "--:--",
  completionPeriod = "",
  remainingTime = "-",
  chargingStatus = "대기 중",
}) => {
  const safePercent = Math.min(Math.max(Number(chargePercent) || 0, 0), 100);

  return (
    <Card>
      <CardHeader>
        <div>
          <Title>현재 충전 상태</Title>
          <Subtitle>스마트 충전 모드 · 배터리 보호</Subtitle>
        </div>

        <ChargingBadge>
          <BadgeDot />
          {chargingStatus}
        </ChargingBadge>
      </CardHeader>

      <ChartArea>
        <ChargeCircle $percent={safePercent}>
          <CircleInner>
            <Percent>{safePercent}%</Percent>
            <CurrentLabel>현재 충전량</CurrentLabel>
            <TargetBadge>● 목표 {targetPercent}%</TargetBadge>
          </CircleInner>
        </ChargeCircle>
      </ChartArea>

      <TimeGrid>
        <TimeCard>
          <TimeLabel>
            <Clock3 size={13} />
            완료 예정
          </TimeLabel>

          <TimeValue>{completionTime}</TimeValue>
          <TimeUnit>{completionPeriod}</TimeUnit>
        </TimeCard>

        <TimeCard>
          <TimeLabel>
            <TrendingUp size={13} />
            남은 시간
          </TimeLabel>

          <TimeValue>{remainingTime}</TimeValue>
          <TimeUnit>시간 · 분</TimeUnit>
        </TimeCard>
      </TimeGrid>
    </Card>
  );
};

export default ChargeStatusCard;

const Card = styled.article`
  min-height: 405px;
  padding: 23px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(30, 44, 74, 0.05);
`;

const CardHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

const Title = styled.h3`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 800;
`;

const Subtitle = styled.p`
  margin-top: 4px;
  color: #9aa6b9;
  font-size: 11px;
`;

const ChargingBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 14px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.primaryLight};
  font-size: 11px;
  font-weight: 700;
`;

const BadgeDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #76a0ff;
`;

const ChartArea = styled.div`
  display: flex;
  justify-content: center;
  padding: 16px 0 15px;
`;

const ChargeCircle = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 196px;
  height: 196px;
  border-radius: 50%;
  background: ${({ $percent }) => `
    conic-gradient(
      #4e64f4 0deg ${$percent * 3.6}deg,
      #d9e5ff ${$percent * 3.6}deg 360deg
    )
  `};
  transform: rotate(-90deg);
`;

const CircleInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 162px;
  height: 162px;
  border-radius: 50%;
  background: #ffffff;
  transform: rotate(90deg);
`;

const Percent = styled.strong`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 47px;
  font-weight: 850;
`;

const CurrentLabel = styled.span`
  margin-top: 4px;
  color: #9aa6b8;
  font-size: 12px;
`;

const TargetBadge = styled.span`
  margin-top: 8px;
  padding: 5px 10px;
  border-radius: 13px;
  color: #6281ee;
  background: #edf3ff;
  font-size: 10px;
  font-weight: 700;
`;

const TimeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const TimeCard = styled.div`
  padding: 13px 14px;
  border-radius: 15px;
  background: #f8fafc;
`;

const TimeLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 5px;
  color: #97a3b5;
  font-size: 10px;
`;

const TimeValue = styled.strong`
  display: block;
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 20px;
  font-weight: 850;
`;

const TimeUnit = styled.span`
  color: #a3adbd;
  font-size: 10px;
`;