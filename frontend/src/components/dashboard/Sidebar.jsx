import styled from "styled-components";
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  House,
  Settings,
  TriangleAlert,
  Cpu,
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
}) => {
  return (
    <SidebarContainer $isCollapsed={isCollapsed}>
      <LogoArea $isCollapsed={isCollapsed}>
        <LogoIcon>
          <Zap size={19} strokeWidth={2.5} />
        </LogoIcon>

        {!isCollapsed && <LogoText>ChargeSafe</LogoText>}
      </LogoArea>

      {!isCollapsed && (
        <ChargingStatus>
          <StatusDot />
          <div>
            <StatusTitle>정상 충전 중</StatusTitle>
            <StatusDescription>CS-0042 · 63%</StatusDescription>
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
                <Icon size={19} strokeWidth={1.9} />

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
        title={isCollapsed ? "긴급 알림" : undefined}
      >
        <TriangleAlert size={18} strokeWidth={2} />

        {!isCollapsed && <span>긴급 알림</span>}
      </EmergencyButton>

      <ToggleButton
        type="button"
        onClick={onToggle}
        aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
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
  left: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  width: ${({ $isCollapsed }) => ($isCollapsed ? "64px" : "214px")};
  height: 100vh;
  padding: 0 10px 12px;
  background: ${({ theme }) => theme.colors.sidebar};
  transition: width 0.3s ease;
`;

const LogoArea = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${({ $isCollapsed }) =>
    $isCollapsed ? "center" : "flex-start"};
  gap: 12px;
  height: 64px;
  padding: ${({ $isCollapsed }) => ($isCollapsed ? "0" : "0 6px")};
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
  background: ${({ theme }) => theme.colors.primary};
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
  margin: 14px 0 14px;
  padding: 0 12px;
  border: 1px solid rgba(86, 199, 106, 0.13);
  border-radius: 17px;
  background: rgba(86, 199, 106, 0.1);
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.green};
  box-shadow: 0 0 10px rgba(86, 199, 106, 0.5);
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
  padding: ${({ $isCollapsed }) => ($isCollapsed ? "0" : "0 13px")};
  border: none;
  border-radius: 12px;
  color: ${({ $isActive, theme }) =>
    $isActive ? "#FFFFFF" : theme.colors.sidebarText};
  background: ${({ $isActive, theme }) =>
    $isActive ? theme.colors.sidebarActive : "transparent"};
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #ffffff;
    background: ${({ $isActive, theme }) =>
      $isActive ? theme.colors.sidebarActive : theme.colors.sidebarHover};
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
  right: -8px;
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
  gap: 11px;
  width: 100%;
  height: 39px;
  margin-top: auto;
  padding: ${({ $isCollapsed }) => ($isCollapsed ? "0" : "0 12px")};
  border: 1px solid rgba(240, 92, 97, 0.18);
  border-radius: 15px;
  color: ${({ theme }) => theme.colors.red};
  background: rgba(240, 92, 97, 0.1);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: #ffffff;
    background: ${({ theme }) => theme.colors.red};
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  top: 50%;
  right: -12px;
  z-index: 5;
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