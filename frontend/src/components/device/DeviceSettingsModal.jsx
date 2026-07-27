import { useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  BatteryCharging,
  Check,
  Pencil,
  Star,
  X,
} from "lucide-react";

const MAX_NAME_LENGTH = 20;

const DeviceSettingsModal = ({
  device,
  onClose,
  onSave,
}) => {
  const [deviceName, setDeviceName] = useState(
    () => device?.name ?? ""
  );

  const [isFavorite, setIsFavorite] = useState(
    () => Boolean(device?.isFavorite)
  );

  if (!device) {
    return null;
  }

  const handleNameChange = (event) => {
    const nextName = event.target.value;

    if (nextName.length <= MAX_NAME_LENGTH) {
      setDeviceName(nextName);
    }
  };

  const handleSave = () => {
    const trimmedName = deviceName.trim();

    if (!trimmedName) {
      alert("기기 이름을 입력해주세요.");
      return;
    }

    onSave?.({
      ...device,
      name: trimmedName,
      isFavorite,
    });
  };

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
        aria-labelledby="device-settings-title"
      >
        <ModalHeader>
          <HeaderInfo>
            <DeviceIcon>
              <BatteryCharging size={18} strokeWidth={2} />
            </DeviceIcon>

            <HeaderText>
              <ModalTitle id="device-settings-title">
                기기 설정
              </ModalTitle>

              <DeviceMeta>
                <StatusDot $status={device.status} />

                <span>{device.id ?? "-"}</span>

                <MetaSeparator>·</MetaSeparator>

                <StatusText $status={device.status}>
                  {getStatusLabel(device.status)}
                </StatusText>
              </DeviceMeta>
            </HeaderText>
          </HeaderInfo>

          <CloseIconButton
            type="button"
            aria-label="기기 설정 닫기"
            onClick={onClose}
          >
            <X size={18} />
          </CloseIconButton>
        </ModalHeader>

        <Divider />

        <Section>
          <SectionTitle>
            <Pencil size={16} />
            기기 이름 변경
          </SectionTitle>

          <InputWrapper>
            <NameInput
              type="text"
              value={deviceName}
              onChange={handleNameChange}
              maxLength={MAX_NAME_LENGTH}
              placeholder="기기 이름을 입력하세요"
              autoFocus
            />

            <CharacterCount>
              {deviceName.length}/{MAX_NAME_LENGTH}
            </CharacterCount>
          </InputWrapper>

          <CurrentName>
            현재 이름: <strong>{device.name ?? "-"}</strong>
          </CurrentName>
        </Section>

        <Divider />

        <Section>
          <SectionTitle>
            <Star size={16} />
            즐겨찾기
          </SectionTitle>

          <FavoriteButton
            type="button"
            $isFavorite={isFavorite}
            onClick={() =>
              setIsFavorite((previous) => !previous)
            }
          >
            <FavoriteIcon $isFavorite={isFavorite}>
              <Star
                size={22}
                fill={isFavorite ? "currentColor" : "none"}
              />
            </FavoriteIcon>

            <FavoriteText>
              <FavoriteTitle $isFavorite={isFavorite}>
                {isFavorite
                  ? "즐겨찾기 등록됨"
                  : "즐겨찾기에 추가"}
              </FavoriteTitle>

              <FavoriteDescription>
                {isFavorite
                  ? "기기 목록 상단에 고정됩니다"
                  : "자주 사용하는 기기를 상단에 고정하세요"}
              </FavoriteDescription>
            </FavoriteText>

            <FavoriteCheck $isFavorite={isFavorite}>
              {isFavorite && <Check size={17} />}
            </FavoriteCheck>
          </FavoriteButton>
        </Section>

        <DeviceInfoGrid>
          <DeviceInfoItem>
            <InfoLabel>위치</InfoLabel>
            <InfoValue>{device.location ?? "-"}</InfoValue>
          </DeviceInfoItem>

          <DeviceInfoItem>
            <InfoLabel>마지막 연결</InfoLabel>
            <InfoValue>
              {device.lastConnected ?? "-"}
            </InfoValue>
          </DeviceInfoItem>

          <DeviceInfoItem>
            <InfoLabel>배터리</InfoLabel>
            <InfoValue>{device.battery ?? 0}%</InfoValue>
          </DeviceInfoItem>

          <DeviceInfoItem>
            <InfoLabel>펌웨어</InfoLabel>
            <InfoValue>{device.firmware ?? "-"}</InfoValue>
          </DeviceInfoItem>
        </DeviceInfoGrid>

        <ButtonRow>
          <CancelButton type="button" onClick={onClose}>
            취소
          </CancelButton>

          <SaveButton type="button" onClick={handleSave}>
            저장
          </SaveButton>
        </ButtonRow>
      </Modal>
    </Overlay>
  );
};

export default DeviceSettingsModal;

const getStatusLabel = (status) => {
  switch (status) {
    case "charging":
      return "충전 중";

    case "connected":
      return "연결됨";

    case "offline":
      return "오프라인";

    case "standby":
    default:
      return "대기 중";
  }
};

const overlayFadeIn = keyframes`
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
`;

const modalFadeIn = keyframes`
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
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(16, 21, 31, 0.55);
  backdrop-filter: blur(7px);
  animation: ${overlayFadeIn} 0.2s ease;
`;

