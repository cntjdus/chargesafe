import styled from "styled-components";

import ChargingHistoryRow from "./ChargingHistoryRow";

const ChargingHistoryTable = ({ histories = [] }) => {
  return (
    <TableCard>
      <TableHeader>
        <TableTitle>충전 기록</TableTitle>
        <RecordCount>최근 {histories.length}건</RecordCount>
      </TableHeader>

      <TableScrollArea>
        <Table>
          <thead>
            <tr>
              <HeaderCell>날짜</HeaderCell>
              <HeaderCell>시작</HeaderCell>
              <HeaderCell>종료</HeaderCell>
              <HeaderCell>충전 시간</HeaderCell>
              <HeaderCell>시작 배터리</HeaderCell>
              <HeaderCell>종료 배터리</HeaderCell>
              <HeaderCell>최대 온도</HeaderCell>
              <HeaderCell>상태</HeaderCell>
            </tr>
          </thead>

          <tbody>
            {histories.map((history) => (
              <ChargingHistoryRow
                key={history.id}
                history={history}
              />
            ))}
          </tbody>
        </Table>
      </TableScrollArea>
    </TableCard>
  );
};

export default ChargingHistoryTable;

const TableCard = styled.section`
  width: 100%;
  margin-top: 17px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(29, 42, 72, 0.05);
`;

const TableHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  padding: 0 21px;
  border-bottom: 1px solid #eef1f5;
`;

const TableTitle = styled.h3`
  color: #172033;
  font-size: 15px;
  font-weight: 850;
`;

const RecordCount = styled.span`
  color: #9da8ba;
  font-size: 11px;
`;

const TableScrollArea = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  min-width: 1050px;
  border-collapse: collapse;
  table-layout: fixed;

  thead {
    background: #f8f9fb;
  }

  th:first-child {
    width: 250px;
  }

  th:nth-child(2),
  th:nth-child(3) {
    width: 105px;
  }

  th:nth-child(4) {
    width: 135px;
  }

  th:nth-child(5),
  th:nth-child(6) {
    width: 125px;
  }

  th:nth-child(7) {
    width: 110px;
  }

  th:nth-child(8) {
    width: 115px;
  }
`;

const HeaderCell = styled.th`
  height: 38px;
  padding: 0 16px;
  color: #929db2;
  font-size: 10px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
`;