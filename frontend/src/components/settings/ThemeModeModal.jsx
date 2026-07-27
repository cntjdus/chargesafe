import { useState } from "react";
import styled, { keyframes } from "styled-components";
import { MonitorCog, X } from "lucide-react";

import {
  THEME_MODES,
  themeModeOptions,
} from "../../styles/appThemes";

const ThemeModeModal = ({
  currentThemeMode = THEME_MODES.LIGHT,
  onClose,
  onApply,
}) => {
  const [selectedThemeMode, setSelectedThemeMode] =
    useState(() => currentThemeMode);

  const handleOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleApply = () => {
    onApply?.(selectedThemeMode);
  };

  return (
    <Overlay onMouseDown={handleOverlayMouseDown}>
      <Modal
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-mode-modal-title"
      >
        <ModalHeader>
          <HeaderInformation>
            <HeaderIcon>
              <MonitorCog size={18} strokeWidth={2} />
            </HeaderIcon>

            <HeaderText>
              <ModalTitle id="theme-mode-modal-title">
                고대비 화면 설정
              </ModalTitle>

              <ModalDescription>
                화면 테마와 색상 대비를 선택하세요
              </ModalDescription>
            </HeaderText>
          </HeaderInformation>

          <CloseButton
            type="button"
            aria-label="테마 설정 창 닫기"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} />
          </CloseButton>
        </ModalHeader>

        <Divider />

        <ThemeList>
          {themeModeOptions.map((option) => {
            const isSelected =
              selectedThemeMode === option.id;

            return (
              <ThemeOption
                key={option.id}
                type="button"
                $isSelected={isSelected}
                onClick={() =>
                  setSelectedThemeMode(option.id)
                }
              >
                <ThemePreview $themeMode={option.id}>
                  <PreviewTitleLine
                    $themeMode={option.id}
                  />

                  <PreviewDescriptionLine
                    $themeMode={option.id}
                  />

                  <PreviewAccentLine />
                </ThemePreview>

                <OptionBottom>
                  <OptionContent>
                    <OptionTitleRow>
                      <OptionName>
                        {option.name}
                      </OptionName>

                      <OptionBadge
                        $themeMode={option.id}
                      >
                        {option.badge}
                      </OptionBadge>
                    </OptionTitleRow>

                    <OptionDescription>
                      {option.description}
                    </OptionDescription>
                  </OptionContent>

                  <Radio $isSelected={isSelected}>
                    {isSelected && <RadioCenter />}
                  </Radio>
                </OptionBottom>
              </ThemeOption>
            );
          })}
        </ThemeList>

        <FooterButtons>
          <CancelButton type="button" onClick={onClose}>
            취소
          </CancelButton>

          <ApplyButton
            type="button"
            onClick={handleApply}
          >
            적용
          </ApplyButton>
        </FooterButtons>
      </Modal>
    </Overlay>
  );
};

export default ThemeModeModal;

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
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background: rgba(18, 23, 33, 0.52);
  backdrop-filter: blur(7px);
  animation: ${overlayFadeIn} 0.2s ease;
`;

const Modal = styled.div`
  width: min(100%, 430px);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 30px 75px rgba(18, 24, 36, 0.32);
  animation: ${modalFadeIn} 0.24s ease;
`;

const ModalHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 21px;
`;

const HeaderInformation = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 39px;
  height: 39px;
  border-radius: 50%;
  color: #526179;
  background: #f2f5f9;
`;

const HeaderText = styled.div`
  min-width: 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #202a3d;
  font-size: 16px;
  font-weight: 850;
`;

const ModalDescription = styled.p`
  margin: 4px 0 0;
  color: #96a2b5;
  font-size: 10px;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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

const ThemeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 17px 21px;
`;

const ThemeOption = styled.button`
  width: 100%;
  padding: 14px;
  border: 1px solid
    ${({ $isSelected }) =>
      $isSelected ? "#6e8cff" : "#e1e6ee"};
  border-radius: 16px;
  color: inherit;
  background: ${({ $isSelected }) =>
    $isSelected ? "#f3f6ff" : "#ffffff"};
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #91a7ff;
    background: #f6f8ff;
    box-shadow: 0 7px 17px rgba(38, 53, 91, 0.09);
    transform: translateY(-2px);
  }
`;

const ThemePreview = styled.div`
  min-height: 59px;
  padding: 14px;
  border: 1px solid
    ${({ $themeMode }) => {
      switch ($themeMode) {
        case THEME_MODES.DARK:
          return "#293149";

        case THEME_MODES.CUSTOM:
          return "#e3bd00";

        case THEME_MODES.LIGHT:
        default:
          return "#e5e8ee";
      }
    }};
  border-radius: 14px;
  background: ${({ $themeMode }) => {
    switch ($themeMode) {
      case THEME_MODES.DARK:
        return "#121827";

      case THEME_MODES.CUSTOM:
        return "#fffceb";

      case THEME_MODES.LIGHT:
      default:
        return "#ffffff";
    }
  }};
`;

const PreviewLine = styled.span`
  display: block;
  height: 6px;
  border-radius: 10px;
`;

const PreviewTitleLine = styled(PreviewLine)`
  width: 28%;
  background: ${({ $themeMode }) =>
    $themeMode === THEME_MODES.DARK
      ? "#ffffff"
      : "#1c2434"};
`;

const PreviewDescriptionLine = styled(PreviewLine)`
  width: 39%;
  margin-top: 7px;
  background: ${({ $themeMode }) =>
    $themeMode === THEME_MODES.DARK
      ? "#77839d"
      : "#bdc5d2"};
`;

const PreviewAccentLine = styled(PreviewLine)`
  width: 20%;
  margin-top: 7px;
  background: #6384f7;
`;

const OptionBottom = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  margin-top: 11px;
`;

const OptionContent = styled.div`
  min-width: 0;
`;

const OptionTitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const OptionName = styled.strong`
  color: #202a3d;
  font-size: 13px;
  font-weight: 850;
`;

const OptionBadge = styled.span`
  padding: 4px 8px;
  border-radius: 11px;
  color: ${({ $themeMode }) => {
    switch ($themeMode) {
      case THEME_MODES.DARK:
        return "#ffffff";

      case THEME_MODES.CUSTOM:
        return "#b87b00";

      case THEME_MODES.LIGHT:
      default:
        return "#5269ef";
    }
  }};
  background: ${({ $themeMode }) => {
    switch ($themeMode) {
      case THEME_MODES.DARK:
        return "#49556c";

      case THEME_MODES.CUSTOM:
        return "#fff2c4";

      case THEME_MODES.LIGHT:
      default:
        return "#eaf0ff";
    }
  }};
  font-size: 9px;
  font-weight: 800;
`;

const OptionDescription = styled.p`
  margin: 7px 0 0;
  color: #768398;
  font-size: 10px;
  line-height: 1.55;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
  padding: 0 21px 21px;
`;

const BaseFooterButton = styled.button`
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

const CancelButton = styled(BaseFooterButton)`
  color: #4e5a70;
  background: #f0f3f8;

  &:hover {
    color: #ffffff;
    background: #758197;
  }
`;

const ApplyButton = styled(BaseFooterButton)`
  color: #ffffff;
  background: #4c62f4;

  &:hover {
    background: #3e53e7;
    box-shadow: 0 8px 18px rgba(76, 98, 244, 0.25);
  }
`;