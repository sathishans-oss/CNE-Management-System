import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  X
} from 'lucide-react';
import {
  CNERecord,
  CoordinatorDeskInfo,
  NewsEventItem,
  ProgramImpactStats,
  QuickLinkItem,
  SessionUser,
  ViewMode
} from '../types';
import { ApiService } from '../services/api';
import {
  INITIAL_CHAIRPERSON_MESSAGE,
  INITIAL_COORDINATOR_DESK,
  INITIAL_UPCOMING_CLASSES,
  INITIAL_NEWS_EVENTS,
  INITIAL_QUICK_LINKS,
  INITIAL_PROGRAM_IMPACT
} from '../services/initialData';
import { formatCneDateTimeDisplay, parseToIsoDateString, getSafeExternalUrl } from '../utils';
import { useToast } from './Toast';

// Critical Above-the-fold Widgets (Immediately Available)
import { UpcomingClassesWidget } from './home/UpcomingClassesWidget';
import { InstitutionalImpactWidget } from './home/InstitutionalImpactWidget';
import { NewsCircularsWidget } from './home/NewsCircularsWidget';
import { QuickLinksWidget } from './home/QuickLinksWidget';
import { CnoLeadershipCard } from './home/CnoLeadershipCard';

// Below-the-fold Informational Widgets (Loaded on Demand)
const SpecialtyModulesWidget = lazy(() =>
  import('./home/SpecialtyModulesWidget').then((m) => ({ default: m.SpecialtyModulesWidget }))
);
const CertificationWorkflowWidget = lazy(() =>
  import('./home/CertificationWorkflowWidget').then((m) => ({ default: m.CertificationWorkflowWidget }))
);
const CoordinatorDeskCard = lazy(() =>
  import('./home/CoordinatorDeskCard').then((m) => ({ default: m.CoordinatorDeskCard }))
);
const GuidelinesCard = lazy(() =>
  import('./home/GuidelinesCard').then((m) => ({ default: m.GuidelinesCard }))
);

interface CneHomePageProps {
  user: SessionUser | null;
  onNavigate: (view: ViewMode) => void;
}

