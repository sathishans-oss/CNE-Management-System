import React from 'react';
import { HeartHandshake, Mail, Users, Award, UserCheck } from 'lucide-react';
import { CoordinatorDeskInfo } from '../../types';

interface CoordinatorDeskCardProps {
  coordinatorDesk: CoordinatorDeskInfo;
  accentColor?: 'emerald' | 'blue' | 'amber' | 'teal';
}

export const CoordinatorDeskCard: React.FC<CoordinatorDeskCardProps> = ({
  coordinatorDesk,
  accentColor = 'teal'
}) => {
  const badgeColor = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    teal: 'bg-teal-50 text-teal-800 border-teal-200'
  }[accentColor];

  const coordinatorBadge = {
    emerald: 'bg-emerald-100 text-emerald-800',
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
    teal: 'bg-teal-100 text-teal-800'
  }[accentColor];

  const emailHover = {
    emerald: 'hover:text-emerald-700',
    blue: 'hover:text-blue-700',
    amber: 'hover:text-amber-700',
    teal: 'hover:text-teal-700'
  }[accentColor];

  const coordinators = coordinatorDesk.coordinatorPeople || [];
  const members = coordinatorDesk.members || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">CNE Desk</h2>
            <p className="text-[11px] text-slate-400">Nursing Education Cell Leadership & Committee</p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
          Committee
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Coordinators Section */}
        {coordinators.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-teal-600" />
              <span>CNE Coordinators</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {coordinators.map((coord, idx) => (
                <div
                  key={`coord-${idx}`}
                  className="p-3 rounded-xl border border-teal-100 bg-teal-50/40 flex items-start gap-2.5"
                >
                  <div className={`w-7 h-7 rounded-lg ${coordinatorBadge} flex items-center justify-center shrink-0 mt-0.5`}>
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 whitespace-normal break-words [overflow-wrap:anywhere]">{coord.name}</p>
                    <p className="text-[11px] text-slate-600 whitespace-normal break-words [overflow-wrap:anywhere]">{coord.designation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Committee Members Section */}
        {members.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Committee Members ({members.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {members.map((member, idx) => (
                <div
                  key={`member-${idx}`}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  <p className="text-xs font-semibold text-slate-800 whitespace-normal break-words [overflow-wrap:anywhere]">{member.name}</p>
                  <p className="text-[10px] text-slate-500 whitespace-normal break-words [overflow-wrap:anywhere]">{member.designation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Official Email / Communication Channel */}
        {coordinatorDesk.email && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              Official Desk Contact:
            </span>
            <a
              href={`mailto:${coordinatorDesk.email}`}
              className={`min-w-0 max-w-full font-semibold text-slate-800 ${emailHover} transition-colors whitespace-normal break-words [overflow-wrap:anywhere]`}
            >
              {coordinatorDesk.email}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
