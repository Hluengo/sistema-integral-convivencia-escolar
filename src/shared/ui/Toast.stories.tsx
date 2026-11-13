import type { Meta, StoryObj } from "@storybook/react-vite";
import { ToastProvider } from "./Toast";
import { useToastStore, type ToastType } from "../lib/stores/toastStore";

function ToastStory() {
  const types: ToastType[] = ["success", "error", "warning", "info"];

  return (
    <ToastProvider>
      <main className="min-h-screen bg-neutral-50 p-8">
        <h1 className="font-semibold text-neutral-900 text-xl">
          Notificaciones del sistema
        </h1>
        <div className="mt-6 flex flex-wrap gap-3">
          {types.map((type) => (
            <button
              className="rounded-lg bg-neutral-900 px-4 py-2 font-medium text-sm text-white"
              key={type}
              onClick={() =>
                useToastStore
                  .getState()
                  .addToast(type, `Notificación ${type} de ejemplo`)
              }
              type="button"
            >
              {type}
            </button>
          ))}
        </div>
      </main>
    </ToastProvider>
  );
}

const meta = {
  title: "Compartidos/Toast",
  component: ToastStory,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof ToastStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Estados: Story = {};