const Modal = styled.div`
  width: min(100%, 405px);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 22px;
  border-radius: 23px;
  background: #ffffff;
  box-shadow: 0 28px 70px rgba(18, 24, 36, 0.3);
  animation: ${modalFadeIn} 0.24s ease;
`;

const ModalHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DeviceIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 39px;
  height: 39px;
  border-radius: 50%;
  color: #5574f6;
  background: #f0f4ff;
`;

const HeaderText = styled.div`
  min-width: 0;
`;

const ModalTitle = styled.h2`
  color: #202a3d;
  font-size: 16px;
  font-weight: 850;
`;

const DeviceMeta = styled.div`
  display: flex;
  align-items: center;
  margin-top: 4px;
  color: #98a4b8;
  font-size: 10px;
`;

const StatusDot = styled.span`
  width: 5px;
  height: 5px;
  margin-right: 6px;
  border-radius: 50%;
  background: ${({ $status }) => {
    if ($status === "offline") return "#e34d51";
    if ($status === "connected") return "#52af61";
    return "#6886ff";
  }};
`;

const MetaSeparator = styled.span`
  margin: 0 6px;
`;

const StatusText = styled.strong`
  color: ${({ $status }) => {
    if ($status === "offline") return "#e34d51";
    if ($status === "connected") return "#4e9b5a";
    return "#536bf3";
  }};
`;

const CloseIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  color: #7d899d;
  background: #f2f5f9;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #ffffff;
    background: #65738a;
    transform: rotate(6deg);
  }
`;

const Divider = styled.hr`
  margin: 18px 0;
  border: none;
  border-top: 1px solid #edf0f4;
`;

const Section = styled.section``;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: #3b465c;
  font-size: 13px;
  font-weight: 800;

  svg {
    color: #8391a8;
  }
`;

const InputWrapper = styled.div`
  position: relative;
`;

const NameInput = styled.input`
  width: 100%;
  height: 45px;
  padding: 0 58px 0 14px;
  border: 1px solid #dfe5ed;
  border-radius: 17px;
  outline: none;
  color: #242d40;
  background: #fafbfd;
  font-size: 13px;
  font-weight: 650;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;

  &:focus {
    border-color: #7895ff;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(85, 116, 246, 0.12);
  }
`;

const CharacterCount = styled.span`
  position: absolute;
  top: 50%;
  right: 14px;
  color: #c0c8d6;
  font-size: 11px;
  font-weight: 650;
  transform: translateY(-50%);
`;

const CurrentName = styled.p`
  margin-top: 8px;
  color: #9ba6b8;
  font-size: 10px;

  strong {
    color: #69768b;
  }
`;

const FavoriteButton = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 68px;
  padding: 12px 15px;
  border: 1px solid
    ${({ $isFavorite }) =>
      $isFavorite ? "#efc54a" : "#e2e7ef"};
  border-radius: 17px;
  color: inherit;
  background: ${({ $isFavorite }) =>
    $isFavorite ? "#fffbed" : "#fafbfd"};
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: ${({ $isFavorite }) =>
      $isFavorite ? "#e3ad0a" : "#cbd6ff"};
    background: ${({ $isFavorite }) =>
      $isFavorite ? "#fff6cf" : "#f3f6ff"};
    box-shadow: 0 7px 17px rgba(38, 53, 91, 0.08);
    transform: translateY(-1px);
  }
`;

const FavoriteIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: ${({ $isFavorite }) =>
    $isFavorite ? "#eca900" : "#98a5bb"};
  background: ${({ $isFavorite }) =>
    $isFavorite ? "#fff2b6" : "#eef2f7"};
`;

const FavoriteText = styled.span`
  display: block;
  flex: 1;
  min-width: 0;
  margin-left: 12px;
`;

const FavoriteTitle = styled.strong`
  display: block;
  color: ${({ $isFavorite }) =>
    $isFavorite ? "#ae6500" : "#344057"};
  font-size: 13px;
  font-weight: 850;
`;

const FavoriteDescription = styled.span`
  display: block;
  margin-top: 3px;
  color: #97a3b7;
  font-size: 10px;
`;

const FavoriteCheck = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 29px;
  height: 29px;
  border: 2px solid
    ${({ $isFavorite }) =>
      $isFavorite ? "#efb500" : "#c8d1df"};
  border-radius: 50%;
  color: #ffffff;
  background: ${({ $isFavorite }) =>
    $isFavorite ? "#efb500" : "transparent"};
`;

const DeviceInfoGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px 20px;
  margin-top: 18px;
  padding: 16px;
  border-radius: 17px;
  background: #f8fafc;
`;

const DeviceInfoItem = styled.div`
  min-width: 0;
`;

const InfoLabel = styled.p`
  color: #99a5b8;
  font-size: 10px;
  font-weight: 650;
`;

const InfoValue = styled.strong`
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #38445a;
  font-size: 12px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ButtonRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
  margin-top: 18px;
`;

const BaseButton = styled.button`
  min-height: 43px;
  border: none;
  border-radius: 18px;
  font-size: 13px;
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

const CancelButton = styled(BaseButton)`
  color: #4a566b;
  background: #f0f3f8;

  &:hover {
    color: #ffffff;
    background: #748096;
  }
`;

const SaveButton = styled(BaseButton)`
  color: #ffffff;
  background: #4d63f5;

  &:hover {
    background: #3e54e8;
    box-shadow: 0 8px 18px rgba(77, 99, 245, 0.25);
  }
`;