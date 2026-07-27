import { useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  Thermometer,
  TriangleAlert,
  X,
} from "lucide-react";

import { temperatureOptions } from "../../data/settingsData";

const MIN_TEMPERATURE = 40;
const MAX_TEMPERATURE = 65;

const TemperatureModal = ({
  currentTemperature,
  onClose,
  onApply,
}) => {
  const [selectedTemperature, setSelectedTemperature] =
    useState(() => currentTemperature);

  const selectedOption = useMemo(
    () =>
      temperatureOptions.find(
        (option) =>
          option.value === selectedTemperature
      ) ?? temperatureOptions[1],
    [selectedTemperature]
  );

  const markerPosition =
    ((selectedTemperature - MIN_TEMPERATURE) /
      (MAX_TEMPERATURE - MIN_TEMPERATURE)) *
    100;

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
        aria-labelledby="temperature-modal-title"
      >
        <ModalHeader>
          <HeaderLeft>
            <HeaderIcon>
              <Thermometer size={19} />
            </HeaderIcon>

            <div>
              <ModalTitle id="temperature-modal-title">
                온도 차단 기준
              </ModalTitle>
              <ModalDescription>
                초과 시 충전이 자동 차단됩니다
              </ModalDescription>
            </div>
          </HeaderLeft>

          <CloseButton
            type="button"
            aria-label="온도 기준 창 닫기"
            onClick={onClose}
          >
            <X size={18} />
          </CloseButton>
        </ModalHeader>

        <Divider />

        <ModalContent>
          <SectionLabel>차단 온도 선택</SectionLabel>

          <TemperatureGrid>
            {temperatureOptions.map((option) => {
              const isSelected =
                option.value === selectedTemperature;

              return (
                <TemperatureButton
                  key={option.value}
                  type="button"
                  $isSelected={isSelected}
                  onClick={() =>
                    setSelectedTemperature(option.value)
                  }
                >
                  <TemperatureValue>
                    {option.value}°C
                  </TemperatureValue>

                  {isSelected && (
                    <SelectedText>선택됨</SelectedText>
                  )}
                </TemperatureButton>
              );
            })}
          </TemperatureGrid>

          <SelectedInformation
            $background={selectedOption.background}
            $border={selectedOption.border}
            $color={selectedOption.titleColor}
          >
            <SelectedInfoTop>
              <SelectedTitle>
                선택된 기준: {selectedTemperature}°C
              </SelectedTitle>

              <RiskBadge>
                {selectedOption.riskLabel}
              </RiskBadge>
            </SelectedInfoTop>

            <SelectedDescription>
              {selectedOption.description}
            </SelectedDescription>
          </SelectedInformation>

          <TemperatureRange>
            <RangeHeader>
              <RangeLabel>온도 범위</RangeLabel>
              <RangeCurrent>
                차단 기준: {selectedTemperature}°C
              </RangeCurrent>
            </RangeHeader>

            <RangeBar>
              <RangeMarker
                $position={markerPosition}
              />
            </RangeBar>

            <RangeLabels>
              <span>40°C</span>
              <span>52.5°C</span>
              <span>65°C</span>
            </RangeLabels>
          </TemperatureRange>

          <WarningBox>
            <TriangleAlert size={16} />

            <span>
              기준 온도를 너무 높게 설정하면 배터리 손상이나
              화재 위험이 증가할 수 있습니다. 권장 기준은{" "}
              <strong>50°C</strong>입니다.
            </span>
          </WarningBox>

          <FooterButtons>
            <CancelButton
              type="button"
              onClick={onClose}
            >
              취소
            </CancelButton>

            <ApplyButton
              type="button"
              onClick={() =>
                onApply?.(selectedTemperature)
              }
            >
              적용
            </ApplyButton>
          </FooterButtons>
        </ModalContent>
      </Modal>
    </Overlay>
  );
};

export default TemperatureModal;

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
  background: rgba(18, 23, 33, 0.52);
  backdrop-filter: blur(7px);
  animation: ${overlayFade} 0.2s ease;
`;

const Modal = styled.div`
  width: min(100%, 470px);
  max-height: calc(100vh - 38px);
  overflow-y: auto;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 30px 75px rgba(18, 24, 36, 0.32);
  animation: ${modalFade} 0.24s ease;
