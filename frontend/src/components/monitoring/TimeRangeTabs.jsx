import styled from "styled-components";

const ranges = [
  {
    id: "realtime",
    label: "실시간",
  },
  {
    id: "hour",
    label: "1시간",
  },
  {
    id: "today",
    label: "오늘",
  },
  {
    id: "week",
    label: "7일",
  },
];

const TimeRangeTabs = ({
  selectedRange,
  onChangeRange,
}) => {
  return (
    <Tabs aria-label="모니터링 기간 선택">
      {ranges.map((range) => (
        <TabButton
          key={range.id}
          type="button"
          $isSelected={selectedRange === range.id}
          onClick={() => onChangeRange(range.id)}
        >
          {range.id === "realtime" && <LiveDot />}
          {range.label}
        </TabButton>
      ))}
    </Tabs>
  );
};

export default TimeRangeTabs;

const Tabs = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;

  @media (max-width: 560px) {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 3px;
  }
`;

const TabButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 66px;
  height: 34px;
  padding: 0 16px;
  border: 1px solid
    ${({ $isSelected }) =>
      $isSelected ? "#4d63f5" : "#e1e6ee"};
  border-radius: 18px;
  color: ${({ $isSelected }) =>
    $isSelected ? "#ffffff" : "#4d596e"};
  background: ${({ $isSelected }) =>
    $isSelected ? "#4d63f5" : "#ffffff"};
  box-shadow: ${({ $isSelected }) =>
    $isSelected
      ? "0 5px 12px rgba(77, 99, 245, 0.23)"
      : "none"};
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: ${({ $isSelected }) =>
      $isSelected ? "#ffffff" : "#4d63f5"};
    border-color: #aab9ff;
    background: ${({ $isSelected }) =>
      $isSelected ? "#4055e8" : "#f3f6ff"};
    transform: translateY(-1px);
  }
`;

const LiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #aebaff;
`;