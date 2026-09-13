import type { FileSizeDecision } from '../state/file-size-policy';

interface LargeFileDialogProps {
  decision: Exclude<FileSizeDecision, { kind: 'none' } | { kind: 'subtle' }>;
  sourceName: string;
  onOpenTable: () => void;
  onShowRaw: () => void;
  onCancel: () => void;
}

export function LargeFileDialog({
  decision,
  sourceName,
  onOpenTable,
  onShowRaw,
  onCancel
}: LargeFileDialogProps) {
  return (
    <div className="large-file">
      <h2>{decision.title}</h2>
      <p className="large-file__source">{sourceName}</p>
      <p>{decision.message}</p>
      <div className="large-file__actions">
        <button type="button" onClick={onOpenTable}>
          {decision.confirmLabel}
        </button>
        <button type="button" onClick={onShowRaw}>
          Show raw
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
