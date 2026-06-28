export {};

declare global {
  interface Window {
    champCity: {
      getAppInfo: () => {
        name: string;
        stage: string;
        coreLoop: string[];
      };
    };
  }
}
