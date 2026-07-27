import styled from "styled-components";
import {
  CheckCircle2,
  Heart,
  Microchip,
  TrendingUp,
} from "lucide-react";

const AIRecommendationCard = ({
  confidence = 0,
  recommendedPercent = 0,
  message = "AI 추천 정보를 불러오는 중입니다.",
  batteryHealth = 0,
}) => {
  return (
    <Card>
      <TopLine />

      <Header>
        <HeaderTitleArea>
          <IconBox>
            <Microchip size={20} />
          </IconBox>

          <div>
            <Title>AI 충전 추천</Title>
            <Subtitle>최근 5회 사용 패턴 분석</Subtitle>
          </div>
        </HeaderTitleArea>

        <ConfidenceBadge>
          <TrendingUp size={12} />
          신뢰도 {confidence}%
        </ConfidenceBadge>
      </Header>

      <RecommendationBox>
        <StrongText>{recommendedPercent}% 충전</StrongText>
        <Message>{message}</Message>
      </RecommendationBox>

      <HealthRow>
        <HealthLabel>
          <Heart size={14} />
          배터리 건강도
        </HealthLabel>

        <HealthProgress>
          <HealthProgressValue $health={batteryHealth} />
        </HealthProgress>

        <HealthValue>양호 · {batteryHealth}%</HealthValue>

        <NormalBadge>
          <CheckCircle2 size={12} />
          정상
        </NormalBadge>
      </HealthRow>
    </Card>
  );
};

export default AIRecommendationCard;

const Card = styled.article`
  position: relative;
  overflow: hidden;
  padding: 19px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(30, 44, 74, 0.05);
`;

const TopLine = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: ${({ theme }) => theme.colors.primary};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderTitleArea = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
`;

const IconBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 37px;
  height: 37px;
  border-radius: 50%;
  color: #ffffff;
  background: ${({ theme }) => theme.colors.primary};
`;

const Title = styled.h3`
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
  font-weight: 800;
`;

const Subtitle = styled.p`
  margin-top: 3px;
  color: #95a0b3;
  font-size: 10px;
`;

const ConfidenceBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 13px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.primaryLight};
  font-size: 10px;
  font-weight: 700;
`;

const RecommendationBox = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 13px;
  padding: 14px 15px;
  border-radius: 15px;
  color: #5069d7;
  background: #f0f4fd;
  font-size: 12px;
`;

const StrongText = styled.strong`
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 10px;
  color: #385acb;
  background: #dce6ff;
`;

const Message = styled.span`
  line-height: 1.5;
`;

const HealthRow = styled.div`
  display: grid;
  grid-template-columns: auto minmax(100px, 1fr) auto auto;
  align-items: center;
  gap: 11px;
  margin-top: 14px;
`;

const HealthLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 7px;
  color: #637186;
  font-size: 11px;

  svg {
    color: #ff6f83;
  }
`;

const HealthProgress = styled.div`
  height: 6px;
  overflow: hidden;
  border-radius: 10px;
  background: #edf1f4;
`;

const HealthProgressValue = styled.div`
  width: ${({ $health }) => `${Math.min(Math.max($health, 0), 100)}%`};
  height: 100%;
  border-radius: inherit;
  background: #5ac389;
  transition: width 0.5s ease;
`;

const HealthValue = styled.span`
  color: #354052;
  font-size: 10px;
  font-weight: 700;
`;

const NormalBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 3px;
  color: #4fab5d;
  font-size: 10px;
  font-weight: 700;
`;