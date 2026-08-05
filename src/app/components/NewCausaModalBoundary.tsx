/** @license SPDX-License-Identifier: Apache-2.0 */

import { Suspense, lazy } from 'react';
import type { ComponentProps } from 'react';
import { ModalSkeleton } from '../../shared/Skeleton';
import type NewCausaModalType from '../../components/NewCausaModal';

const NewCausaModal = lazy(() => import('../../components/NewCausaModal'));

type NewCausaModalProps = ComponentProps<typeof NewCausaModalType>;

export default function NewCausaModalBoundary(props: NewCausaModalProps) {
  return (
    <Suspense fallback={<ModalSkeleton />}>
      <NewCausaModal {...props} />
    </Suspense>
  );
}
