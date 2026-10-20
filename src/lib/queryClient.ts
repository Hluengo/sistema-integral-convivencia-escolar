/** @license SPDX-License-Identifier: Apache-2.0 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      // Al volver de otra pestaña no se re-consulta: el modal perdía el
      // avance mientras se copiaban datos desde otra ventana. La frescura se
      // resuelve al remontar la vista o al recargar.
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});
