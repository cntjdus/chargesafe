import { useMemo, useState } from "react";
import styled from "styled-components";
import { Plus } from "lucide-react";

import AddDeviceModal from "../components/device/AddDeviceModal";
import DeviceList from "../components/device/DeviceList";
import DeviceSettingsModal from "../components/device/DeviceSettingsModal";
import DeviceStatsSection from "../components/device/DeviceStatsSection";

import {
  discoverableDevices,
  initialDevices,
} from "../data/mockDevices";

const DeviceManagementPage = ({
  onNavigateMonitoring,
}) => {
  const [devices, setDevices] = useState(initialDevices);

  const [isAddModalOpen, setIsAddModalOpen] =
    useState(false);

  const [settingsDevice, setSettingsDevice] =
    useState(null);

  const availableDevices = useMemo(() => {
    const registeredIds = new Set(
      devices.map((device) => device.id)
    );

    return discoverableDevices.filter(
      (device) => !registeredIds.has(device.id)
    );
  }, [devices]);

  const handleConnectDevice = (device) => {
    const isAlreadyRegistered = devices.some(
      (registeredDevice) =>
        registeredDevice.id === device.id
    );

    if (isAlreadyRegistered) {
      return;
    }

    const newDevice = {
      ...device,
      lastConnected: "지금",
      status: "connected",
      needsUpdate: false,
      isFavorite: false,
    };

    setDevices((previous) => [
      ...previous,
      newDevice,
    ]);
  };

  const handleDeleteDevice = (deviceId) => {
    const targetDevice = devices.find(
      (device) => device.id === deviceId
    );

    const shouldDelete = window.confirm(
      `${targetDevice?.name ?? "이 기기"}를 삭제하시겠습니까?`
    );

    if (!shouldDelete) {
      return;
    }

    setDevices((previous) =>
      previous.filter((device) => device.id !== deviceId)
    );

    if (settingsDevice?.id === deviceId) {
      setSettingsDevice(null);
    }
  };

  const handleToggleFavorite = (deviceId) => {
    setDevices((previous) =>
      previous.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              isFavorite: !device.isFavorite,
            }
          : device
      )
    );
  };

  const handleSaveSettings = (updatedDevice) => {
    setDevices((previous) =>
      previous.map((device) =>
        device.id === updatedDevice.id
          ? updatedDevice
          : device
      )
    );

    setSettingsDevice(null);
  };

  return (
    <PageContainer>
      <PageTop>
        <PageTitle>기기 관리</PageTitle>

        <AddDeviceButton
          type="button"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus size={18} />
          기기 추가
        </AddDeviceButton>
      </PageTop>

      <DeviceStatsSection devices={devices} />

      <DeviceList
        devices={devices}
        onDelete={handleDeleteDevice}
        onMonitoring={onNavigateMonitoring}
        onOpenSettings={setSettingsDevice}
        onToggleFavorite={handleToggleFavorite}
      />

      {isAddModalOpen && (
        <AddDeviceModal
          devices={availableDevices}
          onClose={() => setIsAddModalOpen(false)}
          onConnect={handleConnectDevice}
        />
      )}

      {settingsDevice && (
        <DeviceSettingsModal
          device={settingsDevice}
          onClose={() => setSettingsDevice(null)}
          onSave={handleSaveSettings}
        />
      )}
    </PageContainer>
  );
};

export default DeviceManagementPage;

const PageContainer = styled.div`
  width: 100%;
  padding: 22px;

  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const PageTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
`;

const PageTitle = styled.h2`
  color: #1a2335;
  font-size: 18px;
  font-weight: 850;
`;

const AddDeviceButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 39px;
  padding: 0 18px;
  border-radius: 20px;
  color: #ffffff;
  background: #4d63f5;
  box-shadow: 0 7px 17px rgba(77, 99, 245, 0.2);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #3f54e6;
    box-shadow: 0 10px 22px rgba(77, 99, 245, 0.29);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;