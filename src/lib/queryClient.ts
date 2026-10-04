/** @license SPDX-License-Identifier: Apache-2.0 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      // Debe ser true: sin esto una pestaña montada jamás se refresca sola
      // (los hitos grupales guardados en otra pestaña/sesión no aparecen en
      // la tabla ni en los hermanos hasta recargar). Solo re-consulta las
      // queries vencidas según su staleTime, así que el costo está acotado.
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60 * 5,
    },
  },
});
