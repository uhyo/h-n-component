import { assertNever } from "./assertNever.js";

type HeadingMetadata = {
  level: number;
  belongingSection: Node | null;
  isSectionTop: boolean;
};

const sectionLevelMap = new WeakMap<Node, HeadingMetadata>();

type SectionState =
  | {
      type: "same";
    }
  | {
      type: "up";
      upLevel: number;
      initialSection: Node;
    }
  | {
      type: "prev-in-depth";
      initialParent: Node | null;
      downLevel: number;
    };

/**
 * Traverses DOM and gets the level that given heading should have.
 */
export function getHeadingLevel(heading: HTMLElement): number {
  const cache = sectionLevelMap.get(heading);
  if (cache !== undefined) {
    return cache.level;
  }
  const result = getHeadingMetadataImpl(heading);
  sectionLevelMap.set(heading, result);
  return result.level;
}

function getHeadingMetadataImpl(heading: Node): HeadingMetadata {
  if (heading.ownerDocument === null) {
    // ?
    return {
      level: 1,
      belongingSection: null,
      isSectionTop: true,
    };
  }
  const walker = document.createTreeWalker(
    heading.ownerDocument,
    NodeFilter.SHOW_ELEMENT,
    () => NodeFilter.FILTER_ACCEPT
  );
  walker.currentNode = heading;

  let sectionState: SectionState = { type: "same" };

  while (true) {
    const currentNode = walker.currentNode;
    const previousNode = walker.previousNode();
    if (previousNode === null) {
      // First heading in the document
      const result = {
        level: 1,
        belongingSection: null,
        isSectionTop: true,
      };
      sectionLevelMap.set(heading, result);
      return result;
    }
    // Relationship between prev and current is one of below:
    // 1. prev is the parent of current
    // 2. sibling
    // 3. other
    if (currentNode.parentNode === previousNode) {
      switch (sectionState.type) {
        case "same": {
          if (isSectioningContent(previousNode)) {
            sectionState = {
              type: "up",
              initialSection: previousNode,
              upLevel: 1,
            };
          }
          break;
        }
        case "up": {
          if (isSectioningContent(previousNode)) {
            sectionState.upLevel++;
          }
          break;
        }
        case "prev-in-depth": {
          if (previousNode.parentNode === sectionState.initialParent) {
            sectionState = {
              type: "same",
            };
          } else if (isSectioningContent(previousNode)) {
            sectionState.downLevel++;
          }
          break;
        }
        default: {
          assertNever(sectionState);
        }
      }
      continue;
    }
    if (
      currentNode.parentNode !== previousNode.parentNode &&
      sectionState.type !== "prev-in-depth"
    ) {
      sectionState = {
        type: "prev-in-depth",
        initialParent: currentNode.parentNode,
        downLevel: 0,
      };
    }
    if (isHeadingElement(previousNode)) {
      switch (sectionState.type) {
        case "same": {
          const prevMeta = getHeadingMetadataImpl(previousNode);
          const result: HeadingMetadata = prevMeta.isSectionTop
            ? {
                level: prevMeta.level + 1,
                belongingSection: prevMeta.belongingSection,
                isSectionTop: false,
              }
            : {
                level: prevMeta.level,
                belongingSection: prevMeta.belongingSection,
                isSectionTop: false,
              };
          sectionLevelMap.set(heading, result);
          return result;
        }
        case "up": {
          const prevMeta = getHeadingMetadataImpl(previousNode);
          const result: HeadingMetadata = {
            level: prevMeta.level + sectionState.upLevel,
            belongingSection: sectionState.initialSection,
            isSectionTop: true,
          };
          sectionLevelMap.set(heading, result);
          return result;
        }
        case "prev-in-depth": {
          // Just for caching
          getHeadingMetadataImpl(previousNode);
          continue;
        }
      }
    }
  }
}

/**
 * @see https://html.spec.whatwg.org/multipage/dom.html#sectioning-content
 */
function isSectioningContent(element: Node) {
  const tagNames: readonly string[] = ["ARTICLE", "SECTION", "NAV", "ASIDE"];
  return tagNames.includes(element.nodeName);
}

function isHeadingElement(element: Node) {
  const tagNames: readonly string[] = [
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HGROUP",
    "H-N",
  ];
  return tagNames.includes(element.nodeName);
}
