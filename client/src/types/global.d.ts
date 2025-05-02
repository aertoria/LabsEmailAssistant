// Global declarations for enhanced types

interface Window {
  _clusterResizeHandler?: () => void;
}

interface SVGSVGElement {
  _updateFn?: () => void;
}

interface Element {
  _updateFn?: () => void;
}
