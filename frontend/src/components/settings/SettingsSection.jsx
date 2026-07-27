import styled from "styled-components";

import SettingRow from "./SettingRow";

const SettingsSection = ({
  title,
  items,
  settings,
  chargeModeLabel,
  themeModeLabel,
  onToggle,
  onOpenChargeMode,
  onOpenTemperature,
  onOpenThemeMode,
}) => {
  const getValueText = (item) => {
    switch (item.type) {
      case "detail":
        return chargeModeLabel;

      case "temperature":
        return `${settings.cutoffTemperature}°C`;

      case "theme":
        return themeModeLabel;

      default:
        return "";
    }
  };

  const handleRowClick = (item) => {
    switch (item.type) {
      case "detail":
        onOpenChargeMode?.();
        break;

      case "temperature":
        onOpenTemperature?.();
        break;

      case "theme":
        onOpenThemeMode?.();
        break;

      default:
        break;
    }
  };

  return (
    <SectionCard>
      <SectionTitle>{title}</SectionTitle>

      <Rows>
        {items.map((item) => (
          <SettingRow
            key={item.id}
            item={item}
            checked={Boolean(settings[item.id])}
            valueText={getValueText(item)}
            onToggle={(nextValue) =>
              onToggle?.(item.id, nextValue)
            }
            onClick={() => handleRowClick(item)}
          />
        ))}
      </Rows>
    </SectionCard>
  );
};

export default SettingsSection;

const SectionCard = styled.section`
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 17px;
  background: var(--app-surface);
  box-shadow: var(--app-shadow);
`;

const SectionTitle = styled.h3`
  min-height: 45px;
  padding: 16px 18px 10px;
  color: var(--app-text-muted);
  font-size: 11px;
  font-weight: 750;
`;

const Rows = styled.div`
  width: 100%;
`;