import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Bell, LogOut, UserRound } from "lucide-react";

import NotificationDropdown from "../notification/NotificationDropdown";

const DashboardHeader = ({
  title = "대시보드",
  showLiveText = false,
  user,
  notifications = [],
  onLogout,
  onProfileClick,
  onReadNotification,
  onReadAllNotifications,
  onOpenNotificationCenter,
}) => {
  const [isNotificationOpen, setIsNotificationOpen] =
    useState(false);

  const notificationRef = useRef(null);

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    };

    if (isNotificationOpen) {
      document.addEventListener(
        "mousedown",
        handleOutsideClick
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [isNotificationOpen]);

  const handleOpenNotificationCenter = () => {
    setIsNotificationOpen(false);
    onOpenNotificationCenter?.();
  };

  return (
    <HeaderContainer>
      <TitleArea>
        <Title>{title}</Title>

        {showLiveText && (
          <>
            <Separator>·</Separator>
            <LiveText>실시간 업데이트</LiveText>
          </>
        )}
      </TitleArea>

      <HeaderActions>
        <NotificationWrapper ref={notificationRef}>
          <IconButton
            type="button"
            aria-label="알림"
            $isOpen={isNotificationOpen}
            onClick={() =>
              setIsNotificationOpen(
                (previous) => !previous
              )
            }
          >
            <Bell size={18} />

            {unreadCount > 0 && <RedDot />}
          </IconButton>

          {isNotificationOpen && (
            <NotificationDropdown
              notifications={notifications}
              onRead={onReadNotification}
              onReadAll={onReadAllNotifications}
              onOpenNotificationCenter={
                handleOpenNotificationCenter
              }
            />
          )}
        </NotificationWrapper>

        <ProfileButton
          type="button"
          onClick={onProfileClick}
          aria-label="설정 페이지로 이동"
        >
          <ProfileIcon>
            <UserRound
              size={20}
              strokeWidth={1.8}
            />
          </ProfileIcon>

          <ProfileText>
            <Name>{user?.name ?? "사용자"}</Name>
            <Role>{user?.role ?? "관리자"}</Role>
          </ProfileText>
        </ProfileButton>

        <LogoutButton
          type="button"
          aria-label="로그아웃"
          onClick={onLogout}
        >
          <LogOut size={19} />
        </LogoutButton>
      </HeaderActions>
    </HeaderContainer>
  );
};

export default DashboardHeader;

const HeaderContainer = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;

  display: flex;
  align-items: center;
  justify-content: space-between;

  width: 100%;
  height: 56px;
  padding: 0 22px;

  border-bottom: 1px solid
    ${({ theme }) => theme.colors.border};

  background: var(--app-header-background);

  transition: background 0.25s ease;
`;

const TitleArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  font-size: 19px;
  font-weight: 850;
`;

const Separator = styled.span`
  color: #b0bacb;
`;

const LiveText = styled.span`
  color: #91a0b8;
  font-size: 12px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NotificationWrapper = styled.div`
  position: relative;
`;

const BaseButton = styled.button`
  border: 1px solid transparent;
  background: #f8faff;
  cursor: pointer;

  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

const IconButton = styled(BaseButton)`
  position: relative;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 39px;
  height: 39px;

  border-radius: 50%;

  color: ${({ $isOpen, theme }) =>
    $isOpen ? theme.colors.primary : "#6f7c94"};

  border-color: ${({ $isOpen }) =>
    $isOpen ? "#dce3ff" : "transparent"};

  background: ${({ $isOpen, theme }) =>
    $isOpen
      ? theme.colors.primaryLight
      : "#f8faff"};

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: #dce3ff;
    background: ${({ theme }) =>
      theme.colors.primaryLight};
  }
`;

const RedDot = styled.span`
  position: absolute;
  top: 7px;
  right: 7px;

  width: 7px;
  height: 7px;

  border: 1.5px solid #ffffff;
  border-radius: 50%;

  background: ${({ theme }) => theme.colors.red};
`;

const ProfileButton = styled(BaseButton)`
  display: flex;
  align-items: center;
  gap: 10px;

  min-width: 102px;
  height: 43px;

  padding: 0 13px 0 7px;

  border-radius: 24px;

  &:hover {
    border-color: #dce3ff;
    background: ${({ theme }) =>
      theme.colors.primaryLight};
  }
`;

const ProfileIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;

  width: 33px;
  height: 33px;

  border-radius: 50%;

  color: ${({ theme }) => theme.colors.primary};
  background: #e8eeff;
`;

const ProfileText = styled.span`
  display: flex;
  align-items: flex-start;
  flex-direction: column;
`;

const Name = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-size: 12px;
  font-weight: 800;
`;

const Role = styled.span`
  color: ${({ theme }) => theme.colors.subText};
  font-size: 10px;
`;

const LogoutButton = styled(BaseButton)`
  display: flex;
  align-items: center;
  justify-content: center;

  width: 39px;
  height: 39px;

  border-radius: 50%;

  color: #8794ac;

  &:hover {
    color: ${({ theme }) => theme.colors.red};
    border-color: #f6cccc;
    background: ${({ theme }) =>
      theme.colors.redLight};
  }
`;