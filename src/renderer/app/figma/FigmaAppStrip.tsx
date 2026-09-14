import { productIdentity } from "../../../shared/productIdentity";

const champCityMarkSource = "../branding/champcity-mark.svg";

export function FigmaAppStrip(): JSX.Element {
  return (
    <header className="figma-app-strip" aria-label="ChampCity application">
      <div className="figma-app-brand">
        <span className="figma-app-mark" aria-hidden="true">
          <img src={champCityMarkSource} alt="" />
        </span>
        <strong>{productIdentity.productName}</strong>
      </div>
    </header>
  );
}
