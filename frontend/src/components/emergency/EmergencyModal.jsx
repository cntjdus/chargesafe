import styled, { keyframes } from "styled-components";
import {
  AlertTriangle,
  ChevronRight,
  CircleAlert,
  Phone,
  ShieldCheck,
  Thermometer,
  Zap,
} from "lucide-react";

const EmergencyModal = ({
  temperature = 57,
  onClose,
  onCheckDevice,
  onContactGuardian,
  onOpenGuide,
}) => {
  return (
    <Overlay>
      <Modal
        role="dialog"
        aria-modal="true"
        aria-label="긴급 경보"
      >
        <DangerSection>
          <AlertIcon>
            <AlertTriangle size={35} strokeWidth={2} />
          </AlertIcon>

          <EmergencyLabel>
            CHARGESAFE 긴급 경보
          </EmergencyLabel>

          <Title>위험 감지됨</Title>

          <DangerList>
            <DangerItem>
              <Thermometer size={16} />
              <span>
                배터리 온도 {temperature}°C 도달
              </span>
            </DangerItem>

            <DangerItem>
              <Zap size={16} />
              <span>충전이 자동 차단되었습니다</span>
            </DangerItem>
          </DangerList>
        </DangerSection>

        <ActionSection>
          <ActionButton
            type="button"
            $variant="danger"
            onClick={onCheckDevice}
          >
            <ButtonContent>
              <ShieldCheck size={19} />
              <span>기기 상태 확인</span>
            </ButtonContent>

            <ChevronRight size={18} />
          </ActionButton>

          <ActionButton
            type="button"
            $variant="guardian"
            onClick={onContactGuardian}
          >
            <ButtonContent>
              <Phone size={19} />
              <span>보호자 연락</span>
            </ButtonContent>

            <ChevronRight size={18} />
          </ActionButton>

          <ActionButton
            type="button"
            $variant="guide"
            onClick={onOpenGuide}
          >
            <ButtonContent>
              <CircleAlert size={19} />
              <span>긴급 대처 안내</span>
            </ButtonContent>

            <ChevronRight size={18} />
          </ActionButton>

          <LaterButton type="button" onClick={onClose}>
            나중에 확인
          </LaterButton>
        </ActionSection>
      </Modal>
    </Overlay>
  );
};

export default EmergencyModal;

const overlayAppear = keyframes`
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
`;

const modalAppear = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 20, 32, 0.59);
  backdrop-filter: blur(7px);
  animation: ${overlayAppear} 0.2s ease;
`;

const Modal = styled.div`
  width: min(100%, 410px);
  overflow: hidden;
  border: 1px solid rgba(255, 105, 105, 0.75);
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 28px 70px rgba(90, 23, 23, 0.36);
  animation: ${modalAppear} 0.25s ease;
`;

const DangerSection = styled.section`
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 27px 22px 28px;
  color: #ffffff;
  background: linear-gradient(
    155deg,
    #d53832 0%,
    #b92a25 100%
  );
  text-align: center;
`;

const AlertIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 69px;
  height: 69px;
  margin-bottom: 16px;
  border: 4px solid rgba(255, 255, 255, 0.62);
  border-radius: 50%;
  color: #ffffff;
  box-shadow: 0 6px 12px rgba(112, 19, 19, 0.24);
`;

const EmergencyLabel = styled.p`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
`;

const Title = styled.h2`
  margin-top: 5px;
  font-size: 26px;
  font-weight: 850;
`;

const DangerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 17px;
`;

const DangerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-height: 42px;
  padding: 0 15px;
  border-radius: 13px;
  color: #ffffff;
  background: rgba(150, 5, 5, 0.32);
  font-size: 13px;
  font-weight: 700;
  text-align: left;
`;

const ActionSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 22px 19px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 53px;
  padding: 0 16px;
  border: 1px solid
    ${({ $variant }) => {
      if ($variant === "danger") {
        return "#f4d4d4";
      }

      if ($variant === "guardian") {
        return "#d9efdd";
      }

      return "#e8ebf1";
    }};
  border-radius: 14px;
  color: ${({ $variant }) => {
    if ($variant === "danger") {
      return "#c92f32";
    }

    if ($variant === "guardian") {
      return "#448f50";
    }

    return "#4e5b72";
  }};
  background: ${({ $variant }) => {
    if ($variant === "danger") {
      return "#fff5f4";
    }

    if ($variant === "guardian") {
      return "#f2fbf3";
    }

    return "#f8f9fb";
  }};
  cursor: pointer;
  transition:
    transform 0.2s ease,
    filter 0.2s ease;

  &:hover {
    filter: brightness(0.97);
    transform: translateY(-1px);
  }
`;

const ButtonContent = styled.span`
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 14px;
  font-weight: 750;
`;

const LaterButton = styled.button`
  margin-top: 2px;
  padding: 8px;
  color: #9aa5b7;
  background: transparent;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;

  &:hover {
    color: #5f6d83;
  }
`;