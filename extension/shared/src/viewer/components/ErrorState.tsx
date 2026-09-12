interface ErrorStateProps {
  title: string;
  detail: string;
}

export function ErrorState({ title, detail }: ErrorStateProps) {
  return (
    <div className="error-state">
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
  );
}
