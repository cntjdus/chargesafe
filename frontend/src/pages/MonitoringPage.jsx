import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  Activity,
  Thermometer,
  Zap,
} from "lucide-react";

import { getMonitoringData } from "../api/monitoringApi";
import MonitoringChartCard from "../components/monitoring/MonitoringChartCard";
import MonitoringSummarySection from "../components/monitoring/MonitoringSummarySection";
import TimeRangeTabs from "../components/monitoring/TimeRangeTabs";

const REALTIME_REFRESH_INTERVAL = 5000;

const MonitoringPage = ({ selectedDevice }) => {
  const [selectedRange, setSelectedRange] =
    useState("realtime");

  const [measurements, setMeasurements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const deviceId = selectedDevice?.id ?? "CS-0042";

  useEffect(() => {
    let isCancelled = false;

    const loadMonitoringData = async () => {
      try {
        const response = await getMonitoringData({
          deviceId,
          range: selectedRange,
        });

        if (isCancelled) {
          return;
        }

        setMeasurements(response?.measurements ?? []);
        setError("");
        setIsLoading(false);
      } catch (requestError) {
        if (isCancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "모니터링 데이터를 불러오지 못했습니다."
        );

        setIsLoading(false);
      }
    };

    loadMonitoringData();

    return () => {
      isCancelled = true;
    };
  }, [deviceId, selectedRange]);

  useEffect(() => {
    if (selectedRange !== "realtime") {
      return undefined;
    }

    let isCancelled = false;

    const refreshMonitoringData = async () => {
      try {
        const response = await getMonitoringData({
          deviceId,
          range: "realtime",
        });

        if (isCancelled) {
          return;
        }

        setMeasurements(response?.measurements ?? []);
        setError("");
      } catch (requestError) {
        if (isCancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "실시간 데이터를 갱신하지 못했습니다."
        );
      }
    };

    const intervalId = window.setInterval(
      refreshMonitoringData,
      REALTIME_REFRESH_INTERVAL
    );

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [deviceId, selectedRange]);

  const latestMeasurement = useMemo(() => {
    if (measurements.length === 0) {
      return null;
    }

    return measurements[measurements.length - 1];
  }, [measurements]);

  const temperatureStatus =
    Number(latestMeasurement?.temperature ?? 0) < 50
      ? "normal"
      : "warning";

  const currentStatus =
    Number(latestMeasurement?.current ?? 0) < 4
      ? "normal"
      : "warning";

  const voltageStatus =
    Number(latestMeasurement?.voltage ?? 0) < 14.5
      ? "normal"
      : "warning";

  const handleRangeChange = (nextRange) => {
    if (nextRange === selectedRange) {
      return;
    }

    setIsLoading(true);
    setError("");
    setSelectedRange(nextRange);
  };

  const handleRetry = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await getMonitoringData({
        deviceId,
        range: selectedRange,
      });

      setMeasurements(response?.measurements ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "모니터링 데이터를 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <PageTop>
        <TitleArea>
          <PageTitle>실시간 모니터링</PageTitle>

          {selectedDevice && (
            <DeviceDescription>
              {selectedDevice.name} · {selectedDevice.id}
            </DeviceDescription>
          )}
        </TitleArea>

        <TimeRangeTabs
          selectedRange={selectedRange}
          onChangeRange={handleRangeChange}
        />
      </PageTop>

      {isLoading && measurements.length === 0 && (
        <StateBox>
          모니터링 데이터를 불러오는 중입니다.
        </StateBox>
      )}

      {error && measurements.length === 0 && (
        <ErrorBox>
          <p>{error}</p>

          <RetryButton
            type="button"
            onClick={handleRetry}
          >
            다시 시도
          </RetryButton>
        </ErrorBox>
      )}

      {latestMeasurement && (
        <>
          <MonitoringSummarySection
            latestMeasurement={latestMeasurement}
          />

          <ChartsSection>
            <MonitoringChartCard
              title="배터리 온도"
              threshold="기준 50°C 미만"
              value={Number(
                latestMeasurement.temperature
              ).toFixed(1)}
              unit="°C"
              status={temperatureStatus}
              data={measurements}
              valueKey="temperature"
              color="#e96619"
              icon={Thermometer}
              variant="large"
            />

            <BottomCharts>
              <MonitoringChartCard
                title="충전 전류"
                threshold="기준 4A 미만"
                value={Number(
                  latestMeasurement.current
                ).toFixed(2)}
                unit="A"
                status={currentStatus}
                data={measurements}
                valueKey="current"
                color="#4d63f5"
                icon={Zap}
              />

              <MonitoringChartCard
                title="배터리 전압"
                threshold="기준 14.5V 미만"
                value={Number(
                  latestMeasurement.voltage
                ).toFixed(2)}
                unit="V"
                status={voltageStatus}
                data={measurements}
                valueKey="voltage"
                color="#6555ef"
                icon={Activity}
              />
            </BottomCharts>
          </ChartsSection>
        </>
      )}

      {!isLoading &&
        !error &&
        measurements.length === 0 && (
          <StateBox>
            표시할 모니터링 데이터가 없습니다.
          </StateBox>
        )}
    </PageContainer>
  );
};

export default MonitoringPage;

const PageContainer = styled.div`
  width: 100%;
  padding: 22px;

  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const PageTop = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  @media (max-width: 650px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const TitleArea = styled.div`
  min-width: 0;
`;

const PageTitle = styled.h2`
  color: #182236;
  font-size: 17px;
  font-weight: 850;
`;

const DeviceDescription = styled.p`
  margin-top: 4px;
  color: #939fb2;
  font-size: 10px;
  font-weight: 600;
`;

const ChartsSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 17px;
`;

const BottomCharts = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;

const StateBox = styled.div`
  margin-top: 18px;
  padding: 55px 20px;
  border: 1px solid #e2e7ef;
  border-radius: 18px;
  color: #7e8a9f;
  background: #ffffff;
  text-align: center;
`;

const ErrorBox = styled(StateBox)`
  color: #d54a4f;
`;

const RetryButton = styled.button`
  margin-top: 15px;
  padding: 10px 18px;
  border: none;
  border-radius: 15px;
  color: #ffffff;
  background: #4d63f5;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #4055e8;
    transform: translateY(-1px);
  }
`;