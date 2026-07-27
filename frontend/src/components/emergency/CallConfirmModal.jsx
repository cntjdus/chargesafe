import styled, { keyframes } from "styled-components";
import { Phone } from "lucide-react";

const CallConfirmModal = ({
  guardianName = "김보호",
  relation = "딸",
  phoneNumber = "010-1234-5678",
  onCancel,
  onCall,
}) => {
  return (
    <Overlay>
      <Modal
        role="dialog"
        aria-modal="true"
        aria-label="보호자에게 전화"
      >
        <PhoneIcon>
          <Phone size={43} strokeWidth={2} />
        </PhoneIcon>

        <Title>보호자에게 전화</Title>

        <Description>
          {guardianName} ({relation}) · {phoneNumber}에
          전화를 겁니다.
        </Description>

        <ButtonRow>
          <CancelButton type="button" onClick={onCancel}>
            취소
          </CancelButton>

          <CallButton type="button" onClick={onCall}>
            전화 걸기
          </CallButton>
        </ButtonRow>
      </Modal>
    </Overlay>
  );
};

export default CallConfirmModal;

const modalAppear = keyframes`
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.96);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1020;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(20, 24, 34, 0.56);
  backdrop-filter: blur(7px);
`;

const Modal = styled.div`
  width: min(100%, 575px);
  padding: 36px 36px 35px;
  border-radius: 34px;
  background: #ffffff;
  box-shadow: 0 28px 70px rgba(20, 27, 44, 0.28);
  text-align: center;
  animation: ${modalAppear} 0.25s ease;

  @media (max-width: 600px) {
    padding: 30px 22px;
    border-radius: 27px;
  }
`;

const PhoneIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  margin: 0 auto 27px;
  border-radius: 50%;
  color: #5275f7;
  background: #e3ebff;
`;

const Title = styled.h2`
  color: #1d2537;
  font-size: 31px;
  font-weight: 850;

  @media (max-width: 600px) {
    font-size: 25px;
  }
`;

const Description = styled.p`
  margin-top: 11px;
  color: #6f7e99;
  font-size: 19px;
  line-height: 1.5;

  @media (max-width: 600px) {
    font-size: 15px;
  }
`;

const ButtonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 29px;

  @media (max-width: 450px) {
    grid-template-columns: 1fr;
  }
`;

const BaseButton = styled.button`
  min-height: 78px;
  border-radius: 25px;
  font-size: 21px;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    filter 0.2s ease;

  &:hover {
    filter: brightness(0.97);
    transform: translateY(-2px);
  }

  @media (max-width: 600px) {
    min-height: 62px;
    font-size: 17px;
  }
`;

const CancelButton = styled(BaseButton)`
  color: #3a4358;
  background: #f0f3f8;
`;

const CallButton = styled(BaseButton)`
  color: #ffffff;
  background: #5576f6;
`;