import styled from "styled-components";
import { TriangleAlert } from "lucide-react";

const EmergencyAlert = () => {
  return (
    <AlertContainer>
      <LeftArea>
        <AlertIcon>
          <TriangleAlert size={17} />
        </AlertIcon>

        <div>
          <Title>미확인 긴급 알림 1건</Title>
          <Description>배터리 온도 초과 · 오전 2:14</Description>
        </div>
      </LeftArea>

      <DangerBadge>위험</DangerBadge>
    </AlertContainer>
  );
};

export default EmergencyAlert;

const AlertContainer = styled.article`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 61px;
  padding: 0 17px;
  border: 1px solid #ffd6d6;
  border-radius: 16px;
  background: #fff5f4;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #f7aeb0;
    background: #ffeded;
    transform: translateY(-2px);
  }
`;

const LeftArea = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AlertIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.red};
  background: #ffe2e2;
`;

const Title = styled.h3`
  color: #c53539;
  font-size: 12px;
  font-weight: 800;
`;

const Description = styled.p`
  margin-top: 3px;
  color: #e35b5f;
  font-size: 10px;
`;

const DangerBadge = styled.span`
  padding: 5px 10px;
  border-radius: 11px;
  color: #d84247;
  background: #ffe3e3;
  font-size: 10px;
  font-weight: 700;
`;