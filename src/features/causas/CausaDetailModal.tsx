/** @license SPDX-License-Identifier: Apache-2.0 */

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../shared/ui/Dialog';
import type { Causa } from '../../types';
import InteractiveTimeline from '../../components/InteractiveTimeline';

interface CausaDetailModalProps {
  causa: Causa | undefined;
  privacyMode: boolean;
  isLoading: boolean;
  onClose: () => void;
}

export default function CausaDetailModal({
  causa,
  privacyMode,
  isLoading,
  onClose,
}: CausaDetailModalProps) {
  return (
    <Dialog open={Boolean(causa)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideClose
        className="flex h-[min(92vh,900px)] max-h-[92vh] w-[min(96vw,1280px)] max-w-none flex-col overflow-hidden p-0"
        aria-label={causa ? `Gestión del expediente ${causa.id}` : 'Gestión del expediente'}
      >
        <DialogTitle className="sr-only">
          {causa ? `Expediente ${causa.id}` : 'Expediente'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Gestión completa del debido proceso, sus hitos, bitácora y asistencia legal.
        </DialogDescription>
        {causa && isLoading && (
          <div className="flex flex-1 items-center justify-center p-6" role="status">
            <p className="font-medium text-neutral-500 text-sm">
              Cargando antecedentes del expediente…
            </p>
          </div>
        )}
        {causa && !isLoading && (
          <InteractiveTimeline
            key={causa.id}
            causa={causa}
            privacyMode={privacyMode}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
