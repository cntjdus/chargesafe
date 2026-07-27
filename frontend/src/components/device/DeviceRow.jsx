import styled from "styled-components";
import {
  BatteryCharging,
  ChevronDown,
  ChevronUp,
  Settings,
  Trash2,
} from "lucide-react";

const DeviceRow = ({
  device,
  isExpanded,
  onToggle,
  onDelete,
  onMonitoring,
}) => {
  const statusInfo = getStatusInfo(device.status);
  const batteryColor = getBatteryColor(device);

  const handleDelete = (event) => {
    event.stopPropagation();
    onDelete(device.id);
  };

  const handleMonitoring = (event) => {
    event.stopPropagation();
    onMonitoring(device);
  };

  return (
    <RowContainer>
      <DeviceMainRow
        type="button"
        onClick={onToggle}
        $isExpanded={isExpanded}
      >
        <DeviceInfo>
          <DeviceIcon $isOffline={device.status === "offline"}>
            <BatteryCharging size={18} strokeWidth={2} />
          </DeviceIcon>

          <DeviceText>
            <NameLine>
              <DeviceName>{device.name}</DeviceName>

              {device.needsUpdate && (
                <UpdateBadge>업데이트 필요</UpdateBadge>
              )}
            </NameLine>

            <DeviceDescription>
              {device.location}
              <Separator>·</Separator>
              {device.id}
              <Separator>·</Separator>
              마지막 연결:{" "}
              <StrongText>{device.lastConnected}</StrongText>
            </DeviceDescription>
          </DeviceText>
        </DeviceInfo>

        <DeviceStateArea>
          <BatteryArea>
            <BatteryTop>
              <BatteryLabel>배터리</BatteryLabel>
              <BatteryValue $color={batteryColor}>
                {device.battery}%
              </BatteryValue>
            </BatteryTop>

            <BatteryTrack>
              <BatteryProgress
                $value={device.battery}
                $color={batteryColor}
              />
            </BatteryTrack>
          </BatteryArea>

          <StatusBadge
            $background={statusInfo.background}
            $color={statusInfo.color}
            $border={statusInfo.border}
          >
            {statusInfo.label}
          </StatusBadge>

          <ChevronArea>
            {isExpanded ? (
              <ChevronUp size={17} />
            ) : (
              <ChevronDown size={17} />
            )}
          </ChevronArea>
        </DeviceStateArea>
      </DeviceMainRow>

      {isExpanded && (
        <ExpandedArea>
          <SettingsButton type="button">
            <Settings size={17} />
            설정
          </SettingsButton>

          <MonitoringButton
            type="button"
            onClick={handleMonitoring}
          >
            모니터링
          </MonitoringButton>

          <DeleteButton
            type="button"
            aria-label={`${device.name} 삭제`}
            onClick={handleDelete}
          >
            <Trash2 size={17} />
          </DeleteButton>
        </ExpandedArea>
      )}
    </RowContainer>
  );
};

export default DeviceRow;

const getStatusInfo = (status) => {
  switch (status) {
    case "charging":
      return {
        label: "충전 중",
        color: "#5368ef",
        background: "#f0f3ff",
        border: "#e1e7ff",
      };

    case "connected":
      return {
        label: "연결됨",
        color: "#4c9957",
        background: "#eef9ef",
        border: "#d9eedc",
      };

    case "offline":
      return {
        label: "오프라인",
        color: "#e04448",
        background: "#fff1ef",
        border: "#f4dcda",
      };

    case "standby":
    default:
      return {
        label: "대기 중",
        color: "#536076",
        background: "#f8fafc",
        border: "#e3e7ed",
      };
  }
};

const getBatteryColor = (device) => {
  if (device.status === "offline") {
    return "#f08c91";
  }

  if (device.status === "charging") {
    return "#7399ff";
  }

  if (device.battery <= 40) {
    return "#efb70d";
  }

  return "#66d47a";
};

const RowContainer = styled.div`
  border-bottom: 1px solid #edf0f4;

  &:last-child {
    border-bottom: none;
  }
`;

const DeviceMainRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 68px;
  padding: 10px 20px;
  border: 0;
  background: ${({ $isExpanded }) =>
    $isExpanded ? "#f8fafc" : "#ffffff"};
  cursor: pointer;
  text-align: left;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: #f8fafc;
  }

  &:focus-visible {
    outline: 2px solid #7890ff;
    outline-offset: -2px;
  }

  @media (max-width: 760px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 15px;
  }
`;

const DeviceInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

const DeviceIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: ${({ $isOffline }) =>
    $isOffline ? "#cdd5e3" : "#5575f5"};
  background: ${({ $isOffline }) =>
    $isOffline ? "#f3f5f8" : "#f0f4ff"};
`;

const DeviceText = styled.div`
  min-width: 0;
`;

const NameLine = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
`;

const DeviceName = styled.strong`
  color: #1d2639;
  font-size: 13px;
  font-weight: 800;
`;

const UpdateBadge = styled.span`
  padding: 4px 7px;
  border-radius: 9px;
  color: #dd8b00;
  background: #fff7dd;
  font-size: 9px;
  font-weight: 750;
`;

const DeviceDescription = styled.p`
  margin-top: 4px;
  color: #8f9bb0;
  font-size: 10px;
  font-weight: 550;
  white-space: nowrap;
`;

const Separator = styled.span`
  margin: 0 7px;
`;

const StrongText = styled.strong`
  color: #617087;
`;

const DeviceStateArea = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  flex-shrink: 0;

  @media (max-width: 760px) {
    width: 100%;
  }
`;

const BatteryArea = styled.div`
  width: 105px;
`;

const BatteryTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const BatteryLabel = styled.span`
  color: #9aa5b8;
  font-size: 10px;
`;

const BatteryValue = styled.strong`
  color: ${({ $color }) => $color};
  font-size: 10px;
  font-weight: 800;
`;

const BatteryTrack = styled.div`
  width: 100%;
  height: 5px;
  margin-top: 6px;
  overflow: hidden;
  border-radius: 10px;
  background: #edf0f4;
`;

const BatteryProgress = styled.div`
  width: ${({ $value }) =>
    `${Math.min(Math.max($value, 0), 100)}%`};
  height: 100%;
  border-radius: inherit;
  background: ${({ $color }) => $color};
  transition: width 0.4s ease;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 54px;
  padding: 5px 9px;
  border: 1px solid ${({ $border }) => $border};
  border-radius: 13px;
  color: ${({ $color }) => $color};
  background: ${({ $background }) => $background};
  font-size: 10px;
  font-weight: 750;
`;

const ChevronArea = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b2bdce;
`;

const ExpandedArea = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 43px;
  gap: 10px;
  padding: 13px 20px;
  border-top: 1px solid #e8ecf2;
  border-bottom: 1px solid #d8dde6;
  background: #f8fafc;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const BaseActionButton = styled.button`
  min-height: 42px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

const SettingsButton = styled(BaseActionButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #dfe5f5;
  color: #5269f4;
  background: #ffffff;

  &:hover {
    border-color: #bfcaff;
    background: #f2f5ff;
  }
`;

const MonitoringButton = styled(BaseActionButton)`
  color: #ffffff;
  background: #4d63f5;

  &:hover {
    background: #3f54e8;
    box-shadow: 0 8px 18px rgba(77, 99, 245, 0.2);
  }
`;

const DeleteButton = styled(BaseActionButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #f5dad9;
  color: #ef6a6e;
  background: #fff7f6;

  &:hover {
    color: #ffffff;
    border-color: #e95559;
    background: #e95559;
  }
`;