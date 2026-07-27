import styled from "styled-components";

const MetricSummaryCard = ({
  label,
  value,
  unit,
  threshold,
  status,
  valueColor,
}) => {
  const isNormal = status === "normal";

  return (
    <Card>
      <TextArea>
        <Label>{label}</Label>

        <Value $valueColor={valueColor}>
          {value}
          <Unit>{unit}</Unit>
        </Value>

        <Threshold>{threshold}</Threshold>
      </TextArea>

      <StatusBadge $isNormal={isNormal}>
        {isNormal ? "정상" : "주의"}
      </StatusBadge>
    </Card>
  );
};

export default MetricSummaryCard;

const Card = styled.article`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  min-height: 92px;
  padding: 17px 19px;
  border: 1px solid
    ${({ theme }) =>
      theme?.colors?.border ?? "#e2e7ef"};
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(29, 42, 72, 0.05);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #ccd6ff;
    box-shadow: 0 9px 21px rgba(37, 52, 86, 0.1);
    transform: translateY(-3px);
  }
`;

const TextArea = styled.div`
  min-width: 0;
`;

const Label = styled.p`
  color: #98a4b7;
  font-size: 11px;
  font-weight: 650;
`;

const Value = styled.strong`
  display: block;
  margin-top: 4px;
  color: ${({ $valueColor }) => $valueColor};
  font-size: 24px;
  font-weight: 850;
  line-height: 1;
`;

const Unit = styled.span`
  margin-left: 2px;
  color: inherit;
  font-size: 17px;
  font-weight: 750;
`;

const Threshold = styled.p`
  margin-top: 7px;
  color: #a0aabd;
  font-size: 10px;
  font-weight: 550;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 39px;
  padding: 6px 10px;
  border-radius: 14px;
  color: ${({ $isNormal }) =>
    $isNormal ? "#438f4e" : "#c27a00"};
  background: ${({ $isNormal }) =>
    $isNormal ? "#f0faef" : "#fff9e6"};
  font-size: 10px;
  font-weight: 800;
`;