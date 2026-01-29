import { Calendar } from 'lucide-react';
import { useState } from 'react';

import { DatePicker } from '@/components/ui/date-picker';
import { cn, formatMonthYear, isSameDay, isWithinLastNDays } from '@/lib/utils';

const daysCount = 4;
const days = Array.from({ length: daysCount }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (daysCount - i - 1));
  return d;
});

interface DateViewProps {
  date: Date;
  isSelected: boolean;
  onSelect?: (date: Date) => void;
}

const DateView = ({ date, isSelected, onSelect }: DateViewProps) => {
  return <div
    onClick={() => onSelect?.(date)}
    className={
      cn(
        'rounded-xl p-3 text-center w-[60px]',
        isSelected ? 'bg-black text-white' : null,
      )
    }>
    <div className="text-lg font-medium leading-none">{date.getDate()}</div>
    <div className="text-xs">{formatMonthYear(date)}</div>
    {/*<div className="text-xs">{getDayShortName(date)}</div>*/}
  </div>;
};

export default function DayPicker({ date }: { date?: Date }) {
  const [internalDate, setInternalDate] = useState(date ?? new Date());

  return <div className="flex gap-1 justify-center">
    {days.map(date => <DateView
      key={+date}
      date={date}
      isSelected={isSameDay(internalDate, date)}
      onSelect={setInternalDate}
    />)}
    <div className="w-[1px] h-[40px] mx-2 my-auto bg-black"></div>
    <DatePicker
      trigger={
        isWithinLastNDays(internalDate, daysCount)
          ? <div className="w-[60px] h-[58px] grid place-items-center"><Calendar size={32} /></div>
          : <DateView date={internalDate} isSelected />
      }
      date={internalDate}
      onSelect={(date: Date | undefined) => date && setInternalDate(date)}
    />
  </div>;
}