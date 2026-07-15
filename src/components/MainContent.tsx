/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { Causa, UserRole, FaseProcedimental } from '../types';
import type { SidebarView } from './Sidebar';
import type { Course, Student } from '../lib/supabase';
import type { FormAction } from '../hooks/useNewCausaForm';
import CausasView from './MainContent/CausasView';
import ErrorBoundary from './ErrorBoundary';
import { DashboardMetricSkeleton, CausaCardSkeleton } from './Skeleton';

const DashboardStats = lazy(() => import('./DashboardStats'));
const StudentsPanel = lazy(() => import('./StudentsPanel'));
const AdvisorView = lazy(() => import('./MainContent/AdvisorView'));
const AnotacionesView = lazy(() => import('./Anotaciones/AnotacionesView'));

function DashboardFallback() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <DashboardMetricSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <CausaCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

function ViewFallback() {
  return <DashboardFallback />;
}

interface MainContentProps {
  currentView: SidebarView;
  causas: Causa[];
  selectedCausaId: string;
  setSelectedCausaId: (id: string) => void;
  selectedCausa: Causa | undefined;
  selectedFaseFilter: FaseProcedimental | 'Todas';
  setSelectedFaseFilter: (f: FaseProcedimental | 'Todas') => void;
  currentRole: UserRole;
  privacyMode: boolean;
  mobileShowDetail: boolean;
  setMobileShowDetail: (v: boolean) => void;
  activeCausas: Causa[];
  closedCausas: Causa[];
  aulaSeguraCausas: Causa[];
  filteredCausas: Causa[];
  showCreateForm: boolean;
  dispatchForm: React.Dispatch<FormAction>;
  handleUpdateCausa: (updated: Causa) => void;
  handleDeleteCausa: (id: string) => void;
  handleReopenCausa: (causa: Causa) => void;
  handleSelectCausaFromDashboard: (causaId: string) => void;
  handleOpenCreateForm: () => void;
  handleCreateCausa: (e: React.FormEvent) => void;
  handleStudentSelect: (studentId: string) => void;
  newEstNombre: string;
  setNewEstNombre: (v: string) => void;
  newEstRut: string;
  setNewEstRut: (v: string) => void;
  newEstCurso: string;
  newInfTipo: Causa['tipoInfraccion'];
  setNewInfTipo: (v: Causa['tipoInfraccion']) => void;
  newAulaSegura: boolean;
  setNewAulaSegura: (v: boolean) => void;
  newObs: string;
  setNewObs: (v: string) => void;
  newResponsable: string;
  setNewResponsable: (v: string) => void;
  selectedCourseId: string;
  courses: Course[];
  students: Student[];
  isLoadingCourses: boolean;
  isLoadingStudents: boolean;
}

export default function MainContent({
  currentView,
  causas,
  selectedCausaId,
  setSelectedCausaId,
  selectedCausa,
  selectedFaseFilter,
  setSelectedFaseFilter,
  currentRole,
  privacyMode,
  mobileShowDetail,
  setMobileShowDetail,
  activeCausas,
  closedCausas,
  aulaSeguraCausas,
  filteredCausas,
  showCreateForm,
  dispatchForm,
  handleUpdateCausa,
  handleDeleteCausa,
  handleReopenCausa,
  handleSelectCausaFromDashboard,
  handleOpenCreateForm,
  handleCreateCausa,
  handleStudentSelect,
  newEstNombre,
  setNewEstNombre,
  newEstRut,
  setNewEstRut,
  newEstCurso,
  newInfTipo,
  setNewInfTipo,
  newAulaSegura,
  setNewAulaSegura,
  newObs,
  setNewObs,
  newResponsable,
  setNewResponsable,
  selectedCourseId,
  courses,
  students,
  isLoadingCourses,
  isLoadingStudents,
}: MainContentProps) {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 outline-none">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {currentView === 'dashboard' && 'Vista: Panel de control'}
        {currentView === 'causas' && 'Vista: Expedientes'}
        {currentView === 'informes' && 'Vista: Informes y asesor legal'}
        {currentView === 'alumnos' && 'Vista: Alumnos'}
        {currentView === 'anotaciones' && 'Vista: Gesti\u00f3n de Anotaciones'}
      </div>
      {/* VIEW 1: DASHBOARD - Fully redesigned */}
      {currentView === 'dashboard' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewFallback />}>
            <DashboardStats
              causas={causas}
              onFaseSelect={(fase) => {
                setSelectedFaseFilter(fase);
              }}
              selectedFase={selectedFaseFilter}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 2: CAUSAS (Active Cases workspace) */}
      {currentView === 'causas' && (
        <CausasView
          causas={causas}
          selectedCausaId={selectedCausaId}
          setSelectedCausaId={setSelectedCausaId}
          selectedCausa={selectedCausa}
          selectedFaseFilter={selectedFaseFilter}
          setSelectedFaseFilter={setSelectedFaseFilter}
          currentRole={currentRole}
          privacyMode={privacyMode}
          mobileShowDetail={mobileShowDetail}
          setMobileShowDetail={setMobileShowDetail}
          filteredCausas={filteredCausas}
          aulaSeguraCausas={aulaSeguraCausas}
          showCreateForm={showCreateForm}
          dispatchForm={dispatchForm}
          handleUpdateCausa={handleUpdateCausa}
          handleDeleteCausa={handleDeleteCausa}
          handleReopenCausa={handleReopenCausa}
          handleSelectCausaFromDashboard={handleSelectCausaFromDashboard}
          handleOpenCreateForm={handleOpenCreateForm}
        />
      )}

      {/* VIEW 4: AI ADVISOR */}
      {currentView === 'informes' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewFallback />}>
            <AdvisorView />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 5: ALUMNOS */}
      {currentView === 'alumnos' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewFallback />}>
            <StudentsPanel privacyMode={privacyMode} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 6: ANOTACIONES */}
      {currentView === 'anotaciones' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewFallback />}>
            <AnotacionesView privacyMode={privacyMode} />
          </Suspense>
        </ErrorBoundary>
      )}
    </main>
  );
}

