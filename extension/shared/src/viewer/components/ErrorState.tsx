interface ErrorStateProps {
  title: string;
  detail: string;
  onShowRaw?: () => void;
  onOpenAnotherFile?: () => void;
}

export function ErrorState({ title, detail, onShowRaw, onOpenAnotherFile }: ErrorStateProps) {
  return (
    <div className="error-state">
      <h2>{title}</h2>
      <p>{detail}</p>
      {onShowRaw ? (
        <button type="button" onClick={onShowRaw}>
          Show raw
        </button>
      ) : null}
      {onOpenAnotherFile ? (
        <button type="button" onClick={onOpenAnotherFile}>
          Open another file
        </button>
      ) : null}
    </div>
  );
}
