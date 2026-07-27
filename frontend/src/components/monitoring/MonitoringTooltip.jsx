import styled from "styled-components";

const MonitoringTooltip = ({
  active,
  payload,
  label,
  metricLabel,
  unit,
  color,
  valueKey,
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0]?.payload;
  const value = data?.[valueKey];

  if (value === undefined || value === null) {
    return null;
  }

  return (
    <TooltipBox>
      <TimeText>{label}</TimeText>

      <ValueText $color={color}>
        {metricLabel} : {value}
        {unit}
      </ValueText>
    </TooltipBox>
  );
};

export default MonitoringTooltip;

const TooltipBox = styled.div`
  min-width: 142px;
  padding: 13px 14px;
  border: 1px solid #edf0f4;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 9px 24px rgba(22, 32, 54, 0.16);
`;

const TimeText = styled.p`
  color: #222b3e;
  font-size: 12px;
  font-weight: 750;
`;

const ValueText = styled.p`
  margin-top: 8px;
  color: ${({ $color }) => $color};
  font-size: 11px;
  font-weight: 650;
`;