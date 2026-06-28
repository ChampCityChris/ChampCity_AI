const appInfo = window.champCity.getAppInfo();
const loopContainer = document.querySelector<HTMLOListElement>("#core-loop");
const title = document.querySelector<HTMLHeadingElement>("#app-title");

if (title) {
  title.textContent = appInfo.name;
}

if (loopContainer) {
  for (const step of appInfo.coreLoop) {
    const item = document.createElement("li");
    item.textContent = step;
    loopContainer.appendChild(item);
  }
}
