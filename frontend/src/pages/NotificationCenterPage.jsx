import { useMemo, useState } from "react";
import styled from "styled-components";

import NotificationFilter from "../components/notification/NotificationFilter";
import NotificationList from "../components/notification/NotificationList";
import NotificationPageNavigation from "../components/notification/NotificationPageNavigation";
import NotificationTypeGuide from "../components/notification/NotificationTypeGuide";

import {
  initialNotifications,
  notificationTypeGuides,
} from "../data/mockNotifications";

const NotificationCenterPage = () => {
  const [notifications, setNotifications] = useState(
    initialNotifications
  );

  const [selectedFilter, setSelectedFilter] =
    useState("all");

  const [activeView, setActiveView] = useState("list");

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.isRead
      ).length,
    [notifications]
  );

  const handleNotificationClick = (
    selectedNotification
  ) => {
    if (selectedNotification.isRead) {
      return;
    }

    setNotifications((previousNotifications) =>
      previousNotifications.map((notification) =>
        notification.id === selectedNotification.id
          ? {
              ...notification,
              isRead: true,
            }
          : notification
      )
    );
  };

  const handleChangeView = (nextView) => {
    setActiveView(nextView);
  };

  return (
    <PageContainer>
      <PageHeader>
        <TitleArea>
          <PageTitle>알림 센터</PageTitle>

          <PageDescription
            $isGuide={activeView === "guide"}
          >
            {activeView === "list"
              ? `읽지 않은 알림 ${unreadCount}건`
              : "색상별 알림 유형 안내"}
          </PageDescription>
        </TitleArea>

        <NotificationPageNavigation
          activeView={activeView}
          unreadCount={unreadCount}
          onChangeView={handleChangeView}
        />
      </PageHeader>

      {activeView === "list" ? (
        <>
          <NotificationFilter
            selectedFilter={selectedFilter}
            onChangeFilter={setSelectedFilter}
          />

          <NotificationList
            notifications={notifications}
            selectedFilter={selectedFilter}
            onNotificationClick={
              handleNotificationClick
            }
          />
        </>
      ) : (
        <NotificationTypeGuide
          guides={notificationTypeGuides}
        />
      )}
    </PageContainer>
  );
};

export default NotificationCenterPage;

const PageContainer = styled.div`
  width: 100%;
  padding: 22px;

  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const PageHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 17px;

  @media (max-width: 650px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const TitleArea = styled.div``;

const PageTitle = styled.h2`
  color: #182236;
  font-size: 17px;
  font-weight: 850;
`;

const PageDescription = styled.p`
  margin-top: 5px;
  color: ${({ $isGuide }) =>
    $isGuide ? "#99a5b8" : "#e9474b"};
  font-size: 11px;
  font-weight: 750;
`;