export type TopicSlug = "javascript" | "react" | "backend" | "systemdesign" | "ai" | "systems";

export interface RssSource {
  kind: "rss";
  name: string;
  url: string;
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
  backend: [],
  systemdesign: [],
  ai: [],
  systems: [
    { kind: "rss", name: "Julia Evans", url: "https://jvns.ca/atom.xml" },
    { kind: "rss", name: "Rust Blog", url: "https://blog.rust-lang.org/feed.xml" },
    { kind: "rss", name: "Dan Luu", url: "https://danluu.com/atom.xml" },
    { kind: "rss", name: "LWN", url: "https://lwn.net/headlines/newrss" },
    { kind: "rss", name: "Brendan Gregg", url: "https://www.brendangregg.com/blog/rss.xml" },
  ],
};
