/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import type { Causa } from '@/shared/lib/types';
import { Dialog, DialogContent } from '../../../shared/ui/Dialog';
import EditCausaModalForm from '../EditCausaModal/EditCausaModalForm';

interface EditCausaModalProps {
  causa: Causa;
  onClose: () => void;
  onSave: (updated: Causa) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export default function EditCausaModal({ causa, onClose, onSave, onDelete }: EditCausaModalProps) {
  const [open, setOpen] = useState(true);

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
      <DialogContent className="max-h-[calc(100vh-1rem)] max-w-2xl overflow-y-auto p-0 sm:max-h-[90vh]">
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
