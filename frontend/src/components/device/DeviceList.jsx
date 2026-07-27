import { useState } from "react";
import styled from "styled-components";

import DeviceRow from "./DeviceRow";

const DeviceList = ({
  devices,
  onDelete,
  onMonitoring,
}) => {
  const [expandedDeviceId, setExpandedDeviceId] =
    useState(null);

  const handleToggle = (deviceId) => {
    setExpandedDeviceId((previous) =>
      previous === deviceId ? null : deviceId
    );
  };

  return (
    <ListCard>
      <ListHeader>등록된 기기</ListHeader>

      {devices.length === 0 ? (
        <EmptyState>
          등록된 기기가 없습니다. 기기를 추가해주세요.
        </EmptyState>
      ) : (
        devices.map((device) => (
          <DeviceRow
            key={device.id}
            device={device}
            isExpanded={expandedDeviceId === device.id}
            onToggle={() => handleToggle(device.id)}
            onDelete={onDelete}
            onMonitoring={onMonitoring}
          />
        ))
      )}
    </ListCard>
  );
};

export default DeviceList;

const ListCard = styled.section`
  margin-top: 17px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(29, 42, 72, 0.05);
`;

const ListHeader = styled.h3`
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 21px;
  border-bottom: 1px solid #edf0f4;
  color: #293349;
  font-size: 13px;
  font-weight: 800;
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  color: #95a0b3;
  font-size: 13px;
  text-align: center;
`;