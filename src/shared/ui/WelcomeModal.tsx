/** @license SPDX-License-Identifier: Apache-2.0 */

import { ClipboardCheck, LockKeyhole, Scale, ShieldCheck } from 'lucide-react';
import Button from './Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './Dialog';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
}

const features = [
  { icon: Scale, label: 'Expedientes ordenados', text: 'Sigue cada caso y sus etapas.' },
  { icon: ClipboardCheck, label: 'Debido proceso', text: 'Registra hitos, acuerdos y evidencias.' },
  {
    icon: ShieldCheck,
    label: 'Trabajo protegido',
    text: 'Cada colegio mantiene sus datos aislados.',
  },
];

export default function WelcomeModal({ open, onClose, onLogin }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-[520px] overflow-hidden p-0">
        <div className="h-2 w-full bg-linear-to-r from-brand-500 via-brand-600 to-brand-800" />
        <div className="p-6 sm:p-8">
          <DialogHeader className="mb-6 block text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-800 shadow-lg shadow-brand-700/20">
              <img src="/logo.svg" alt="" className="h-10 w-auto invert" />
            </div>
            <DialogTitle className="text-2xl sm:text-3xl">
              Bienvenido a Gestión de Casos
            </DialogTitle>
            <DialogDescription className="mx-auto mt-2 max-w-md leading-relaxed">
              Una plataforma para organizar la convivencia escolar, documentar cada actuación y
              resguardar el debido proceso.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3">
            {features.map(({ icon: Icon, label, text }) => (
              <div
                key={label}
                className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-4"
              >
                <Icon className="mb-3 size-5 text-brand-700" aria-hidden="true" />
                <p className="font-semibold text-neutral-800 text-sm">{label}</p>
                <p className="mt-1 text-neutral-500 text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} className="rounded-xl px-4 py-2.5">
              Continuar sin iniciar sesión
            </Button>
            <Button onClick={onLogin} className="rounded-xl px-4 py-2.5">
              <LockKeyhole className="size-4" aria-hidden="true" /> Iniciar sesión
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
