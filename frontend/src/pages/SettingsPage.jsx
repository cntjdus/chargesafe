import { useMemo, useState } from "react";
import styled from "styled-components";

import ChargeModeModal from "../components/settings/ChargeModeModal";
import ProfileCard from "../components/settings/ProfileCard";
import SettingsSection from "../components/settings/SettingsSection";
import SystemInfoCard from "../components/settings/SystemInfoCard";
import TemperatureModal from "../components/settings/TemperatureModal";

import {
  chargeModes,
  defaultSettings,
  settingSectionData,
} from "../data/settingsData";

const MOCK_USER = {
  name: "김철수",
  description: "전동휠체어 사용자",
};

const MOCK_GUARDIAN = {
  name: "김보호",
  relation: "딸",
};

const SettingsPage = () => {
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

  return (
    <PageContainer>
      <PageGrid>
        <LeftColumn>
          <ProfileCard
            user={MOCK_USER}
            guardian={MOCK_GUARDIAN}
            deviceId="CS-0042"
          />

          <SystemInfoCard />
        </LeftColumn>

        <RightColumn>
          <SettingsSection
            title={settingSectionData.device.title}
            items={settingSectionData.device.items}
            settings={settings}
            chargeModeLabel={
              selectedChargeMode.name
            }
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
            onToggle={handleToggle}
          />

          <SettingsSection
            title={settingSectionData.safety.title}
            items={settingSectionData.safety.items}
            settings={settings}
            chargeModeLabel={
              selectedChargeMode.name
            }
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
            onToggle={handleToggle}
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
    </PageContainer>
  );
};

export default SettingsPage;

const PageContainer = styled.div`
  width: 100%;
  padding: 22px;

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