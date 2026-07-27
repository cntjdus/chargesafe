import styled from "styled-components";

const ChargingHistoryRow = ({ history }) => {
  const isBlocked = history.status === "blocked";
  const isDanger = history.maxTemperature >= 50;

  return (
    <Row>
      <DateCell>
        <StatusDot $isBlocked={isBlocked} />

        <DateText>
          <DateTitle>{history.date}</DateTitle>
          <DateLabel>{history.dateLabel}</DateLabel>
        </DateText>
      </DateCell>

      <Cell>{history.startTime}</Cell>
      <Cell>{history.endTime}</Cell>
      <DurationCell>{history.chargingDuration}</DurationCell>
      <Cell>{history.startBattery}%</Cell>
      <EndBatteryCell>{history.endBattery}%</EndBatteryCell>

      <TemperatureCell $isDanger={isDanger}>
        {history.maxTemperature}°C
      </TemperatureCell>

      <StatusCell>
        <StatusBadge $isBlocked={isBlocked}>
          {isBlocked ? "자동 차단" : "정상 완료"}
        </StatusBadge>
      </StatusCell>
    </Row>
  );
};

export default ChargingHistoryRow;

const Row = styled.tr`
  height: 59px;
  border-bottom: 1px solid #f0f2f6;
  background: #ffffff;
  transition: background 0.18s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f7f9fc;
  }

  td {
    padding: 11px 16px;
    vertical-align: middle;
  }
`;

const DateCell = styled.td`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${({ $isBlocked }) =>
    $isBlocked ? "#ef6a6d" : "#69d67b"};
`;

const DateText = styled.div``;

const DateTitle = styled.strong`
  display: block;
  color: #20283b;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
`;

const DateLabel = styled.span`
  display: block;
  margin-top: 2px;
  color: #a1aabd;
  font-size: 10px;
`;

const Cell = styled.td`
  color: #374259;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
`;

const DurationCell = styled(Cell)`
  color: #192136;
  font-weight: 800;
`;

const EndBatteryCell = styled(Cell)`
  color: #4d63f5;
  font-weight: 800;
`;

const TemperatureCell = styled(Cell)`
  color: ${({ $isDanger }) => ($isDanger ? "#e02424" : "#252e42")};
  font-weight: 800;
`;

const StatusCell = styled.td`
  white-space: nowrap;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 65px;
  padding: 5px 10px;
  border-radius: 13px;
  color: ${({ $isBlocked }) =>
    $isBlocked ? "#df3d40" : "#438e4e"};
  background: ${({ $isBlocked }) =>
    $isBlocked ? "#fff1ef" : "#f1fbf2"};
  font-size: 10px;
  font-weight: 750;
`;