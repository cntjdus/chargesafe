import { useMemo, useState } from "react";
import styled from "styled-components";

import DeviceRow from "./DeviceRow";

const DeviceList = ({
  devices = [],
  onDelete,
  onMonitoring,
  onOpenSettings,
  onToggleFavorite,
}) => {
  const [expandedDeviceId, setExpandedDeviceId] = useState(null);

  const sortedDevices = useMemo(() => {
    return devices
      .map((device, index) => ({
        ...device,
        originalIndex: index,
      }))
      .sort((firstDevice, secondDevice) => {
        const firstIsFavorite = Boolean(firstDevice.isFavorite);
        const secondIsFavorite = Boolean(secondDevice.isFavorite);

        if (firstIsFavorite !== secondIsFavorite) {
          return firstIsFavorite ? -1 : 1;
        }

        return firstDevice.originalIndex - secondDevice.originalIndex;
      });
  }, [devices]);

  const handleToggleDevice = (deviceId) => {
    setExpandedDeviceId((previousId) =>
      previousId === deviceId ? null : deviceId
    );
  };

  const handleDelete = (deviceId) => {
    if (expandedDeviceId === deviceId) {
      setExpandedDeviceId(null);
    }

    onDelete?.(deviceId);
  };

  const handleMonitoring = (device) => {
    onMonitoring?.(device);
  };

  const handleOpenSettings = (device) => {
    onOpenSettings?.(device);
  };

  const handleToggleFavorite = (deviceId) => {
    onToggleFavorite?.(deviceId);
  };

  return (
    <ListCard>
      <ListHeader>
        <ListTitle>등록된 기기</ListTitle>

        <FavoriteGuide>
          ★ 즐겨찾기 기기는 상단에 고정됩니다
        </FavoriteGuide>
      </ListHeader>

      {sortedDevices.length === 0 ? (
        <EmptyState>
          등록된 기기가 없습니다. 기기를 추가해주세요.
        </EmptyState>
      ) : (
        <DeviceRows>
          {sortedDevices.map((device) => (
            <DeviceRow
              key={device.id}
              device={device}
              isExpanded={expandedDeviceId === device.id}
              onToggle={() => handleToggleDevice(device.id)}
              onDelete={() => handleDelete(device.id)}
              onMonitoring={() => handleMonitoring(device)}
              onOpenSettings={() => handleOpenSettings(device)}
              onToggleFavorite={() =>
                handleToggleFavorite(device.id)
              }
            />
          ))}
        </DeviceRows>
      )}
    </ListCard>
  );
};

export default DeviceList;

const ListCard = styled.section`
  width: 100%;
  margin-top: 17px;
  overflow: hidden;
  border: 1px solid
    ${({ theme }) => theme?.colors?.border ?? "#e3e8f0"};
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(29, 42, 72, 0.05);
`;

const ListHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 49px;
  padding: 0 21px;
  border-bottom: 1px solid #edf0f4;
`;

const ListTitle = styled.h3`
  color: #293349;
  font-size: 13px;
  font-weight: 800;
`;

const FavoriteGuide = styled.span`
  color: #9aa6b8;
  font-size: 10px;
  font-weight: 600;

  @media (max-width: 600px) {
    display: none;
  }
`;

const DeviceRows = styled.div`
  width: 100%;
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  color: #95a0b3;
  font-size: 13px;
  text-align: center;
`;