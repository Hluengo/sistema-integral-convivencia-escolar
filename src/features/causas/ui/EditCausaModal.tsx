/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import type { Causa } from "@/shared/lib/types";
import { useAuthStore } from "@/shared/lib/stores/authStore";
import { canReopenCausaForRoles } from "@/shared/lib/causaPermissions";
import { Dialog, DialogContent } from "../../../shared/ui/Dialog";
import EditCausaModalForm from "../EditCausaModal/EditCausaModalForm";
import { useSessionDraftKey } from "@/shared/lib/hooks/useSessionDraftKey";

interface EditCausaModalProps {
  causa: Causa;
  onClose: () => void;
  onSave: (updated: Causa) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export default function EditCausaModal({
  causa,
  onClose,
  onSave,
  onDelete,
}: EditCausaModalProps) {
  const [open, setOpen] = useState(true);
  const profileRole = useAuthStore((s) => s.profileRole);
  const appRole = useAuthStore((s) => s.appRole);
  const draftKey = useSessionDraftKey("edit-causa", causa.id);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const handleSave = (updated: Causa) => {
    onSave(updated);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const deleted = await onDelete(id);
    if (deleted) handleClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideClose
        style={{ maxWidth: "820px" }}
        className="max-h-[calc(100vh-1rem)] overflow-y-auto p-0 sm:max-h-[90vh]"
      >
        <EditCausaModalForm
          key={draftKey ?? causa.id}
          causa={causa}
          draftKey={draftKey}
          canReopen={canReopenCausaForRoles(profileRole, appRole)}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}
