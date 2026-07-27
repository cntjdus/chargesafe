import { useMemo } from "react";
import styled from "styled-components";

import NotificationItem from "./NotificationItem";

const NotificationList = ({
  notifications = [],
  selectedFilter,
  onNotificationClick,
}) => {
  const groupedNotifications = useMemo(() => {
    const filteredNotifications =
      selectedFilter === "all"
        ? notifications
        : notifications.filter(
            (notification) =>
              notification.type === selectedFilter
          );

    return filteredNotifications.reduce(
      (groups, notification) => {
        const groupName =
          notification.dateGroup ?? "기타";

        if (!groups[groupName]) {
          groups[groupName] = [];
        }

        groups[groupName].push(notification);

        return groups;
      },
      {}
    );
  }, [notifications, selectedFilter]);

  const groupEntries = Object.entries(
    groupedNotifications
  );

  if (groupEntries.length === 0) {
    return (
      <EmptyState>
        해당 유형의 알림이 없습니다.
      </EmptyState>
    );
  }

  return (
    <ListContainer>
      {groupEntries.map(
        ([groupName, groupNotifications]) => (
          <NotificationGroup key={groupName}>
            <GroupTitle>{groupName}</GroupTitle>

            <GroupItems>
              {groupNotifications.map(
                (notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={onNotificationClick}
                  />
                )
              )}
            </GroupItems>
          </NotificationGroup>
        )
      )}
    </ListContainer>
  );
};

export default NotificationList;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 17px;
`;

const NotificationGroup = styled.section``;

const GroupTitle = styled.h3`
  margin-bottom: 10px;
  color: #8e9bb0;
  font-size: 11px;
  font-weight: 750;
`;

const GroupItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EmptyState = styled.div`
  margin-top: 20px;
  padding: 70px 20px;
  border: 1px solid #e1e6ee;
  border-radius: 18px;
  color: #919db1;
  background: #ffffff;
  font-size: 13px;
  text-align: center;
`;