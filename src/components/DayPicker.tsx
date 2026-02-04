import { Calendar } from 'lucide-react';

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
        'rounded-xl p-3 text-center w-[64px]',
        isSelected ? 'bg-black text-white' : null,
      )
    }>
    <div className="text-lg font-medium leading-none">{date.getDate()}</div>
    <div className="text-xs">{formatMonthYear(date)}</div>
    {/*<div className="text-xs">{getDayShortName(date)}</div>*/}
  </div>;
};

export default function DayPicker({ date, onSelect }: { date: Date; onSelect: (date: Date) => void }) {
  return <div className="flex gap-1 justify-center">
    {days.map(innerDate => <DateView
      key={+innerDate}
      date={innerDate}
      isSelected={isSameDay(innerDate, date)}
      onSelect={onSelect}
    />)}
    <div className="w-[1px] h-[40px] mx-2 my-auto bg-black"></div>
    <DatePicker
      trigger={
        isWithinLastNDays(date, daysCount)
          ? <div className="w-[64px] h-[58px] grid place-items-center text-xs"><Calendar size={24} />Custom</div>
          : <DateView date={date} isSelected />
      }
      date={date}
      onSelect={(date: Date | undefined) => date && onSelect(date)}
    />
  </div>;
}