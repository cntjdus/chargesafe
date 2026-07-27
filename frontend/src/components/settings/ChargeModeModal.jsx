import { useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  BatteryCharging,
  X,
} from "lucide-react";

import { chargeModes } from "../../data/settingsData";

const ChargeModeModal = ({
  currentMode,
  onClose,
  onApply,
}) => {
  const [selectedMode, setSelectedMode] = useState(
    () => currentMode
  );

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return (
    <Overlay onMouseDown={handleOverlayClick}>
      <Modal
        role="dialog"
        aria-modal="true"
        aria-labelledby="charge-mode-title"
      >
        <ModalHeader>
          <HeaderLeft>
            <HeaderIcon>
              <BatteryCharging size={18} />
            </HeaderIcon>

            <div>
              <ModalTitle id="charge-mode-title">
                충전 모드 선택
              </ModalTitle>
              <ModalDescription>
                원하는 충전 방식을 선택하세요
              </ModalDescription>
            </div>
          </HeaderLeft>

          <CloseButton
            type="button"
            aria-label="충전 모드 창 닫기"
            onClick={onClose}
          >
            <X size={18} />
          </CloseButton>
        </ModalHeader>

        <Divider />

        <ModeList>
          {chargeModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected =
              selectedMode === mode.id;

            return (
              <ModeButton
                key={mode.id}
                type="button"
                $isSelected={isSelected}
                onClick={() =>
                  setSelectedMode(mode.id)
                }
              >
                <ModeIcon
                  $color={mode.iconColor}
                  $background={mode.iconBackground}
                >
                  <Icon size={19} />
                </ModeIcon>

                <ModeContent>
                  <ModeTitleRow>
                    <ModeName>{mode.name}</ModeName>

                    <TargetBadge>
                      목표 {mode.targetPercent}%
                    </TargetBadge>

                    {mode.badge && (
                      <TypeBadge
                        $color={mode.badgeColor}
                        $background={
                          mode.badgeBackground
                        }
                      >
                        {mode.badge}
                      </TypeBadge>
                    )}
                  </ModeTitleRow>

                  <ModeDescription>
                    {mode.description}
                  </ModeDescription>
                </ModeContent>

                <Radio $isSelected={isSelected}>
                  {isSelected && <RadioCenter />}
                </Radio>
              </ModeButton>
            );
          })}
        </ModeList>

        <FooterButtons>
          <CancelButton
            type="button"
            onClick={onClose}
          >
            취소
          </CancelButton>

          <ApplyButton
            type="button"
            onClick={() => onApply?.(selectedMode)}
          >
            적용
          </ApplyButton>
        </FooterButtons>
      </Modal>
    </Overlay>
  );
};

export default ChargeModeModal;

const overlayFade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const modalFade = keyframes`
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
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background: rgba(18, 23, 33, 0.51);
  backdrop-filter: blur(7px);
  animation: ${overlayFade} 0.2s ease;
`;

const Modal = styled.div`
  width: min(100%, 470px);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 28px 75px rgba(18, 24, 36, 0.3);
  animation: ${modalFade} 0.24s ease;
`;

const ModalHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 21px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 39px;
  height: 39px;
  border-radius: 50%;
  color: #5572f5;
  background: #eef2ff;
`;

const ModalTitle = styled.h2`
  color: #202a3d;
  font-size: 16px;
  font-weight: 850;
`;

const ModalDescription = styled.p`
  margin-top: 4px;
  color: #96a2b5;
  font-size: 10px;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  color: #78869c;
  background: #f2f5f9;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #ffffff;
    background: #64738a;
    transform: rotate(7deg);
  }
`;

const Divider = styled.hr`
  margin: 0;
  border: none;
  border-top: 1px solid #edf0f4;
`;

const ModeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 21px;
`;

const ModeButton = styled.button`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 75px;
  padding: 13px 14px;
  border: 1px solid
    ${({ $isSelected }) =>
      $isSelected ? "#90a8ff" : "#e1e6ee"};
  border-radius: 15px;
  color: inherit;
  background: ${({ $isSelected }) =>
    $isSelected ? "#f0f5ff" : "#fafbfd"};
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #a9b9ff;
    background: #f3f6ff;
    box-shadow: 0 6px 16px rgba(47, 64, 105, 0.08);
    transform: translateY(-1px);
  }
`;

const ModeIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 39px;
  height: 39px;
  border-radius: 50%;
  color: ${({ $color }) => $color};
  background: ${({ $background }) => $background};
`;

const ModeContent = styled.span`
  display: block;
  min-width: 0;
`;

const ModeTitleRow = styled.span`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
`;

const ModeName = styled.strong`
  color: #202a3c;
  font-size: 12px;
  font-weight: 850;
`;

const TargetBadge = styled.span`
  padding: 4px 7px;
  border-radius: 10px;
  color: #647087;
  background: #edf0f5;
  font-size: 9px;
  font-weight: 750;
`;

const TypeBadge = styled.span`
  padding: 4px 7px;
  border-radius: 10px;
  color: ${({ $color }) => $color};
  background: ${({ $background }) => $background};
  font-size: 9px;
  font-weight: 800;
`;

const ModeDescription = styled.span`
  display: block;
  margin-top: 6px;
  color: #7d899e;
  font-size: 10px;
  line-height: 1.5;
`;

const Radio = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  border: 2px solid
    ${({ $isSelected }) =>
      $isSelected ? "#5a79f5" : "#c8d1df"};
  border-radius: 50%;
  background: ${({ $isSelected }) =>
    $isSelected ? "#5a79f5" : "#ffffff"};
`;

const RadioCenter = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
`;

const FooterButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
  padding: 0 21px 21px;
`;

const FooterButton = styled.button`
  min-height: 43px;
  border: none;
  border-radius: 18px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

const CancelButton = styled(FooterButton)`
  color: #4e5a70;
  background: #f0f3f8;

  &:hover {
    color: #ffffff;
    background: #758197;
  }
`;

const ApplyButton = styled(FooterButton)`
  color: #ffffff;
  background: #4c62f4;

  &:hover {
    background: #3e53e7;
    box-shadow: 0 8px 18px rgba(76, 98, 244, 0.25);
  }
`;