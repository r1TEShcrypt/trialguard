import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
export default function EditorSurface({ title, children, onClose }) {
  const [mobile, setMobile] = useState(
      () => matchMedia("(max-width:680px)").matches,
    ),
    origin = useRef(document.activeElement);
  useEffect(() => {
    const q = matchMedia("(max-width:680px)");
    const fn = () => setMobile(q.matches);
    q.addEventListener("change", fn);
    return () => q.removeEventListener("change", fn);
  }, []);
  const Root = mobile ? Dialog : Sheet,
    Content = mobile ? DialogContent : SheetContent,
    Title = mobile ? DialogTitle : SheetTitle,
    Description = mobile ? DialogDescription : SheetDescription;
  return (
    <Root
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Content
        showCloseButton={false}
        className={mobile ? "editor-dialog" : "editor-sheet"}
        onInteractOutside={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          (origin.current?.isConnected
            ? origin.current
            : document.querySelector(".command-launch")
          )?.focus();
        }}
      >
        <div className="editor-surface-header">
          <div>
            <Title>{title}</Title>
            <Description>Make every plan a deliberate choice.</Description>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </Content>
    </Root>
  );
}
