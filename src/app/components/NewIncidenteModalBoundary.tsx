/** @license SPDX-License-Identifier: Apache-2.0 */

import { lazy, Suspense } from 'react';
import type { ComponentProps } from 'react';
import { ModalSkeleton } from '../../shared/Skeleton';
import type NewIncidenteModalType from '../../features/causas/ui/NewIncidenteModal';

const NewIncidenteModal = lazy(() => import('../../features/causas/ui/NewIncidenteModal'));

type NewIncidenteModalProps = ComponentProps<typeof NewIncidenteModalType>;

export default function NewIncidenteModalBoundary(props: NewIncidenteModalProps) {
  return (
    <Suspense fallback={<ModalSkeleton />}>
      <NewIncidenteModal {...props} />
    </Suspense>
  );
}
