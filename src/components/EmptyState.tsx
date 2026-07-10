import React from 'react';
import { FileSearch, FolderOpen, Users, MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="p-4 rounded-2xl bg-neutral-100 text-neutral-400 mb-4">
        {icon || <FileSearch className="h-8 w-8" />}
      </div>
      <h3 className="text-sm font-semibold text-neutral-700 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function EmptyCausas({ onCreateCausa }: { onCreateCausa?: () => void }) {
  return (
    <EmptyState
      icon={<FolderOpen className="h-8 w-8" />}
      title="No hay expedientes"
      description="Comience creando un nuevo expediente para gestionar el debido proceso."
      action={onCreateCausa ? (
        <button
          type="button"
          onClick={onCreateCausa}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          + Crear primer expediente
        </button>
      ) : undefined}
    />
  );
}

export function EmptyBitacora() {
  return (
    <EmptyState
      icon={<MessageSquare className="h-8 w-8" />}
      title="Sin entradas en bitácora"
      description="Registre observaciones, decisiones y seguimiento del expediente."
    />
  );
}

export function EmptyStudents() {
  return (
    <EmptyState
      icon={<Users className="h-8 w-8" />}
      title="Sin estudiantes registrados"
      description="No se encontraron estudiantes para mostrar."
    />
  );
}
