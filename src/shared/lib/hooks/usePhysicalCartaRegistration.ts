/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useState } from 'react';
import {
  registerPhysicalCartaForStudent,
  type PhysicalCartaRegistrationResult,
} from '@/src/services/cartas.service';
import type { PhysicalCartaRegistrationInput } from '@/src/shared/lib/schemas/physicalCarta';

interface UsePhysicalCartaRegistrationOptions {
  onRegistered: () => void | Promise<void>;
}

interface UsePhysicalCartaRegistrationResult {
  isRegistering: boolean;
  registerPhysicalCarta: (
    input: PhysicalCartaRegistrationInput,
  ) => Promise<PhysicalCartaRegistrationResult>;
}

export function usePhysicalCartaRegistration({
  onRegistered,
}: UsePhysicalCartaRegistrationOptions): UsePhysicalCartaRegistrationResult {
  const [isRegistering, setIsRegistering] = useState(false);

  const registerPhysicalCarta = useCallback(
    async (input: PhysicalCartaRegistrationInput) => {
      setIsRegistering(true);
      try {
        const result = await registerPhysicalCartaForStudent(input);
        if (result.ok) await onRegistered();
        return result;
      } finally {
        setIsRegistering(false);
      }
    },
    [onRegistered],
  );

  return { isRegistering, registerPhysicalCarta };
}
