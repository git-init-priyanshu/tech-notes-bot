export type TopicSlug = "javascript" | "react" | "backend" | "systemdesign" | "ai" | "systems";

export interface RssSource {
  kind: "rss";
  name: string;
  url: string;
  minLevel?: number;
}

export interface CatalogSource {
  kind: "catalog";
  name: string;
  discover: "react-llms" | "javascript-info";
}

export type Source = RssSource | CatalogSource;

export const SOURCES: Record<TopicSlug, Source[]> = {
  javascript: [{ kind: "catalog", name: "javascript.info", discover: "javascript-info" }],
  react: [{ kind: "catalog", name: "react.dev", discover: "react-llms" }],
  backend: [
    { kind: "rss", name: "Brandur", url: "https://brandur.org/articles.atom" },
    { kind: "rss", name: "Nordic APIs", url: "https://nordicapis.com/feed/" },
    { kind: "rss", name: "Stripe Blog", url: "https://stripe.com/blog/feed.rss" },
    { kind: "rss", name: "Martin Fowler", url: "https://martinfowler.com/feed.atom" },
    { kind: "rss", name: "GitHub Engineering", url: "https://github.blog/engineering/feed/" },
    { kind: "rss", name: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss/" },
    { kind: "rss", name: "Netflix Tech Blog", url: "https://netflixtechblog.com/feed", minLevel: 3 },
    { kind: "rss", name: "All Things Distributed", url: "https://www.allthingsdistributed.com/index.xml", minLevel: 3 },
    { kind: "rss", name: "Meta Engineering", url: "https://engineering.fb.com/feed/", minLevel: 3 },
  ],
  systemdesign: [
    { kind: "rss", name: "ByteByteGo", url: "https://blog.bytebytego.com/feed" },
    { kind: "rss", name: "System Design Newsletter", url: "https://newsletter.systemdesign.one/feed" },
    { kind: "rss", name: "Martin Fowler", url: "https://martinfowler.com/feed.atom" },
    { kind: "rss", name: "High Scalability", url: "https://highscalability.com/rss/", minLevel: 3 },
    { kind: "rss", name: "AWS Architecture", url: "https://aws.amazon.com/blogs/architecture/feed/", minLevel: 3 },
    { kind: "rss", name: "All Things Distributed", url: "https://www.allthingsdistributed.com/index.xml", minLevel: 3 },
    { kind: "rss", name: "Netflix Tech Blog", url: "https://netflixtechblog.com/feed", minLevel: 3 },
    { kind: "rss", name: "Marc Brooker", url: "https://brooker.co.za/blog/rss.xml", minLevel: 4 },
  ],
  ai: [
    { kind: "rss", name: "Eugene Yan", url: "https://eugeneyan.com/rss/" },
    { kind: "rss", name: "Chip Huyen", url: "https://huyenchip.com/feed.xml" },
    { kind: "rss", name: "Hamel Husain", url: "https://hamel.dev/index.xml" },
    { kind: "rss", name: "Simon Willison", url: "https://simonwillison.net/atom/everything/" },
    { kind: "rss", name: "Phil Schmid", url: "https://www.philschmid.de/rss" },
    { kind: "rss", name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml" },
    { kind: "rss", name: "Vicki Boykis", url: "https://vickiboykis.com/index.xml", minLevel: 3 },
    { kind: "rss", name: "Sebastian Raschka", url: "https://magazine.sebastianraschka.com/feed", minLevel: 3 },
  ],
  systems: [
    { kind: "rss", name: "Julia Evans", url: "https://jvns.ca/atom.xml" },
    { kind: "rss", name: "Rust Blog", url: "https://blog.rust-lang.org/feed.xml" },
    { kind: "rss", name: "Dan Luu", url: "https://danluu.com/atom.xml", minLevel: 3 },
    { kind: "rss", name: "LWN", url: "https://lwn.net/headlines/newrss", minLevel: 3 },
    { kind: "rss", name: "Brendan Gregg", url: "https://www.brendangregg.com/blog/rss.xml", minLevel: 4 },
  ],
};
