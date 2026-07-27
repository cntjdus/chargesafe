import { useMemo, useState } from "react";
import styled from "styled-components";

import { useAppTheme } from "../contexts/AppThemeContext.jsx";

import ChargeModeModal from "../components/settings/ChargeModeModal";
import ProfileCard from "../components/settings/ProfileCard";
import SettingsSection from "../components/settings/SettingsSection";
import SystemInfoCard from "../components/settings/SystemInfoCard";
import TemperatureModal from "../components/settings/TemperatureModal";
import ThemeModeModal from "../components/settings/ThemeModeModal";

import {
  chargeModes,
  defaultSettings,
  settingSectionData,
} from "../data/settingsData";

import { getThemeModeLabel } from "../styles/appThemes";

const MOCK_USER = {
  name: "김민구",
  description: "전동휠체어 사용자",
};

const MOCK_GUARDIAN = {
  name: "박산하",
  relation: "딸",
};

const SettingsPage = () => {
  const { themeMode, setThemeMode } = useAppTheme();

  const [settings, setSettings] = useState(
    () => defaultSettings
  );

  const [activeModal, setActiveModal] =
    useState(null);

  const selectedChargeMode = useMemo(
    () =>
      chargeModes.find(
        (mode) => mode.id === settings.chargeMode
      ) ?? chargeModes[0],
    [settings.chargeMode]
  );

  const themeModeLabel = getThemeModeLabel(themeMode);

  const handleToggle = (settingId, nextValue) => {
    setSettings((previousSettings) => ({
      ...previousSettings,
      [settingId]: nextValue,
    }));
  };

  const handleApplyChargeMode = (modeId) => {
    setSettings((previousSettings) => ({
      ...previousSettings,
      chargeMode: modeId,
    }));

    setActiveModal(null);
  };

  const handleApplyTemperature = (temperature) => {
    setSettings((previousSettings) => ({
      ...previousSettings,
      cutoffTemperature: temperature,
    }));

    setActiveModal(null);
  };

  const handleApplyThemeMode = (nextThemeMode) => {
    setThemeMode(nextThemeMode);
    setActiveModal(null);
  };

  return (
    <PageContainer>
      <PageGrid>
        <LeftColumn>
          <ProfileCard
            user={MOCK_USER}
            guardian={MOCK_GUARDIAN}
            deviceId="CS-0042"
          />

          <SystemInfoCard
            chargeMode={selectedChargeMode.name}
            cutoffTemperature={
              settings.cutoffTemperature
            }
          />
        </LeftColumn>

        <RightColumn>
          <SettingsSection
            title={settingSectionData.device.title}
            items={settingSectionData.device.items}
            settings={settings}
            chargeModeLabel={
              selectedChargeMode.name
            }
            themeModeLabel={themeModeLabel}
            onToggle={handleToggle}
            onOpenChargeMode={() =>
              setActiveModal("chargeMode")
            }
          />

          <SettingsSection
            title={
              settingSectionData.notification.title
            }
            items={
              settingSectionData.notification.items
            }
            settings={settings}
            chargeModeLabel={
              selectedChargeMode.name
            }
            themeModeLabel={themeModeLabel}
            onToggle={handleToggle}
          />

          <SettingsSection
            title={settingSectionData.safety.title}
            items={settingSectionData.safety.items}
            settings={settings}
            chargeModeLabel={
              selectedChargeMode.name
            }
            themeModeLabel={themeModeLabel}
            onToggle={handleToggle}
            onOpenTemperature={() =>
              setActiveModal("temperature")
            }
          />

          <SettingsSection
            title={
              settingSectionData.accessibility.title
            }
            items={
              settingSectionData.accessibility.items
            }
            settings={settings}
            chargeModeLabel={
              selectedChargeMode.name
            }
            themeModeLabel={themeModeLabel}
            onToggle={handleToggle}
            onOpenThemeMode={() =>
              setActiveModal("themeMode")
            }
          />
        </RightColumn>
      </PageGrid>

      {activeModal === "chargeMode" && (
        <ChargeModeModal
          key={settings.chargeMode}
          currentMode={settings.chargeMode}
          onClose={() => setActiveModal(null)}
          onApply={handleApplyChargeMode}
        />
      )}

      {activeModal === "temperature" && (
        <TemperatureModal
          key={settings.cutoffTemperature}
          currentTemperature={
            settings.cutoffTemperature
          }
          onClose={() => setActiveModal(null)}
          onApply={handleApplyTemperature}
        />
      )}

      {activeModal === "themeMode" && (
        <ThemeModeModal
          key={themeMode}
          currentThemeMode={themeMode}
          onClose={() => setActiveModal(null)}
          onApply={handleApplyThemeMode}
        />
      )}
    </PageContainer>
  );
};

export default SettingsPage;

const PageContainer = styled.div`
  width: 100%;
  min-height: calc(100vh - 56px);
  padding: 22px;
  background: var(--app-background);
  transition: background 0.25s ease;

  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const PageGrid = styled.div`
  display: grid;
  grid-template-columns:
    minmax(285px, 390px)
    minmax(0, 1fr);
  align-items: start;
  gap: 18px;

  @media (max-width: 950px) {
    grid-template-columns: 1fr;
  }
`;

const LeftColumn = styled.aside`
  position: sticky;
  top: 78px;

  @media (max-width: 950px) {
    position: static;
  }
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 0;
`;