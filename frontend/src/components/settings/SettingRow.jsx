import styled from "styled-components";
import { ChevronRight } from "lucide-react";

import ToggleSwitch from "./ToggleSwitch";

const SettingRow = ({
  item,
  checked = false,
  valueText = "",
  onToggle,
  onClick,
}) => {
  if (!item) {
    return null;
  }

  const Icon = item.icon;

  const isClickable =
    item.type === "detail" ||
    item.type === "temperature" ||
    item.type === "theme";

  const handleRowClick = () => {
    if (isClickable) {
      onClick?.();
    }
  };

  const handleKeyDown = (event) => {
    if (!isClickable) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <Row
      $isClickable={isClickable}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
    >
      <LeftArea>
        <IconBox
          $color={item.iconColor ?? "#65758b"}
          $background={
            item.iconBackground ?? "#f3f5f8"
          }
        >
          {Icon && <Icon size={18} strokeWidth={2} />}
        </IconBox>

        <TextArea>
          <Title>{item.title ?? ""}</Title>
          <Description>
            {item.description ?? ""}
          </Description>
        </TextArea>
      </LeftArea>

      <RightArea>
        {item.type === "toggle" && (
          <ToggleSwitch
            checked={checked}
            ariaLabel={`${item.title} ${
              checked ? "끄기" : "켜기"
            }`}
            onChange={onToggle}
          />
        )}

        {isClickable && (
          <>
            {valueText && (
              <ValueBadge>{valueText}</ValueBadge>
            )}

            <ChevronRight
              size={16}
              strokeWidth={2}
            />
          </>
        )}
      </RightArea>
    </Row>
  );
};

export default SettingRow;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 68px;
  padding: 12px 18px;
  border-top: 1px solid var(--app-divider);
  color: inherit;
  background: var(--app-surface);
  cursor: ${({ $isClickable }) =>
    $isClickable ? "pointer" : "default"};
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:first-child {
    border-top: none;
  }

  &:hover {
    background: var(--app-surface-hover);
  }

  &:focus-visible {
    position: relative;
    z-index: 1;
    outline: 2px solid var(--app-primary);
    outline-offset: -2px;
  }
`;

const LeftArea = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

const IconBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 39px;
  height: 39px;
  border-radius: 50%;
  color: ${({ $color }) => $color};
  background: ${({ $background }) => $background};
`;

const TextArea = styled.div`
  min-width: 0;
`;

const Title = styled.strong`
  display: block;
  color: var(--app-text-primary);
  font-size: 13px;
  font-weight: 800;
`;

const Description = styled.span`
  display: block;
  margin-top: 4px;
  color: var(--app-text-muted);
  font-size: 10px;
  font-weight: 550;
`;

const RightArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  color: #bbc4d2;
`;

const ValueBadge = styled.strong`
  padding: 6px 10px;
  border: 1px solid #dce4ff;
  border-radius: 14px;
  color: var(--app-primary);
  background: #f2f5ff;
  font-size: 11px;
  font-weight: 800;
`;