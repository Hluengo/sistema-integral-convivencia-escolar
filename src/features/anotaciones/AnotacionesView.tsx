/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  useState,
  useCallback,
  lazy,
  useMemo,
  useEffect,
  Suspense,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Shield, Plus } from "lucide-react";
import type { Annotation, AnotacionStudent } from "../../shared/lib/types";
import {
  fetchAnnotations,
  fetchStudentsWithAnnotationCounts,
} from "../../shared/api/services/annotations.service";
import { fetchCartaTableStates } from "../../shared/api/services/cartas.service";
import AnotacionesStudentTable from "./AnotacionesStudentTable";
import { AnnotationsSkeleton, ModalSkeleton } from "../../shared/Skeleton";
import type { ActiveTab } from "./AnotacionesStudentDetailModal/constants";
import Button from "@/shared/ui/Button";
import PageHeader from "@/shared/ui/PageHeader";
import { useAuthStore } from "../../shared/lib/stores/authStore";
import {
  applyCartaStatesToStudents,
  buildCartaStatusLabels,
} from "./annotationStudentCartaStates";

const AnotacionesStudentDetailModal = lazy(
  () => import("./AnotacionesStudentDetailModal"),
);
const NewDisciplinaryProcessModal = lazy(
  () => import("./NewDisciplinaryProcessModal"),
);
const BulkAnnotationsImportModal = lazy(
  () => import("./BulkAnnotationsImportModal"),
);

const DETAIL_STORAGE_PREFIX = "anotaciones-detail";

function detailStorageKey(tenantId: string) {
  return `${DETAIL_STORAGE_PREFIX}:${tenantId}`;
}

function clearStoredDetail(tenantId: string | null) {
  if (!tenantId || typeof window === "undefined") return;
  window.sessionStorage.removeItem(detailStorageKey(tenantId));
}

interface AnotacionesViewProps {
  privacyMode: boolean;
}

