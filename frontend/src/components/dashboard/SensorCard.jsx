import styled from "styled-components";

const SensorCard = ({
  icon: Icon,
  value,
  unit,
  label,
  valueColor,
  iconColor,
  iconBackground,
  progress,
  progressColor,
}) => {
  return (
    <Card>
      <Header>
        <IconBox
          $iconColor={iconColor}
          $iconBackground={iconBackground}
        >
          <Icon size={18} />
        </IconBox>

        <StatusBadge>정상</StatusBadge>
      </Header>

      <ValueArea>
        <Value $valueColor={valueColor}>{value}</Value>
        <Unit>{unit}</Unit>
      </ValueArea>

      <Label>{label}</Label>

      <ProgressTrack>
        <Progress
          $progress={progress}
          $progressColor={progressColor}
        />
      </ProgressTrack>
    </Card>
  );
};

export default SensorCard;

const Card = styled.article`
  min-height: 140px;
  padding: 17px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(30, 44, 74, 0.05);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 9px 20px rgba(30, 44, 74, 0.09);
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const IconBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  color: ${({ $iconColor }) => $iconColor};
  background: ${({ $iconBackground }) => $iconBackground};
`;

const StatusBadge = styled.span`
  padding: 4px 8px;
  border-radius: 10px;
  color: #499c54;
  background: #f1faef;
  font-size: 10px;
  font-weight: 700;
`;

const ValueArea = styled.div`
  display: flex;
  align-items: flex-end;
  margin-top: 12px;
`;

const Value = styled.strong`
  color: ${({ $valueColor }) => $valueColor};
  font-size: 29px;
  font-weight: 850;
  line-height: 1;
`;

const Unit = styled.span`
  margin: 0 0 3px 4px;
  color: #8794aa;
  font-size: 11px;
`;

const Label = styled.p`
  margin-top: 6px;
  color: #626f84;
  font-size: 12px;
  font-weight: 650;
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 5px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 10px;
  background: #eef1f5;
`;

const Progress = styled.div`
  width: ${({ $progress }) => `${$progress}%`};
  height: 100%;
  border-radius: inherit;
  background: ${({ $progressColor }) => $progressColor};
`;