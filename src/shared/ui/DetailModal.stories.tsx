import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Dialog, DialogTitle } from "./Dialog";
import {
  DetailModalContent,
  DetailModalHeader,
  DetailModalTabs,
} from "./DetailModal";

function DetailModalStory() {
  const [activeTab, setActiveTab] = useState<"resumen" | "historial">(
    "resumen",
  );

  return (
    <Dialog defaultOpen>
      <DetailModalContent ariaLabel="Ficha de estudiante">
        <DialogTitle className="sr-only">Ficha de estudiante</DialogTitle>
        <DetailModalHeader
          avatarInitial="EM"
          title="Emilia Martínez"
          metadata={<span>7° básico · Registro de convivencia</span>}
          actions={
            <button
              className="rounded-lg border border-neutral-200 px-3 py-2 font-medium text-neutral-700 text-sm"
              type="button"
            >
              Exportar
            </button>
          }
        />
        <DetailModalTabs
          activeTab={activeTab}
          ariaLabel="Secciones de la ficha"
          onChange={setActiveTab}
          tabs={[
            {
              id: "resumen",
              label: "Resumen",
              icon: <span aria-hidden="true">◉</span>,
            },
            {
              id: "historial",
              label: "Historial",
              icon: <span aria-hidden="true">◷</span>,
            },
          ]}
        />
        <section className="flex-1 overflow-auto p-6">
          <h3 className="font-semibold text-neutral-900 text-lg">
            {activeTab === "resumen" ? "Resumen del caso" : "Historial"}
          </h3>
          <p className="mt-2 text-neutral-600 text-sm">
            Estado visual de referencia para validar layout, navegación y foco.
          </p>
        </section>
      </DetailModalContent>
    </Dialog>
  );
}

const meta = {
  title: "Compartidos/Ficha detallada",
  component: DetailModalStory,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof DetailModalStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FichaConPestanas: Story = {};
