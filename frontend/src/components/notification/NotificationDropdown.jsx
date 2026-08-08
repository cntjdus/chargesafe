import styled from "styled-components";
import { ChevronRight } from "lucide-react";

import NotificationDropdownItem from "./NotificationDropdownItem";

const NotificationDropdown = ({
  notifications,
  onRead,
  onReadAll,
  onOpenNotificationCenter,
}) => {
  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  return (
    <DropdownContainer>
      <Header>
        <HeaderLeft>
          <Title>알림 센터</Title>

          <UnreadText $allRead={unreadCount === 0}>
            {unreadCount > 0
              ? `읽지 않은 알림 ${unreadCount}건`
              : "모든 알림 확인됨"}
          </UnreadText>
        </HeaderLeft>

        <ReadAllButton
          type="button"
          onClick={onReadAll}
          disabled={unreadCount === 0}
        >
          모두 읽음
        </ReadAllButton>
      </Header>

      <NotificationList>
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <NotificationDropdownItem
              key={notification.id}
              notification={notification}
              onRead={onRead}
            />
          ))
        ) : (
          <EmptyMessage>
            새로운 알림이 없습니다.
          </EmptyMessage>
        )}
      </NotificationList>

      <FooterButton
        type="button"
        onClick={onOpenNotificationCenter}
      >
        알림 센터 전체 보기
        <ChevronRight size={17} strokeWidth={2} />
      </FooterButton>
    </DropdownContainer>
  );
};

export default NotificationDropdown;

const DropdownContainer = styled.div`
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 1000;

  width: 380px;
  overflow: hidden;

  border: 1px solid #e5e9f1;
  border-radius: 20px;

  background: #ffffff;

  box-shadow:
    0 15px 42px rgba(28, 41, 70, 0.16),
    0 3px 10px rgba(28, 41, 70, 0.06);

  @media (max-width: 500px) {
    position: fixed;
    top: 64px;
    left: 12px;
    right: 12px;

    width: auto;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;

  min-height: 82px;
  padding: 17px 20px;

  border-bottom: 1px solid #edf0f5;
`;

const HeaderLeft = styled.div``;

const Title = styled.h3`
  color: #202a3e;
  font-size: 15px;
  font-weight: 850;
`;

const UnreadText = styled.p`
  margin-top: 5px;

  color: ${({ $allRead }) =>
    $allRead ? "#57aa61" : "#ec4c50"};

  font-size: 12px;
  font-weight: 750;
`;

const ReadAllButton = styled.button`
  border: none;
  color: #5069f4;
  background: transparent;

  font-size: 12px;
  font-weight: 800;

  cursor: pointer;

  transition:
    color 0.2s ease,
    opacity 0.2s ease;

  &:hover:not(:disabled) {
    color: #344dda;
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`;

const NotificationList = styled.div`
  max-height: 470px;
  overflow-y: auto;

  scrollbar-width: thin;
  scrollbar-color: #6a6a6a transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 8px;
    background: #686868;
  }
`;

const EmptyMessage = styled.div`
  padding: 50px 20px;

  color: #97a3b5;
  font-size: 12px;
  text-align: center;
`;

const FooterButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;

  width: 100%;
  height: 56px;

  border: none;
  border-top: 1px solid #edf0f5;

  color: #4d65ef;
  background: #ffffff;

  font-size: 13px;
  font-weight: 800;

  cursor: pointer;

  transition:
    color 0.2s ease,
    background 0.2s ease;

  &:hover {
    color: #344ed9;
    background: #f7f9ff;
  }
`;