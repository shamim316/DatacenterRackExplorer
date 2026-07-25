/* Converters from TipTap JSON to Markdown and plain text (for exports). */

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function textWithMarks(node: TiptapNode): string {
  let t = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        t = `**${t}**`;
        break;
      case "italic":
        t = `*${t}*`;
        break;
      case "strike":
        t = `~~${t}~~`;
        break;
      case "code":
        t = `\`${t}\``;
        break;
      case "link":
        t = `[${t}](${(mark.attrs?.href as string) ?? ""})`;
        break;
    }
  }
  return t;
}

function inline(nodes: TiptapNode[] | undefined): string {
  return (nodes ?? [])
    .map((n) => (n.type === "hardBreak" ? "  \n" : n.type === "text" ? textWithMarks(n) : inline(n.content)))
    .join("");
}

function blocks(nodes: TiptapNode[] | undefined, indent = ""): string[] {
  const out: string[] = [];
  for (const node of nodes ?? []) {
    switch (node.type) {
      case "paragraph":
        out.push(indent + inline(node.content));
        break;
      case "heading": {
        const level = Math.min(Number(node.attrs?.level ?? 1) + 2, 6);
        out.push(indent + "#".repeat(level) + " " + inline(node.content));
        break;
      }
      case "bulletList":
        for (const item of node.content ?? []) {
          const body = blocks(item.content, "");
          out.push(indent + "- " + body.join(`\n${indent}  `));
        }
        break;
      case "orderedList": {
        let i = Number(node.attrs?.start ?? 1);
        for (const item of node.content ?? []) {
          const body = blocks(item.content, "");
          out.push(`${indent}${i}. ` + body.join(`\n${indent}   `));
          i++;
        }
        break;
      }
      case "blockquote":
        out.push(
          blocks(node.content)
            .map((l) => indent + "> " + l)
            .join("\n")
        );
        break;
      case "codeBlock":
        out.push(indent + "```\n" + inline(node.content) + "\n```");
        break;
      case "horizontalRule":
        out.push(indent + "---");
        break;
      default:
        if (node.content) out.push(...blocks(node.content, indent));
    }
  }
  return out;
}

export function tiptapToMarkdown(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  return blocks((doc as TiptapNode).content).join("\n\n").trim();
}

export function tiptapToPlainText(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  const walk = (nodes: TiptapNode[] | undefined): string[] => {
    const out: string[] = [];
    for (const n of nodes ?? []) {
      if (n.type === "text") out.push(n.text ?? "");
      else if (n.type === "hardBreak") out.push("\n");
      else if (n.content) {
        out.push(...walk(n.content));
        if (["paragraph", "heading", "listItem", "codeBlock"].includes(n.type ?? "")) out.push("\n");
      }
    }
    return out;
  };
  return walk((doc as TiptapNode).content).join("").replace(/\n{2,}/g, "\n").trim();
}
