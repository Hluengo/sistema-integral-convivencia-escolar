/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Causa } from '../../../shared/lib/types';
import type { SidebarView } from '../../../widgets/sidebar/Sidebar';

export interface CausaWorkspaceViewModel {
  causas: Causa[];
  selectedCausaId: string;
  setSelectedCausaId: (id: string) => void;
  selectedCausa: Causa | null;
  isCausaDetailLoading: boolean;
  filteredCausas: Causa[];
  hasMoreCausas: boolean;
  isLoadingMoreCausas: boolean;
  onLoadMoreCausas: () => void;
}

export interface CreateCausaActions {
  onOpen: () => void;
  onToggle: () => void;
}

export interface MainNavigationActions {
  onNavigate: (view: SidebarView) => void;
  onReopenCausa: (causa: Causa | null) => void;
  onSelectCausaFromDashboard: (causaId: string) => void;
}
