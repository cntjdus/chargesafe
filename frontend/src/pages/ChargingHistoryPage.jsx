import { useEffect, useState } from "react";
import styled from "styled-components";

import ChargingHistoryTable from "../components/history/ChargingHistoryTable";
import HistoryStatsSection from "../components/history/HistoryStatsSection";

import {
  mockChargingHistory,
  mockHistorySummary,
} from "../data/mockChargingHistory";

const ChargingHistoryPage = () => {
  const [histories, setHistories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHistories(mockChargingHistory);
      setSummary(mockHistorySummary);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingBox>충전 이력을 불러오는 중입니다.</LoadingBox>;
  }

  if (!summary) {
    return <LoadingBox>충전 이력 데이터가 없습니다.</LoadingBox>;
  }

  return (
    <HistoryContent>
      <HistoryStatsSection summary={summary} />
      <ChargingHistoryTable histories={histories} />
    </HistoryContent>
  );
};

export default ChargingHistoryPage;

const HistoryContent = styled.div`
  width: 100%;
  padding: 21px 22px 30px;

  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const LoadingBox = styled.div`
  margin: 22px;
  padding: 50px;
  border-radius: 18px;
  color: #758197;
  background: #ffffff;
  text-align: center;
`;