export function scrollToElement(element: HTMLElement): void {
  let ancestor = element.parentElement;
  while (ancestor) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    ancestor = ancestor.parentElement;
  }
  element.scrollIntoView({ behavior: "smooth", block: "start" });
}
