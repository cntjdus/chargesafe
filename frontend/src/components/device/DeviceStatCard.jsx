import styled from "styled-components";

const DeviceStatCard = ({
  value,
  label,
  variant = "default",
}) => {
  return (
    <Card $variant={variant}>
      <Value $variant={variant}>{value}</Value>
      <Label $variant={variant}>{label}</Label>
    </Card>
  );
};

export default DeviceStatCard;

const variants = {
  default: {
    background: "#ffffff",
    border: "#e2e7ef",
    value: "#172033",
    label: "#748198",
  },
  charging: {
    background: "#f1f5ff",
    border: "#dce5ff",
    value: "#4d63f5",
    label: "#6177e7",
  },
  offline: {
    background: "#fff5f3",
    border: "#f4dbd8",
    value: "#df4449",
    label: "#ea6064",
  },
};

const Card = styled.article`
  min-height: 82px;
  padding: 18px 17px;
  border: 1px solid
    ${({ $variant }) =>
      variants[$variant]?.border ?? variants.default.border};
  border-radius: 16px;
  background: ${({ $variant }) =>
    variants[$variant]?.background ??
    variants.default.background};
  box-shadow: 0 2px 5px rgba(29, 42, 72, 0.04);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    border-color: #cbd6ff;
    box-shadow: 0 9px 22px rgba(38, 54, 94, 0.1);
    transform: translateY(-3px);
  }
`;

const Value = styled.strong`
  display: block;
  color: ${({ $variant }) =>
    variants[$variant]?.value ?? variants.default.value};
  font-size: 25px;
  font-weight: 850;
  line-height: 1;
`;

const Label = styled.p`
  margin-top: 7px;
  color: ${({ $variant }) =>
    variants[$variant]?.label ?? variants.default.label};
  font-size: 12px;
  font-weight: 650;
`;