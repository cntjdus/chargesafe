import styled from "styled-components";
import {
  Bell,
  CheckCircle2,
  CircleAlert,
  TriangleAlert,
} from "lucide-react";

const typeConfig = {
  danger: {
    icon: TriangleAlert,
    color: "#ef5c60",
    background: "#fff0f0",
  },

  warning: {
    icon: CircleAlert,
    color: "#e9a914",
    background: "#fff8df",
  },

  success: {
    icon: CheckCircle2,
    color: "#72bf7c",
    background: "#effbf1",
  },

  info: {
    icon: Bell,
    color: "#6f8df7",
    background: "#eef3ff",
  },
};

const NotificationDropdownItem = ({
  notification,
  onRead,
}) => {
  const config =
    typeConfig[notification.type] ?? typeConfig.info;

  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.isRead) {
      onRead?.(notification.id);
    }
  };

  return (
    <ItemButton
      type="button"
      $isRead={notification.isRead}
      onClick={handleClick}
    >
      <IconWrapper
        $color={config.color}
        $background={config.background}
      >
        <Icon size={19} strokeWidth={1.9} />
      </IconWrapper>

      <Content>
        <TitleRow>
          {!notification.isRead && (
            <UnreadDot $color={config.color} />
          )}

          <Title $color={config.color}>
            {notification.title}
          </Title>

          <Time>{notification.time}</Time>
        </TitleRow>

        <Description>
          {notification.message}
        </Description>
      </Content>
    </ItemButton>
  );
};

export default NotificationDropdownItem;

const ItemButton = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 13px;
  width: 100%;
  padding: 18px 19px;
  border: none;
  border-bottom: 1px solid #f0f2f6;
  background: #ffffff;
  opacity: ${({ $isRead }) => ($isRead ? 0.72 : 1)};
  text-align: left;
  cursor: pointer;

  transition:
    background 0.2s ease,
    opacity 0.2s ease;

  &:hover {
    background: #f8faff;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 41px;
  height: 41px;
  border-radius: 50%;

  color: ${({ $color }) => $color};
  background: ${({ $background }) => $background};
`;

const Content = styled.div`
  min-width: 0;
  flex: 1;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
`;

const UnreadDot = styled.span`
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  margin-right: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const Title = styled.strong`
  overflow: hidden;
  color: ${({ $color }) => $color};
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Time = styled.span`
  flex-shrink: 0;
  margin-left: auto;
  padding-left: 10px;

  color: #a1acc0;
  font-size: 11px;
  font-weight: 650;
`;

const Description = styled.p`
  display: -webkit-box;
  overflow: hidden;
  margin-top: 5px;

  color: #6f7d94;
  font-size: 11px;
  font-weight: 550;
  line-height: 1.55;

  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;