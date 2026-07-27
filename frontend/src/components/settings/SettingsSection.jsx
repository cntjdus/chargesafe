import styled from "styled-components";

import SettingRow from "./SettingRow";

const SettingsSection = ({
  title,
  items,
  settings,
  chargeModeLabel,
  onToggle,
  onOpenChargeMode,
  onOpenTemperature,
}) => {
  const getValueText = (item) => {
    if (item.type === "detail") {
      return chargeModeLabel;
    }

    if (item.type === "temperature") {
      return `${settings.cutoffTemperature}°C`;
    }

    return "";
  };

  const handleClick = (item) => {
    if (item.type === "detail") {
      onOpenChargeMode?.();
    }

    if (item.type === "temperature") {
      onOpenTemperature?.();
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
            onClick={() => handleClick(item)}
          />
        ))}
      </Rows>
    </SectionCard>
  );
};

export default SettingsSection;

const SectionCard = styled.section`
  overflow: hidden;
  border: 1px solid #e1e6ee;
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(32, 45, 74, 0.05);
`;

const SectionTitle = styled.h3`
  min-height: 45px;
  padding: 16px 18px 10px;
  color: #929db1;
  font-size: 11px;
  font-weight: 750;
`;

const Rows = styled.div`
  width: 100%;
`;