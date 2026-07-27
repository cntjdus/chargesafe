import styled from "styled-components";
import { Bell, Shield } from "lucide-react";

const NotificationPageNavigation = ({
  activeView,
  unreadCount,
  onChangeView,
}) => {
  return (
    <Navigation>
      <NavigationButton
        type="button"
        $isActive={activeView === "list"}
        onClick={() => onChangeView("list")}
      >
        <Bell size={15} strokeWidth={2} />
        알림 목록

        {unreadCount > 0 && (
          <UnreadBadge>{unreadCount}</UnreadBadge>
        )}
      </NavigationButton>

      <NavigationButton
        type="button"
        $isActive={activeView === "guide"}
        onClick={() => onChangeView("guide")}
      >
        <Shield size={15} strokeWidth={2} />
        알림 유형 안내
      </NavigationButton>
    </Navigation>
  );
};

export default NotificationPageNavigation;

const Navigation = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NavigationButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 37px;
  padding: 0 15px;
  border: 1px solid
    ${({ $isActive }) =>
      $isActive ? "#d9dee8" : "transparent"};
  border-radius: 19px;
  color: ${({ $isActive }) =>
    $isActive ? "#273249" : "#718097"};
  background: ${({ $isActive }) =>
    $isActive ? "#ffffff" : "transparent"};
  box-shadow: ${({ $isActive }) =>
    $isActive
      ? "0 3px 8px rgba(30, 42, 70, 0.08)"
      : "none"};
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    color: #4d63f5;
    border-color: #dce3ff;
    background: #ffffff;
    box-shadow: 0 4px 10px rgba(30, 42, 70, 0.08);
    transform: translateY(-1px);
  }

  @media (max-width: 560px) {
    padding: 0 11px;
    font-size: 11px;
  }
`;

const UnreadBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 50%;
  color: #ffffff;
  background: #e9474b;
  font-size: 10px;
  font-weight: 850;
`;