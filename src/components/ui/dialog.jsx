// src/components/ui/dialog.jsx
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export function DialogTrigger({ children, asChild }) {
  return <DialogPrimitive.Trigger asChild={asChild}>{children}</DialogPrimitive.Trigger>;
}

export function DialogContent({ children, className }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
      <DialogPrimitive.Content
        className={`fixed top-1/2 left-1/2 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg ${className}`}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ children }) {
  return <div className="mb-4 border-b pb-2">{children}</div>;
}

export function DialogTitle({ children, className }) {
  return (
    <DialogPrimitive.Title className={`text-xl font-bold ${className || ''}`.trim()}>
      {children}
    </DialogPrimitive.Title>
  );
}

export function DialogDescription({ children, className }) {
  return (
    <DialogPrimitive.Description className={`text-sm text-muted-foreground ${className || ''}`.trim()}>
      {children}
    </DialogPrimitive.Description>
  );
}

export function DialogFooter({ children }) {
  return <div className="flex justify-end gap-2 mt-6">{children}</div>;
}
