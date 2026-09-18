/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from "react";
import { Download, FileSearch, FileStack, History, Route } from "lucide-react";
import type { Causa } from "../../shared/lib/types";
import type { TimelineTab } from "./timelineTabs.types";
import {
  DetailModalTabs,
  type DetailModalTab,
} from "../../shared/ui/DetailModal";
import { getCausaOperationalSummary } from "../causas/causaOperationalSummary";

interface TimelineTabsProps {
  activeTab: TimelineTab;
  setActiveTab: React.Dispatch<React.SetStateAction<TimelineTab>>;
  causa: Causa;
}

export default function TimelineTabs({
  activeTab,
  setActiveTab,
  causa,
}: TimelineTabsProps) {
  const summary = getCausaOperationalSummary(causa);
  const progress = summary.currentPhaseProgress;
  const progressLabel = progress.total
    ? `${progress.completed}/${progress.total}`
    : "Sin hitos";

  const badge = (
    text: string,
    tone: "brand" | "grave" | "neutral" | "info" = "brand",
  ) => (
    <span
      className={`mx-auto w-fit max-w-full truncate rounded-full px-2 py-0.5 text-[0.7rem] leading-tight ${
        tone === "grave"
          ? "bg-grave-100 text-neutral-800"
          : tone === "neutral"
            ? "bg-neutral-150 text-neutral-700"
            : tone === "info"
              ? "bg-info-100 text-neutral-800"
              : "bg-brand-100 text-brand-800"
      }`}
    >
      {text}
    </span>
  );

  const tabDefinitions: Array<{
    id: TimelineTab;
    label: string;
    Icon: typeof FileSearch;
    indicator?: React.ReactNode;
  }> = [
    { id: "resumen", label: "Resumen", Icon: FileSearch },
    {
      id: "ruta",
      label: "Ruta del expediente",
      Icon: Route,
      indicator: badge(`${summary.currentPhase} · ${progressLabel}`),
    },
    {
      id: "bitacora",
      label: "Historial",
      Icon: History,
      indicator: badge(`${summary.historyCount} registros`),
    },
    {
      id: "matriz",
      label: "Matriz",
      Icon: FileStack,
      indicator: badge(
        causa.tipoInfraccion,
        causa.comprometeAulaSegura ? "grave" : "neutral",
      ),
    },
    {
      id: "expediente",
      label: "Auditoría/expediente",
      Icon: Download,
      indicator: badge(`${summary.documentsCount} documentos`),
    },
  ];

  const tabs: DetailModalTab<TimelineTab>[] = tabDefinitions.map(
    ({ id, label, Icon, indicator }) => ({
      id,
      label,
      icon: <Icon className="size-4" aria-hidden="true" />,
      indicator,
    }),
  );

  return (
    <DetailModalTabs
      activeTab={activeTab}
      ariaLabel="Secciones del expediente"
      onChange={setActiveTab}
      tabs={tabs}
    />
  );
}
