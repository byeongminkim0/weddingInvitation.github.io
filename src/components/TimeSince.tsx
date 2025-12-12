import React, { useState, useEffect } from 'react';
import CountUp from './CountUp';

interface TimeSinceProps {
  startDate: string; // "2020-03-21T00:00:00+09:00"
  className?: string;
}

 
export const TimeSince: React.FC<TimeSinceProps> = ({ startDate, className = '' }) => {
  const [timeData, setTimeData] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(startDate);
      const now = new Date();
      
      // 년, 월, 일 계산
      let years = now.getFullYear() - start.getFullYear();
      let months = now.getMonth() - start.getMonth();
      let days = now.getDate() - start.getDate();
      
      // 날짜가 음수면 이전 달에서 빌려옴
      if (days < 0) {
        months--;
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
      }
      
      // 월이 음수면 이전 년도에서 빌려옴
      if (months < 0) {
        years--;
        months += 12;
      }
      
      // 시간, 분, 초 계산
      const hours = now.getHours() - start.getHours();
      const minutes = now.getMinutes() - start.getMinutes();
      const seconds = now.getSeconds() - start.getSeconds();
      
      // 보정
      let finalHours = hours;
      let finalMinutes = minutes;
      let finalSeconds = seconds;
      
      if (finalSeconds < 0) {
        finalSeconds += 60;
        finalMinutes--;
      }
      
      if (finalMinutes < 0) {
        finalMinutes += 60;
        finalHours--;
      }
      
      if (finalHours < 0) {
        finalHours += 24;
      }
      
      setTimeData({
        years,
        months,
        days,
        hours: finalHours,
        minutes: finalMinutes,
        seconds: finalSeconds
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000); // 1초마다 업데이트

    return () => clearInterval(interval);
  }, [startDate]);

  return (
    <p className={className}>
      {/* <span style={{ color: '#ff0000' }}>{timeData.months}</span> */}
      <CountUp
        from={0}
        to={timeData.years}
        separator=","
        direction="up"
        duration={1}
        className="count-up-text"
      />
      년{' '}
      <CountUp
        from={0}
        to={timeData.months}
        separator=","
        direction="up"
        duration={1}
        className="count-up-text"
      />
      개월{' '}
      <CountUp
        from={0}
        to={timeData.days}
        separator=","
        direction="up"
        duration={1}
        className="count-up-text"
      />
      일{' '}
      <span style={{ color: '#171717' }}>{timeData.hours}</span>시간{' '}
      <span style={{ color: '#171717' }}>{timeData.minutes}</span>분{' '}
      <span style={{ color: '#171717' }}>{timeData.seconds}</span>초
    </p>
  );
};