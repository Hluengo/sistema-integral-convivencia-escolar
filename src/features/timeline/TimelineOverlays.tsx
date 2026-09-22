/** @license SPDX-License-Identifier: Apache-2.0 */

import { Suspense, lazy } from "react";
import type { Causa } from "@/shared/lib/types";
import ConfirmDialog from "../../shared/ConfirmDialog";
import ForceCloseCausaDialog from "../causas/ForceCloseCausaDialog";
import { TimelineEditSkeleton } from "../../shared/Skeleton";

const EditCausaModal = lazy(() => import("../causas/ui/EditCausaModal"));

interface TimelineOverlaysProps {
  causa: Causa;
  showEdit: boolean;
  showConfirmDelete: boolean;
  showForceClose: boolean;
  onShowEdit: (open: boolean) => void;
  onShowConfirmDelete: (open: boolean) => void;
  onShowForceClose: (open: boolean) => void;
  onUpdateCausa: (updated: Causa) => void;
  onDeleteCausa: (id: string) => Promise<boolean>;
  onClose?: () => void;
}

export default function TimelineOverlays({
  causa,
  showEdit,
  showConfirmDelete,
  showForceClose,
  onShowEdit,
  onShowConfirmDelete,
  onShowForceClose,
  onUpdateCausa,
  onDeleteCausa,
  onClose,
}: TimelineOverlaysProps) {
  return (
    <>
      <ConfirmDialog
        open={showConfirmDelete}
        title="Eliminar expediente"
        description={`¿Eliminar el expediente ${causa.id} de forma permanente? Esta acción no se puede deshacer.`}
        onConfirm={async () => {
          const deleted = await onDeleteCausa(causa.id);
          onShowConfirmDelete(false);
          if (deleted) onClose?.();
        }}
        onCancel={() => onShowConfirmDelete(false)}
      />
      <ForceCloseCausaDialog
        causa={causa}
        open={showForceClose}
        onOpenChange={onShowForceClose}
        onConfirm={(updated) => {
          onUpdateCausa(updated);
          onClose?.();
        }}
      />
      {showEdit && (
        <Suspense fallback={<TimelineEditSkeleton />}>
          <EditCausaModal
            causa={causa}
            onClose={() => onShowEdit(false)}
            onSave={(updated) => {
              onUpdateCausa(updated);
              onShowEdit(false);
            }}
            onDelete={async (id) => {
              const deleted = await onDeleteCausa(id);
              if (deleted) {
                onShowEdit(false);
                onClose?.();
              }
              return deleted;
            }}
          />
        </Suspense>
      )}
    </>
  );
}
