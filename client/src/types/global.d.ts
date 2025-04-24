// Type definitions for global window object
interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: any) => void;
        prompt: (callback: any) => void;
        renderButton: (element: HTMLElement, config: any) => void;
      }
    }
  }
}