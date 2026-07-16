/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Dialog, DialogContent } from './ui/Dialog';
import EditCausaModalForm from './EditCausaModal/EditCausaModalForm';

const INFRACCIONES: string[] = ['Leve', 'Grave', 'Muy Grave', 'Gravísima'];

interface EditCausaModalProps {
  causa: {
    id: string;
    estudianteNombre: string;
    nnaProtectedName: string;
    estudianteCurso: string;
    runEstudiante: string;
    tipoInfraccion: string;
    comprometeAulaSegura: boolean;
    responsable: string;
    estadoActual: string;
    observaciones: string;
    fechaUltimaActualizacion: string;
    esDenunciaConfidencial: boolean;
    identidadReservada: boolean;
    fechaInicioInvestigacion?: string;
    fechaInicioSuspension?: string;
    duracionSuspensionDias?: number;
    monitoreoPedagogico: boolean;
    requiereNotificacionSuperintendencia: boolean;
    fechaNotificacionSuperintendencia?: string;
    estudianteTieneNEE: boolean;
    tipoNEE?: string;
  };
  onClose: () => void;
  onSave: (updated: any) => void;
  onDelete: (id: string) => void;
}

export default function EditCausaModal({ causa, onClose, onSave, onDelete }: EditCausaModalProps) {
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const handleSave = (updated: any) => {
    onSave(updated);
    handleClose();
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    handleClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <EditCausaModalForm
          causa={causa}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}