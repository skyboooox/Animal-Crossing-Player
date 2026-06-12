export interface AcpRenderCounts {
  [component: string]: number;
}

export interface WindowWithAcpRenderCounts extends Window {
  __acpRenderCounts?: AcpRenderCounts;
}

export function incrementRenderCount(componentName: string) {
  const win = window as WindowWithAcpRenderCounts;
  const renderCounts = win.__acpRenderCounts;
  if (!renderCounts) {
    return;
  }

  renderCounts[componentName] = (renderCounts[componentName] ?? 0) + 1;
}
