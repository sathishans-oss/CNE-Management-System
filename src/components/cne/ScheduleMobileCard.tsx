import React from 'react';
import { Lock, MapPin, Calendar, Users } from 'lucide-react';
import { CNERecord, SessionUser } from '../../types';
import { isCneAuthorized, formatCneDateTimeDisplay } from '../../utils';

export interface ScheduleMobileCardProps {
  cne?: CNERecord;
  cls?: CNERecord;
  user: SessionUser | null;
  isAreaIncharge: boolean;
  rpDisplay: string;
  onSelect?: (cne: CNERecord) => void;
  onOpenDetails?: (cne: CNERecord) => void;
  canOperate?: boolean;
  onEdit?: (cne: CNERecord) => void;
  onCancel?: (cne: CNERecord) => void;
}

export const ScheduleMobileCard: React.FC<ScheduleMobileCardProps> = React.memo(({
  cne,
  cls,
  user,
  isAreaIncharge,
  rpDisplay,
  onSelect,
  onOpenDetails
}) => {
  const item = cne || cls;
  if (!item) return null;

  const isCompleted = (item.status || '').toLowerCase() === 'completed';
  const isCanceled = (item.status || '').toLowerCase().includes('cancel');

  const handleClick = () => {
    if (onOpenDetails) {
      onOpenDetails(item);
    } else if (onSelect) {
      onSelect(item);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-400 hover:shadow-xs transition-all cursor-pointer space-y-2.5 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
              (item.cneType || 'CENTRAL').toUpperCase() === 'CENTRAL'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-teal-50 text-teal-700 border border-teal-200'
            }`}
          >
            {(item.cneType || 'CENTRAL').toUpperCase()}
          </span>
          {item.cneId && (
            <span className="font-mono text-[10px] text-slate-500 font-semibold">
              #{item.cneId}
            </span>
          )}
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
            isCompleted
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : isCanceled
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {isCompleted ? 'Completed' : isCanceled ? 'Canceled' : 'Scheduled'}
        </span>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
          {item.topic}
        </h4>
        {item.isLocked && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 mt-1">
            <Lock className="w-2.5 h-2.5" /> Questions Locked
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-800">{item.area}</span>
          {isAreaIncharge && isCneAuthorized(user, item.area, item.cneType) && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
              Your Ward
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-800">{formatCneDateTimeDisplay(item.date, item.toDate)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate" title={rpDisplay}>
            <strong className="text-slate-700 font-semibold">RP:</strong> {rpDisplay}
          </span>
        </div>
      </div>
    </div>
  );
});

ScheduleMobileCard.displayName = 'ScheduleMobileCard';
