import styled, { keyframes } from "styled-components";
import {
  AlertTriangle,
  ArrowLeft,
  Phone,
} from "lucide-react";

const guideItems = [
  {
    number: "01",
    title: "충전기 즉시 분리",
    description:
      "전원 코드를 안전하게 뽑고 충전을 중단하세요.",
  },
  {
    number: "02",
    title: "환기 및 냉각",
    description:
      "창문을 열어 환기하고 배터리가 식을 때까지 기다리세요.",
  },
  {
    number: "03",
    title: "불꽃·연기 확인",
    description:
      "배터리 주변에 불꽃이나 연기가 있으면 즉시 대피하세요.",
  },
  {
    number: "04",
    title: "재사용 전 점검",
    description:
      "전문가의 점검 없이 재충전하지 마세요.",
  },
];

const EmergencyGuideModal = ({
  onBack,
  onEmergencyCall,
}) => {
  return (
    <Overlay>
      <GuideModal
        role="dialog"
        aria-modal="true"
        aria-label="긴급 대처 안내"
      >
        <GuideHeader>
          <BackButton type="button" onClick={onBack}>
            <ArrowLeft size={20} />
            돌아가기
          </BackButton>

          <HeaderTitleArea>
            <HeaderIcon>
              <AlertTriangle size={27} />
            </HeaderIcon>

            <div>
              <Title>긴급 대처 안내</Title>
              <Subtitle>
                즉시 다음 순서에 따라 행동하세요
              </Subtitle>
            </div>
          </HeaderTitleArea>
        </GuideHeader>

        <GuideBody>
          <GuideList>
            {guideItems.map((item) => (
              <GuideItem key={item.number}>
                <Number>{item.number}</Number>

                <GuideText>
                  <GuideTitle>{item.title}</GuideTitle>
                  <GuideDescription>
                    {item.description}
                  </GuideDescription>
                </GuideText>
              </GuideItem>
            ))}
          </GuideList>

          <EmergencyCallButton
            type="button"
            onClick={onEmergencyCall}
          >
            <Phone size={22} />
            119 또는 보호자 긴급 연락
          </EmergencyCallButton>
        </GuideBody>
      </GuideModal>
    </Overlay>
  );
};

export default EmergencyGuideModal;

const modalAppear = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1010;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(16, 20, 31, 0.6);
  backdrop-filter: blur(7px);
`;

const GuideModal = styled.div`
  width: min(100%, 680px);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  border: 2px solid rgba(222, 90, 90, 0.65);
  border-radius: 34px;
  background: #ffffff;
  box-shadow: 0 28px 70px rgba(68, 22, 22, 0.32);
  animation: ${modalAppear} 0.25s ease;
`;

const GuideHeader = styled.header`
  padding: 30px 36px 34px;
  color: #ffffff;
  background: #151c30;

  @media (max-width: 600px) {
    padding: 24px;
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 9px;
  color: #9ca8bc;
  background: transparent;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: #ffffff;
  }
`;

const HeaderTitleArea = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 66px;
  height: 66px;
  border-radius: 23px;
  color: #ffffff;
  background: #ed4447;
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: 850;

  @media (max-width: 600px) {
    font-size: 23px;
  }
`;

const Subtitle = styled.p`
  margin-top: 5px;
  color: #9ca7ba;
  font-size: 17px;

  @media (max-width: 600px) {
    font-size: 14px;
  }
`;

const GuideBody = styled.section`
  padding: 30px 36px 36px;

  @media (max-width: 600px) {
    padding: 25px 22px;
  }
`;

const GuideList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 23px;
`;

const GuideItem = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const Number = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 59px;
  height: 59px;
  border: 1px solid #f4d3d3;
  border-radius: 50%;
  color: #ea4144;
  background: #fff7f6;
  font-size: 17px;
  font-weight: 850;
`;

const GuideText = styled.div`
  min-width: 0;
`;

const GuideTitle = styled.h3`
  color: #20283b;
  font-size: 20px;
  font-weight: 800;

  @media (max-width: 600px) {
    font-size: 17px;
  }
`;

const GuideDescription = styled.p`
  margin-top: 4px;
  color: #73809a;
  font-size: 16px;
  line-height: 1.5;

  @media (max-width: 600px) {
    font-size: 14px;
  }
`;

const EmergencyCallButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  min-height: 78px;
  margin-top: 30px;
  border-radius: 24px;
  color: #ffffff;
  background: #ea4144;
  box-shadow: 0 12px 24px rgba(228, 57, 61, 0.24);
  font-size: 21px;
  font-weight: 850;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #d93438;
    transform: translateY(-2px);
  }

  @media (max-width: 600px) {
    min-height: 64px;
    font-size: 17px;
  }
`;