export default function AnotacionesView({ privacyMode }: AnotacionesViewProps) {
  const tenantId = useAuthStore((state) => state.tenantId);
  const profileRole = useAuthStore((state) => state.profileRole);
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [detailInitialTab, setDetailInitialTab] = useState<ActiveTab>("estado");
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] =
    useState<boolean>(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] =
    useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("con_registro");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const studentsQuery = useQuery({
    queryKey: ["anotaciones", "students", tenantId],
    queryFn: fetchStudentsWithAnnotationCounts,
    enabled: Boolean(tenantId),
    staleTime: 1000 * 60 * 5,
  });
  const cartaStatesQuery = useQuery({
    queryKey: ["anotaciones", "carta-states", tenantId],
    queryFn: fetchCartaTableStates,
    enabled: Boolean(tenantId),
    staleTime: 1000 * 60 * 5,
  });
  const rawStudents = useMemo(
    () => studentsQuery.data ?? [],
    [studentsQuery.data],
  );
  const students = useMemo(
    () => applyCartaStatesToStudents(rawStudents, cartaStatesQuery.data),
    [cartaStatesQuery.data, rawStudents],
  );
  const selectedStudent = useMemo(
    () =>
      selectedStudentId
        ? (students.find((student) => student.id === selectedStudentId) ?? null)
        : null,
    [selectedStudentId, students],
  );
  useEffect(() => {
    if (!tenantId || typeof window === "undefined") return;
    const storedId = window.sessionStorage.getItem(detailStorageKey(tenantId));
    setSelectedStudentId(storedId);
  }, [tenantId]);
  useEffect(() => {
    if (!tenantId || !studentsQuery.data || !selectedStudentId) return;
    if (!students.some((student) => student.id === selectedStudentId)) {
      clearStoredDetail(tenantId);
      setSelectedStudentId(null);
    }
  }, [selectedStudentId, students, studentsQuery.data, tenantId]);
  const openStudentDetail = useCallback(
    (student: AnotacionStudent, initialTab: ActiveTab) => {
      setDetailInitialTab(initialTab);
      setSelectedStudentId(student.id);
      if (tenantId && typeof window !== "undefined") {
        window.sessionStorage.setItem(detailStorageKey(tenantId), student.id);
      }
    },
    [tenantId],
  );
  const closeStudentDetail = useCallback(() => {
    clearStoredDetail(tenantId);
    setSelectedStudentId(null);
  }, [tenantId]);
  const cartaStatuses = useMemo(
    () => buildCartaStatusLabels(students, cartaStatesQuery.data),
    [cartaStatesQuery.data, students],
  );
  const annotationsQuery = useQuery({
    queryKey: ["anotaciones", "student", tenantId, selectedStudent?.id],
    queryFn: () => fetchAnnotations(selectedStudent?.id),
    enabled: Boolean(tenantId && selectedStudent?.id),
    staleTime: 1000 * 60 * 5,
  });
  const isLoading = studentsQuery.isLoading;
  const dbError =
    studentsQuery.error instanceof Error ? studentsQuery.error.message : null;
  const loadData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["anotaciones", "students", tenantId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["anotaciones", "carta-states", tenantId],
      }),
    ]);
  }, [queryClient, tenantId]);
  const refreshStudentTable = loadData;

  if (isLoading) {
    return <AnnotationsSkeleton />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Convivencia Escolar · Debido Proceso"
        title="Anotaciones"
        description="Registro de anotaciones disciplinarias de estudiantes"
        action={
          <div className="flex flex-wrap justify-end gap-2">
            {(["superadmin", "admin", "direccion"] as string[]).includes(
              profileRole ?? "",
            ) && (
              <Button
                variant="secondary"
                onClick={() => setIsBulkImportModalOpen(true)}
                className="shrink-0"
                aria-label="Importar fichas PDF"
              >
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Importar fichas PDF
              </Button>
            )}
            <Button
              onClick={() => setIsNewProcessModalOpen(true)}
              className="shrink-0"
              aria-label="Crear nuevo proceso"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo Proceso
            </Button>
          </div>
        }
      />

      {/* DB Error Alert */}
      {dbError && (
        <div className="flex items-start gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 p-4 shadow-sm">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-gravisima-500" />
          <div className="space-y-1 text-gravisima-700 text-xs">
            <p className="font-bold">Protección de Datos de NNA</p>
            <p className="leading-relaxed">
              No se pudo conectar con la base de datos. Los datos mostrados
              corresponden a información local. Los nombres y RUT de los
              estudiantes se encuentran protegidos por normativa de privacidad.
            </p>
            <p className="mt-1 font-mono text-10px text-gravisima-600">
              Error: {dbError}
            </p>
          </div>
        </div>
      )}

      {/* Student Table - full width */}
      {cartaStatesQuery.isError ? (
        <p role="alert" className="text-sm text-gravisima-700">
          No fue posible verificar las cartas. Su estado no se considera
          pendiente hasta reintentar la consulta.
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void cartaStatesQuery.refetch()}
          >
            Reintentar
          </button>
        </p>
      ) : cartaStatesQuery.isPending ? (
        <p role="status" className="text-sm text-neutral-600">
          Verificando estado de cartas…
        </p>
      ) : null}
      <AnotacionesStudentTable
        students={students}
        privacyMode={privacyMode}
        onSelectStudent={(student) => openStudentDetail(student, "estado")}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoading={isLoading}
        cartaStatuses={cartaStatuses}
      />

      {/* Student Detail Modal */}
      {selectedStudent && (
        <Suspense fallback={<ModalSkeleton />}>
          <AnotacionesStudentDetailModal
            student={selectedStudent}
            annotations={(annotationsQuery.data ?? []).filter(
              (annotation: Annotation) =>
                annotation.student_id === selectedStudent.id,
            )}
            privacyMode={privacyMode}
            initialTab={detailInitialTab}
            onClose={closeStudentDetail}
            onDataChanged={refreshStudentTable}
          />
        </Suspense>
      )}

      {/* New Process Modal */}
      {isNewProcessModalOpen && (
        <Suspense fallback={<ModalSkeleton />}>
          <NewDisciplinaryProcessModal
            students={students}
            onClose={() => setIsNewProcessModalOpen(false)}
            currentUserEmail=""
            onProcessCreated={loadData}
            onOpenExistingStudent={(studentId) => {
              const student = students.find(
                (candidate) => candidate.id === studentId,
              );
              if (!student) return;
              setIsNewProcessModalOpen(false);
              openStudentDetail(student, "historial");
            }}
          />
        </Suspense>
      )}
      {isBulkImportModalOpen && (
        <Suspense fallback={<ModalSkeleton />}>
          <BulkAnnotationsImportModal
            privacyMode={privacyMode}
            onClose={() => setIsBulkImportModalOpen(false)}
            onImported={loadData}
          />
        </Suspense>
      )}
    </div>
  );
}
