/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import type { Causa } from '@/src/types';
import { Dialog, DialogContent } from './ui/Dialog';
import EditCausaModalForm from './EditCausaModal/EditCausaModalForm';

interface EditCausaModalProps {
  causa: Causa;
  onClose: () => void;
  onSave: (updated: Causa) => void;
  onDelete: (id: string) => void;
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