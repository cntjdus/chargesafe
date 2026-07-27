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

  const isDetailRow =
    item.type === "detail" ||
    item.type === "temperature";

  const handleRowClick = () => {
    if (isDetailRow) {
      onClick?.();
    }
  };

  return (
    <Row
      type="button"
      $isClickable={isDetailRow}
      onClick={handleRowClick}
    >
      <LeftArea>
        <IconBox
          $color={item.iconColor ?? "#65758b"}
          $background={item.iconBackground ?? "#f3f5f8"}
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

        {isDetailRow && (
          <>
            <ValueText>{valueText}</ValueText>
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

const Row = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 68px;
  padding: 12px 18px;
  border: none;
  border-top: 1px solid #edf0f4;
  color: inherit;
  background: #ffffff;
  cursor: ${({ $isClickable }) =>
    $isClickable ? "pointer" : "default"};
  text-align: left;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:first-child {
    border-top: none;
  }

  &:hover {
    background: #f8fafc;
  }

  &:focus-visible {
    position: relative;
    z-index: 1;
    outline: 2px solid #7d94fb;
    outline-offset: -2px;
  }
`;

const LeftArea = styled.span`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

const IconBox = styled.span`
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

const TextArea = styled.span`
  display: block;
  min-width: 0;
`;

const Title = styled.strong`
  display: block;
  color: #192338;
  font-size: 13px;
  font-weight: 800;
`;

const Description = styled.span`
  display: block;
  margin-top: 4px;
  color: #929eb2;
  font-size: 10px;
  font-weight: 550;
`;

const RightArea = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  color: #bbc4d2;
`;

const ValueText = styled.strong`
  color: #566278;
  font-size: 12px;
  font-weight: 750;
`;