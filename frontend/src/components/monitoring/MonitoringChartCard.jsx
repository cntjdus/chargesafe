import styled from "styled-components";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import MonitoringTooltip from "./MonitoringTooltip";

const MonitoringChartCard = ({
  title,
  threshold,
  value,
  unit,
  status,
  data,
  valueKey,
  color,
  icon: Icon,
  variant = "small",
}) => {
  const gradientId = `gradient-${valueKey}`;
  const isNormal = status === "normal";

  return (
    <Card $variant={variant}>
      <CardHeader>
        <TitleArea>
          <IconBox $color={color}>
            <Icon size={18} strokeWidth={2} />
          </IconBox>

          <div>
            <Title>{title}</Title>
            <Threshold>{threshold}</Threshold>
          </div>
        </TitleArea>

        <ValueArea>
          <CurrentValue $color={color}>
            {value}
            <Unit>{unit}</Unit>
          </CurrentValue>

          <StatusBadge $isNormal={isNormal}>
            {isNormal ? "정상" : "주의"}
          </StatusBadge>
        </ValueArea>
      </CardHeader>

      <ChartArea $variant={variant}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 8,
              right: 0,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient
                id={gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={color}
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor={color}
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              horizontal={false}
            />

            <XAxis
              dataKey="label"
              hide
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              hide
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
            />

            <Tooltip
              cursor={{
                stroke: "#cbd2de",
                strokeWidth: 1,
              }}
              content={
                <MonitoringTooltip
                  metricLabel={title}
                  unit={unit}
                  color={color}
                  valueKey={valueKey}
                />
              }
            />

            <Area
              type="monotone"
              dataKey={valueKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{
                r: 5,
                stroke: "#ffffff",
                strokeWidth: 2,
                fill: color,
              }}
              animationDuration={450}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartArea>
    </Card>
  );
};

export default MonitoringChartCard;

const Card = styled.article`
  min-width: 0;
  height: ${({ $variant }) =>
    $variant === "large" ? "171px" : "170px"};
  overflow: hidden;
  border: 1px solid
    ${({ theme }) =>
      theme?.colors?.border ?? "#e2e7ef"};
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(29, 42, 72, 0.05);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #d0d8f4;
    box-shadow: 0 9px 22px rgba(37, 52, 86, 0.1);
    transform: translateY(-2px);
  }
`;

const CardHeader = styled.header`
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 17px 18px 0;
`;

const TitleArea = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
`;

const IconBox = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}12`};
`;

const Title = styled.h3`
  color: #192337;
  font-size: 12px;
  font-weight: 850;
`;

const Threshold = styled.p`
  margin-top: 3px;
  color: #9aa5b8;
  font-size: 10px;
  font-weight: 550;
`;

const ValueArea = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
`;

const CurrentValue = styled.strong`
  color: ${({ $color }) => $color};
  font-size: 26px;
  font-weight: 850;
  line-height: 1;
`;

const Unit = styled.span`
  margin-left: 3px;
  color: #9aa5b8;
  font-size: 12px;
  font-weight: 650;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  padding: 5px 9px;
  border-radius: 14px;
  color: ${({ $isNormal }) =>
    $isNormal ? "#438f4e" : "#bc7300"};
  background: ${({ $isNormal }) =>
    $isNormal ? "#f0faef" : "#fff8e2"};
  font-size: 9px;
  font-weight: 800;
`;

const ChartArea = styled.div`
  width: 100%;
  height: ${({ $variant }) =>
    $variant === "large" ? "118px" : "116px"};
  margin-top: -1px;

  .recharts-wrapper,
  .recharts-surface {
    overflow: visible;
  }
`;