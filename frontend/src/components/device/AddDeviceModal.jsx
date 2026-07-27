import styled, { keyframes } from "styled-components";
import { BatteryCharging, X } from "lucide-react";

const AddDeviceModal = ({
  devices,
  onClose,
  onConnect,
}) => {
  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <Overlay onMouseDown={handleOverlayClick}>
      <Modal
        role="dialog"
        aria-modal="true"
        aria-label="새 기기 추가"
      >
        <ModalHeader>
          <div>
            <Title>새 기기 추가</Title>

            <Description>
              주변 ChargeSafe 기기를 검색합니다
            </Description>
          </div>

          <CloseIconButton
            type="button"
            aria-label="기기 추가 창 닫기"
            onClick={onClose}
          >
            <X size={18} />
          </CloseIconButton>
        </ModalHeader>

        <DeviceOptions>
          {devices.length > 0 ? (
            devices.map((device) => (
              <DeviceOption key={device.id}>
                <DeviceInfo>
                  <DeviceIcon>
                    <BatteryCharging size={17} />
                  </DeviceIcon>

                  <div>
                    <DeviceName>{device.name}</DeviceName>

                    <DeviceMeta>
                      {device.id} · {device.signal}
                    </DeviceMeta>
                  </div>
                </DeviceInfo>

                <ConnectButton
                  type="button"
                  onClick={() => onConnect(device)}
                >
                  연결
                </ConnectButton>
              </DeviceOption>
            ))
          ) : (
            <EmptyMessage>
              연결할 수 있는 새 기기가 없습니다.
            </EmptyMessage>
          )}
        </DeviceOptions>

        <CloseButton type="button" onClick={onClose}>
          닫기
        </CloseButton>
      </Modal>
    </Overlay>
  );
};

export default AddDeviceModal;

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
    transform: translateY(14px) scale(0.97);
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
  background: rgba(20, 25, 35, 0.5);
  backdrop-filter: blur(7px);
  animation: ${overlayAppear} 0.2s ease;
`;

const Modal = styled.div`
  width: min(100%, 405px);
  padding: 23px;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 28px 70px rgba(18, 24, 36, 0.28);
  animation: ${modalAppear} 0.24s ease;
`;

const ModalHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

const Title = styled.h2`
  color: #1d2639;
  font-size: 20px;
  font-weight: 850;
`;

const Description = styled.p`
  margin-top: 4px;
  color: #929db1;
  font-size: 12px;
`;

const CloseIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #7f8ba0;
  background: #f3f6fa;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #ffffff;
    background: #66758e;
    transform: rotate(5deg);
  }
`;

const DeviceOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 19px;
`;

const DeviceOption = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 61px;
  padding: 10px 12px;
  border: 1px solid #edf0f5;
  border-radius: 14px;
  background: #fafbfd;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #d4ddff;
    background: #f4f6ff;
    transform: translateY(-1px);
  }
`;

const DeviceInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DeviceIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 39px;
  height: 39px;
  border-radius: 50%;
  color: #5574f6;
  background: #f0f4ff;
`;

const DeviceName = styled.strong`
  display: block;
  color: #263146;
  font-size: 12px;
  font-weight: 800;
`;

const DeviceMeta = styled.span`
  display: block;
  margin-top: 3px;
  color: #9aa5b7;
  font-size: 10px;
`;

const ConnectButton = styled.button`
  padding: 8px 13px;
  border: 1px solid #dce4ff;
  border-radius: 16px;
  color: #536df4;
  background: #eef3ff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #ffffff;
    border-color: #536df4;
    background: #536df4;
    transform: translateY(-1px);
  }
`;

const EmptyMessage = styled.div`
  padding: 30px 15px;
  color: #929db0;
  font-size: 12px;
  text-align: center;
`;

const CloseButton = styled.button`
  width: 100%;
  min-height: 43px;
  margin-top: 18px;
  border-radius: 18px;
  color: #414b5e;
  background: #f0f3f8;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #ffffff;
    background: #68758b;
    transform: translateY(-1px);
  }
`;