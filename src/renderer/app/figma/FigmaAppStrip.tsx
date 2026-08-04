import { Zap } from "lucide-react";

export function FigmaAppStrip(): JSX.Element {
  return (
    <header className="figma-app-strip" aria-label="ChampCity application">
      <div className="figma-app-brand">
        <span className="figma-app-mark" aria-hidden="true">
          <Zap size={10} />
        </span>
        <strong>ChampCity AI</strong>
      </div>
    </header>
  );
}