`;

const ModalHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: #dc6700;
  background: #fff6ea;
`;

const ModalTitle = styled.h2`
  color: #1e273a;
  font-size: 17px;
  font-weight: 850;
`;

const ModalDescription = styled.p`
  margin-top: 4px;
  color: #99a5b8;
  font-size: 11px;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 35px;
  height: 35px;
  border: none;
  border-radius: 50%;
  color: #78869b;
  background: #f2f5f9;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #ffffff;
    background: #68768d;
    transform: rotate(7deg);
  }
`;

const Divider = styled.hr`
  margin: 0;
  border: none;
  border-top: 1px solid #edf0f4;
`;

const ModalContent = styled.div`
  padding: 21px;
`;

const SectionLabel = styled.h3`
  color: #99a5b8;
  font-size: 12px;
  font-weight: 800;
`;

const TemperatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
  margin-top: 11px;
`;

const TemperatureButton = styled.button`
  min-height: 76px;
  padding: 10px 5px;
  border: ${({ $isSelected }) =>
    $isSelected
      ? "2px solid #222222"
      : "2px solid #e1e6ee"};
  border-radius: 15px;
  color: ${({ $isSelected }) =>
    $isSelected ? "#405ce9" : "#48546a"};
  background: ${({ $isSelected }) =>
    $isSelected ? "#edf3ff" : "#fafbfd"};
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: ${({ $isSelected }) =>
      $isSelected ? "#222222" : "#aebcff"};
    color: #405ce9;
    background: #f1f5ff;
    box-shadow: 0 6px 15px rgba(38, 53, 91, 0.08);
    transform: translateY(-2px);
  }
`;

const TemperatureValue = styled.strong`
  display: block;
  font-size: 17px;
  font-weight: 850;
`;

const SelectedText = styled.span`
  display: block;
  margin-top: 9px;
  color: #5873f5;
  font-size: 9px;
  font-weight: 800;
`;

const SelectedInformation = styled.section`
  margin-top: 13px;
  padding: 16px;
  border: 1px solid ${({ $border }) => $border};
  border-radius: 15px;
  color: ${({ $color }) => $color};
  background: ${({ $background }) => $background};
`;

const SelectedInfoTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const SelectedTitle = styled.strong`
  font-size: 12px;
  font-weight: 850;
`;

const RiskBadge = styled.span`
  padding: 5px 10px;
  border: 1px solid currentColor;
  border-radius: 13px;
  font-size: 9px;
  font-weight: 800;
`;

const SelectedDescription = styled.p`
  margin-top: 10px;
  font-size: 10px;
  line-height: 1.6;
`;

const TemperatureRange = styled.section`
  margin-top: 15px;
  padding: 15px 16px;
  border-radius: 16px;
  background: #f8fafc;
`;

const RangeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const RangeLabel = styled.strong`
  color: #738097;
  font-size: 10px;
`;

const RangeCurrent = styled.strong`
  color: #465268;
  font-size: 10px;
`;

const RangeBar = styled.div`
  position: relative;
  height: 10px;
  margin-top: 9px;
  border-radius: 10px;
  background: linear-gradient(
    90deg,
    #c3ddff 0%,
    #f4e797 50%,
    #ef6f6f 100%
  );
`;

const RangeMarker = styled.span`
  position: absolute;
  top: -3px;
  left: ${({ $position }) =>
    `calc(${$position}% - 1px)`};
  width: 2px;
  height: 16px;
  background: #222d40;
`;

const RangeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  color: #99a5b8;
  font-size: 9px;
  font-weight: 650;
`;

const WarningBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 14px;
  padding: 13px 14px;
  border: 1px solid #f2df9d;
  border-radius: 16px;
  color: #ba6e00;
  background: #fffbed;
  font-size: 10px;
  line-height: 1.6;

  svg {
    flex-shrink: 0;
    margin-top: 1px;
    color: #e59400;
  }

  strong {
    font-weight: 850;
  }
`;

const FooterButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
  margin-top: 17px;
`;

const FooterButton = styled.button`
  min-height: 44px;
  border: none;
  border-radius: 18px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

const CancelButton = styled(FooterButton)`
  color: #515d72;
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