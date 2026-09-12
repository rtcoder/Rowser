import type { ReactNode } from 'react';

interface DropZoneProps {
  children: ReactNode;
  onFile: (file: File) => void;
}

export function DropZone({ children, onFile }: DropZoneProps) {
  return (
    <main
      className="viewer"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files.item(0);
        if (file) {
          onFile(file);
        }
      }}
    >
      {children}
    </main>
  );
}
