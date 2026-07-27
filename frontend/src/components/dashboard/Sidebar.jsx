import styled from "styled-components";
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cpu,
  House,
  Settings,
  TriangleAlert,
  Zap,
} from "lucide-react";

const menuItems = [
  {
    id: "dashboard",
    label: "대시보드",
    icon: House,
  },
  {
    id: "monitoring",
    label: "모니터링",
    icon: Activity,
  },
  {
    id: "history",
    label: "충전 이력",
    icon: ClipboardList,
  },
  {
    id: "notifications",
    label: "알림 센터",
    icon: Bell,
    hasNotification: true,
  },
  {
    id: "devices",
    label: "기기 관리",
    icon: Cpu,
  },
  {
    id: "settings",
    label: "설정",
    icon: Settings,
  },
];

const Sidebar = ({
  isCollapsed,
  onToggle,
  selectedMenu,
  onSelectMenu,
  deviceId,
  chargePercent,
  chargingStatus,
  onEmergencyClick,
}) => {
  return (
    <SidebarContainer $isCollapsed={isCollapsed}>
      <LogoArea $isCollapsed={isCollapsed}>
        <LogoIcon>
          <Zap size={18} strokeWidth={2.4} />
        </LogoIcon>

        {!isCollapsed && <LogoText>ChargeSafe</LogoText>}
      </LogoArea>

      {!isCollapsed && (
        <ChargingStatus>
          <StatusDot />

          <div>
            <StatusTitle>정상 {chargingStatus}</StatusTitle>
            <StatusDescription>
              {deviceId} · {chargePercent}%
            </StatusDescription>
          </div>
        </ChargingStatus>
      )}

      <MenuList>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = selectedMenu === item.id;

          return (
            <MenuButton
              key={item.id}
              type="button"
              $isActive={isActive}
              $isCollapsed={isCollapsed}
              onClick={() => onSelectMenu(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <MenuIconArea>
                <Icon size={18} strokeWidth={1.9} />

                {item.hasNotification && <NotificationDot />}
              </MenuIconArea>

              {!isCollapsed && <MenuLabel>{item.label}</MenuLabel>}
            </MenuButton>
          );
        })}
      </MenuList>

      <EmergencyButton
        type="button"
        $isCollapsed={isCollapsed}
        onClick={onEmergencyClick}
        title={isCollapsed ? "긴급 알림" : undefined}
      >
        <TriangleAlert size={18} />

        {!isCollapsed && <span>긴급 알림</span>}
      </EmergencyButton>

      <ToggleButton
        type="button"
        onClick={onToggle}
        aria-label={
          isCollapsed ? "사이드바 펼치기" : "사이드바 접기"
        }
      >
        {isCollapsed ? (
          <ChevronRight size={17} />
        ) : (
          <ChevronLeft size={17} />
        )}
      </ToggleButton>
    </SidebarContainer>
  );
};

export default Sidebar;

const SidebarContainer = styled.aside`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  width: ${({ $isCollapsed }) =>
    $isCollapsed ? "64px" : "214px"};
  height: 100vh;
  padding: 0 10px 12px;
  overflow: visible;
  background: #111729;
  transition: width 0.3s ease;
`;

const LogoArea = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${({ $isCollapsed }) =>
    $isCollapsed ? "center" : "flex-start"};
  gap: 12px;
  min-height: 64px;
  padding: ${({ $isCollapsed }) =>
    $isCollapsed ? "0" : "0 6px"};
`;

const LogoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #ffffff;
  background: #4e64f4;
`;

const LogoText = styled.h1`
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
  white-space: nowrap;
`;

const ChargingStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  margin: 14px 0;
  padding: 0 12px;
  border: 1px solid rgba(86, 199, 106, 0.13);
  border-radius: 17px;
  background: rgba(86, 199, 106, 0.1);
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #56c76a;
`;

const StatusTitle = styled.p`
  color: #66d977;
  font-size: 12px;
  font-weight: 700;
`;

const StatusDescription = styled.p`
  margin-top: 2px;
  color: #57b968;
  font-size: 11px;
`;

const MenuList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const MenuButton = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: ${({ $isCollapsed }) =>
    $isCollapsed ? "center" : "flex-start"};
  gap: 13px;
  width: 100%;
  height: 42px;
  padding: ${({ $isCollapsed }) =>
    $isCollapsed ? "0" : "0 13px"};
  border: 0;
  border-radius: 12px;
  color: ${({ $isActive }) =>
    $isActive ? "#ffffff" : "#9ba8c2"};
  background: ${({ $isActive }) =>
    $isActive ? "#4e64f4" : "transparent"};
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #ffffff;
    background: ${({ $isActive }) =>
      $isActive ? "#4e64f4" : "#202941"};
  }

  &:active {
    transform: scale(0.98);
  }
`;

const MenuIconArea = styled.span`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NotificationDot = styled.span`
  position: absolute;
  top: -5px;
  right: -7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f2666b;
`;

const MenuLabel = styled.span`
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
`;

const EmergencyButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: ${({ $isCollapsed }) =>
    $isCollapsed ? "center" : "flex-start"};
  gap: 13px;
  width: 100%;
  height: 44px;
  margin-top: auto;
  padding: ${({ $isCollapsed }) =>
    $isCollapsed ? "0" : "0 15px"};
  border: 1px solid rgba(239, 72, 76, 0.28);
  border-radius: ${({ $isCollapsed }) =>
    $isCollapsed ? "50%" : "22px"};
  color: #ff6267;
  background: rgba(228, 54, 60, 0.1);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    color: #ffffff;
    border-color: #e94247;
    background: #df383d;
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  top: 50%;
  right: -12px;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  border: 1px solid #61708c;
  border-radius: 50%;
  color: #c4cde0;
  background: #202a40;
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #ffffff;
    background: #34415e;
    transform: translateY(-50%) scale(1.08);
  }
`;