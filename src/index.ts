import { getHeadingLevel } from "./getHeadingLevel.js";

export class HnElement extends HTMLElement {
  override readonly shadowRoot: ShadowRoot;
  #level: number = 1;
  constructor() {
    super();

    this.shadowRoot = this.attachShadow({
      mode: "open",
    });
  }

  get level() {
    return this.#level;
  }

  connectedCallback() {
    const level = getHeadingLevel(this);
    this.#level = level < 1 ? 1 : level > 6 ? 6 : level;
    const hElm = this.ownerDocument.createElement(`h${this.#level}`);
    hElm.append(this.ownerDocument.createElement("slot"));
    this.shadowRoot.replaceChildren(hElm);
  }
}
