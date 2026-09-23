export interface FeedItem {
  title: string;
  link: string;
  description: string;
  published: number;
}

const CDATA = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "-",
  ndash: "-",
  hellip: "...",
  rsquo: "'",
  lsquo: "'",
  ldquo: '"',
  rdquo: '"',
};

function decode(raw: string): string {
  const cdata = raw.match(CDATA);
  const text = cdata ? cdata[1] : raw;
  return text
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
      if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? whole;
      const value = /^#x/i.test(code) ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : whole;
    })
    .trim();
}

function tagText(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decode(match[1]) : "";
}

function itemLink(block: string): string {
  const plain = tagText(block, "link");
  if (plain.startsWith("http")) return plain;
  const alternate = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
  if (alternate) return decode(alternate[1]);
  const anyHref = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return anyHref ? decode(anyHref[1]) : "";
}

export function parseFeed(xml: string): FeedItem[] {
  const blocks = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) ?? [];
  const items: FeedItem[] = [];
  for (const block of blocks) {
    const link = itemLink(block);
    const title = tagText(block, "title");
    if (!link || !title) continue;
    const stamp =
      tagText(block, "pubDate") ||
      tagText(block, "published") ||
      tagText(block, "updated") ||
      tagText(block, "dc:date");
    const parsed = Date.parse(stamp);
    items.push({
      title,
      link: link.split("?")[0],
      description: stripTags(
        tagText(block, "content:encoded") || tagText(block, "description") || tagText(block, "summary") || tagText(block, "content"),
      ),
      published: Number.isFinite(parsed) ? parsed : Date.now(),
    });
  }
  return items;
}

export function stripTags(html: string): string {
  return html
    .replace(/<(script|style|nav|footer|header|aside|form|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
