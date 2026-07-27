import styled from "styled-components";
import { TriangleAlert } from "lucide-react";

const EmergencyAlert = ({ alert, onClick }) => {
  if (!alert?.exists) {
    return (
      <SafeContainer>
        현재 확인되지 않은 긴급 알림이 없습니다.
      </SafeContainer>
    );
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <AlertContainer
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <LeftArea>
        <AlertIcon>
          <TriangleAlert size={17} />
        </AlertIcon>

        <div>
          <Title>
            미확인 긴급 알림 {alert.count ?? 1}건
          </Title>

          <Description>
            {alert.title ?? "배터리 이상 감지"} ·{" "}
            {alert.time ?? "-"}
          </Description>
        </div>
      </LeftArea>

      <DangerBadge>{alert.level ?? "위험"}</DangerBadge>
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
  outline: none;
  background: #fff5f4;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover,
  &:focus-visible {
    border-color: #f7aeb0;
    background: #ffeded;
    box-shadow: 0 8px 20px rgba(217, 65, 69, 0.1);
    transform: translateY(-2px);
  }
`;

const SafeContainer = styled(AlertContainer)`
  justify-content: center;
  color: #4d9b62;
  border-color: #d8f0df;
  background: #f4fbf6;
  cursor: default;

  &:hover {
    border-color: #d8f0df;
    background: #f4fbf6;
    box-shadow: none;
    transform: none;
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
  color: #f05c61;
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