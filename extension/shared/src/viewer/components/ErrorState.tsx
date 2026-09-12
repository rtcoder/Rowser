interface ErrorStateProps {
  title: string;
  detail: string;
  onOpenAnotherFile?: () => void;
}

export function ErrorState({ title, detail, onOpenAnotherFile }: ErrorStateProps) {
  return (
    <div className="error-state">
      <h2>{title}</h2>
      <p>{detail}</p>
      {onOpenAnotherFile ? (
        <button type="button" onClick={onOpenAnotherFile}>
          Open another file
        </button>
      ) : null}
    </div>
  );
}
