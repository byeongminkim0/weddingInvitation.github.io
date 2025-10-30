import React, { useState, useEffect } from 'react';

interface TimeSinceProps {
  startDate: string; // "2020-03-21T00:00:00+09:00"
  className?: string;
}

 
export const TimeSince: React.FC<TimeSinceProps> = ({ startDate, className = '' }) => {
  const [timeString, setTimeString] = useState('');

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
      
      setTimeString(
        `${years}년 ${months}개월 ${days}일 ${finalHours}시간 ${finalMinutes}분 ${finalSeconds}초`
      );
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000); // 1초마다 업데이트

    return () => clearInterval(interval);
  }, [startDate]);

  return (
    <p className={className}>
      {timeString}
    </p>
  );
};

// 사용법
<TimeSince 
  startDate="2020-03-21T00:00:00+09:00" 
  className="text-sm text-gray-600"
/>
