import styled from "styled-components";
import {
  Bell,
  CircleAlert,
  CircleCheck,
  TriangleAlert,
} from "lucide-react";

const NotificationItem = ({
  notification,
  onClick,
}) => {
  const typeStyle = getNotificationTypeStyle(
    notification.type
  );

  const Icon = typeStyle.icon;

  return (
    <ItemButton
      type="button"
      $type={notification.type}
      $isRead={notification.isRead}
      onClick={() => onClick?.(notification)}
    >
      <IconBox $type={notification.type}>
        <Icon size={20} strokeWidth={2} />
      </IconBox>

      <Content>
        <TitleRow>
          {!notification.isRead && (
            <UnreadDot $type={notification.type} />
          )}

          <Title $type={notification.type}>
            {notification.title}
          </Title>
        </TitleRow>

        <Message>{notification.message}</Message>
      </Content>

      <MetaArea>
        <Time>{notification.time}</Time>

        <TypeBadge $type={notification.type}>
          {typeStyle.label}
        </TypeBadge>
      </MetaArea>
    </ItemButton>
  );
};

export default NotificationItem;

const getNotificationTypeStyle = (type) => {
  switch (type) {
    case "danger":
      return {
        label: "위험",
        icon: TriangleAlert,
      };

    case "warning":
      return {
        label: "주의",
        icon: CircleAlert,
      };

    case "success":
      return {
        label: "완료",
        icon: CircleCheck,
      };

    case "info":
    default:
      return {
        label: "정보",
        icon: Bell,
      };
  }
};

const getTypeColors = (type) => {
  switch (type) {
    case "danger":
      return {
        background: "#fff5f3",
        hoverBackground: "#ffedeb",
        border: "#f6d3d0",
        iconBackground: "#ffe1df",
        main: "#e4494e",
        badgeBackground: "#ffe5e3",
      };

    case "warning":
      return {
        background: "#fffbed",
        hoverBackground: "#fff6d8",
        border: "#f3e4a7",
        iconBackground: "#fff2c7",
        main: "#dc9705",
        badgeBackground: "#fff1c1",
      };

    case "success":
      return {
        background: "#f3fcf6",
        hoverBackground: "#eaf9ef",
        border: "#d9efdf",
        iconBackground: "#e3f8e9",
        main: "#58ae66",
        badgeBackground: "#e7f7eb",
      };

    case "info":
    default:
      return {
        background: "#f2f7ff",
        hoverBackground: "#e9f1ff",
        border: "#dce7fa",
        iconBackground: "#e2ecff",
        main: "#5d7ff1",
        badgeBackground: "#e2ebff",
      };
  }
};

const ItemButton = styled.button`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 73px;
  padding: 13px 16px;
  border: 1px solid
    ${({ $type }) => getTypeColors($type).border};
  border-radius: 17px;
  color: inherit;
  background: ${({ $type }) =>
    getTypeColors($type).background};
  opacity: ${({ $isRead }) => ($isRead ? 0.92 : 1)};
  cursor: pointer;
  text-align: left;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: ${({ $type }) =>
      getTypeColors($type).hoverBackground};
    box-shadow: 0 8px 18px rgba(37, 52, 84, 0.09);
    transform: translateY(-2px);
  }

  @media (max-width: 640px) {
    grid-template-columns: auto minmax(0, 1fr);
  }
`;

const IconBox = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 41px;
  height: 41px;
  border-radius: 14px;
  color: ${({ $type }) =>
    getTypeColors($type).main};
  background: ${({ $type }) =>
    getTypeColors($type).iconBackground};
`;

const Content = styled.span`
  display: block;
  min-width: 0;
`;

const TitleRow = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UnreadDot = styled.span`
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${({ $type }) =>
    getTypeColors($type).main};
`;

const Title = styled.strong`
  display: block;
  overflow: hidden;
  color: ${({ $type }) =>
    getTypeColors($type).main};
  font-size: 12px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Message = styled.span`
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: #5c687c;
  font-size: 11px;
  font-weight: 550;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 700px) {
    white-space: normal;
  }
`;

const MetaArea = styled.span`
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;

  @media (max-width: 640px) {
    grid-column: 2;
    justify-content: flex-end;
  }
`;

const Time = styled.span`
  color: #9aa6ba;
  font-size: 10px;
  font-weight: 650;
`;

const TypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  padding: 5px 8px;
  border-radius: 12px;
  color: ${({ $type }) =>
    getTypeColors($type).main};
  background: ${({ $type }) =>
    getTypeColors($type).badgeBackground};
  font-size: 9px;
  font-weight: 800;
`;