export const CneHomePage: React.FC<CneHomePageProps> = ({
  user,
  onNavigate
}) => {
  const [upcomingClasses, setUpcomingClasses] = useState<CNERecord[]>(() => ApiService.getCachedData<CNERecord[]>('getCNERecords') || INITIAL_UPCOMING_CLASSES);
  const [newsEvents, setNewsEvents] = useState<NewsEventItem[]>(() => ApiService.getCachedData<NewsEventItem[]>('getNewsEvents') || INITIAL_NEWS_EVENTS);
  const [quickLinks, setQuickLinks] = useState<QuickLinkItem[]>(() => ApiService.getCachedData<QuickLinkItem[]>('getQuickLinks') || INITIAL_QUICK_LINKS);
  const [coordinatorDesk, setCoordinatorDesk] = useState<CoordinatorDeskInfo>(() => ApiService.getCachedData<CoordinatorDeskInfo>('getCoordinatorDesk') || INITIAL_COORDINATOR_DESK);
  const [chairpersonPhotoUrl, setChairpersonPhotoUrl] = useState('');
  const [impactStats, setImpactStats] = useState<ProgramImpactStats | null>(() => ApiService.getCachedData<ProgramImpactStats>('getProgramImpact') || INITIAL_PROGRAM_IMPACT);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState<string | null>(null);
  const cnoMessage = {
    ...INITIAL_CHAIRPERSON_MESSAGE,
    photoUrl: chairpersonPhotoUrl
  };
  
  const [classesLoading, setClassesLoading] = useState(true);
  const homeRequestRef = useRef(0);
  const sessionKey = `${user?.employeeId || ''}:${user?.role || ''}:${user?.token || ''}`;
  const { error: showErrorToast } = useToast();

  // Modals state
  const [selectedNews, setSelectedNews] = useState<NewsEventItem | null>(null);
  const [selectedQuickLink, setSelectedQuickLink] = useState<QuickLinkItem | null>(null);
  const [selectedClass, setSelectedClass] = useState<CNERecord | null>(null);

  useEffect(() => {
    const requestId = ++homeRequestRef.current;
    let active = true;
    const isCurrent = () => active && requestId === homeRequestRef.current;

    // Clear modal state immediately so an account switch cannot retain details
    // opened under the previous session.
    setSelectedNews(null);
    setSelectedQuickLink(null);
    setSelectedClass(null);

    const cachedImpact = ApiService.getCachedData<ProgramImpactStats>('getProgramImpact');
    if (cachedImpact) setImpactStats(cachedImpact);
    setImpactLoading(!cachedImpact);
    setImpactError(null);
    setChairpersonPhotoUrl('');
    setClassesLoading(true);

    // One optimized bootstrap request supplies all homepage datasets, including
    // the Chairperson photo. The backend still applies session-aware impact
    // scoping once per request.
    ApiService.getHomeDashboard()
      .then((res) => {
        if (!isCurrent()) return;
        if (res.success && res.data) {
          setUpcomingClasses(res.data.upcomingClasses || []);
          setNewsEvents(res.data.newsEvents || INITIAL_NEWS_EVENTS);
          setQuickLinks(res.data.quickLinks || INITIAL_QUICK_LINKS);
          setCoordinatorDesk(res.data.coordinatorDesk || INITIAL_COORDINATOR_DESK);
          setImpactStats(res.data.impactStats || cachedImpact || INITIAL_PROGRAM_IMPACT);
          setChairpersonPhotoUrl(res.data.chairpersonPhotoUrl || '');
          setImpactError(null);
        } else {
          if (!cachedImpact) setImpactError(res.message || 'Unable to load impact metrics');
        }
      })
      .catch((err) => {
        if (!isCurrent()) return;
        console.warn('[Home Data] Dashboard bootstrap error:', err);
        if (!cachedImpact) setImpactError('Unable to load impact metrics');
      })
      .finally(() => {
        if (!isCurrent()) return;
        setClassesLoading(false);
        setImpactLoading(false);
      });

    return () => {
      active = false;
      homeRequestRef.current += 1;
    };
  }, [sessionKey]);

  const handleQuickLinkClick = (item: QuickLinkItem) => {
    if (!item) return;
    if (item.actionType === 'navigate' && item.target) {
      onNavigate(item.target as ViewMode);
    } else if (item.actionType === 'modal' || item.modalContent) {
      setSelectedQuickLink(item);
    } else {
      const rawTarget = item.target || (item as any).url;
      if (rawTarget) {
        const safeUrl = getSafeExternalUrl(rawTarget);
        if (safeUrl) {
          window.open(safeUrl, '_blank', 'noopener,noreferrer');
        } else {
          showErrorToast(
            'Unable to open link. Only secure web addresses (http:// or https://) are allowed.',
            'Invalid Link'
          );
        }
      }
    }
  };

  // Scheduled upcoming classes filter: maximum 5 classes displayed on home card.
  // Normalize status and order by canonical CNE date so backend casing/order cannot
  // make completed/cancelled records appear in the public upcoming preview.
  const scheduledClasses = upcomingClasses
    .filter((c) => String(c?.status || '').trim().toLowerCase() === 'scheduled')
    .sort((a, b) => {
      const aDate = parseToIsoDateString(a?.date) || '';
      const bDate = parseToIsoDateString(b?.date) || '';
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return String(a?.date || '').localeCompare(String(b?.date || ''));
    });
  const openClasses = scheduledClasses.slice(0, 5);
  const totalScheduledCount = scheduledClasses.length;

  return (
    <div className="space-y-8 pb-16">
      {/* Streamlined 2-Column Nordic Clinical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols: Leadership, Active Classes, Moments, Specialty Modules) */}
        <main className="lg:col-span-7 space-y-6">
          <CnoLeadershipCard
            cnoMessage={cnoMessage}
            accentColor="teal"
          />
          <UpcomingClassesWidget
            openClasses={openClasses}
            totalCount={totalScheduledCount}
            loading={classesLoading}
            onNavigate={onNavigate}
            onSelectClass={(c) => setSelectedClass(c)}
            accentColor="teal"
          />
          {/* Core Clinical Specialty Modules: restricted to main content flow */}
          <Suspense fallback={<div className="h-44 rounded-3xl bg-slate-50 border border-slate-200/60" />}>
            <SpecialtyModulesWidget accentColor="teal" />
          </Suspense>
        </main>

        {/* Right Column (5 cols: Impact, Circulars, Quick Links, Guidelines, Desk, Certification) */}
        <aside className="lg:col-span-5 space-y-6">
          <InstitutionalImpactWidget
            totalCompletedClasses={impactStats?.totalCompletedClasses ?? 0}
            cneDuration={impactStats?.cneDuration || '0 Hrs'}
            uniqueStaffTrained={impactStats?.uniqueStaffTrained ?? 0}
            loading={impactLoading}
            error={impactError}
            scope={impactStats?.scope || (user ? 'user' : 'institutional')}
            accentColor="teal"
          />
          <NewsCircularsWidget
            newsEvents={newsEvents}
            onSelectNews={(news) => setSelectedNews(news)}
            accentColor="teal"
          />
          <QuickLinksWidget
            quickLinks={quickLinks}
            onQuickLinkClick={handleQuickLinkClick}
            accentColor="teal"
          />
          <Suspense fallback={<div className="h-72 rounded-2xl bg-slate-50 border border-slate-200/60" />}>
            <GuidelinesCard accentColor="teal" />
            <CoordinatorDeskCard coordinatorDesk={coordinatorDesk} accentColor="teal" />
            <CertificationWorkflowWidget accentColor="teal" />
          </Suspense>
        </aside>
      </div>

      {/* ========================================================= */}
      {/* MODALS: News Detail, QuickLink Content, Photo Lightbox,   */}
      {/* and Class Apply Modal                                     */}
      {/* ========================================================= */}

      {/* 1. News / Circular Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-none sm:backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded">
                  {selectedNews.category || 'Official Circular'}
                </span>
                <span className="text-xs text-slate-400 ml-2">{selectedNews.date}</span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">{selectedNews.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed space-y-2 border-t border-slate-100 pt-3">
              <p>{selectedNews.content || selectedNews.summary}</p>
              {selectedNews.venue && (
                <p className="text-[11px] text-slate-500">
                  <strong>Venue:</strong> {selectedNews.venue}
                </p>
              )}
              {selectedNews.speaker && (
                <p className="text-[11px] text-slate-500">
                  <strong>Resource Person / Speaker:</strong> {selectedNews.speaker}
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Quick Link Modal */}
      {selectedQuickLink && selectedQuickLink.modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-none sm:backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded">
                  {selectedQuickLink.badge || 'Document'}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedQuickLink.modalContent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuickLink(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed space-y-2.5 border-t border-slate-100 pt-3">
              {selectedQuickLink.modalContent.body.map((para, i) => (
                <p key={i} className="leading-relaxed">
                  {para}
                </p>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedQuickLink(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Class Details & Apply Modal */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-none sm:backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                    {selectedClass.duration ? `${selectedClass.duration} CNE Duration` : 'Duration not recorded'}
                  </span>
                  <span className="text-xs text-slate-400">{selectedClass.area}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{selectedClass.topic}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs text-slate-700 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date &amp; Schedule:</span>
                <span className="font-bold text-slate-900">{formatCneDateTimeDisplay(selectedClass.date, selectedClass.toDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-bold text-slate-900">{selectedClass.duration || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Venue / Location:</span>
                <span className="font-bold text-slate-900">{selectedClass.area || 'Clinical Skills Lab'}</span>
              </div>
              {(selectedClass.resourcePersonName || 'Resource Person') && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Resource Person:</span>
                  <span className="font-bold text-slate-900">
                    {selectedClass.resourcePersonName || 'Resource Person'}
                  </span>
                </div>
              )}
            </div>

            {selectedClass.description && (
              <p className="text-xs text-slate-600 leading-relaxed">{selectedClass.description}</p>
            )}

            <div className="pt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
