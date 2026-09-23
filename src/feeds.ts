export type TopicSlug = "frontend" | "backend" | "ai" | "systems" | "systemdesign";

export interface Feed {
  source: string;
  url: string;
  minLevel?: number;
}

export const FEEDS: Record<TopicSlug, Feed[]> = {
  frontend: [
    { source: "MDN Blog", url: "https://developer.mozilla.org/en-US/blog/rss.xml" },
    { source: "React Blog", url: "https://react.dev/rss.xml" },
    { source: "web.dev", url: "https://web.dev/static/blog/feed.xml" },
    { source: "Chrome for Developers", url: "https://developer.chrome.com/static/blog/feed.xml" },
    { source: "Next.js", url: "https://nextjs.org/feed.xml" },
    { source: "TypeScript Blog", url: "https://devblogs.microsoft.com/typescript/feed/" },
    { source: "CSS-Tricks", url: "https://css-tricks.com/feed/" },
    { source: "Josh Comeau", url: "https://www.joshwcomeau.com/rss.xml", minLevel: 3 },
    { source: "TkDodo", url: "https://tkdodo.eu/blog/rss.xml", minLevel: 3 },
  ],
  backend: [
    { source: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss/" },
    { source: "Netflix Tech Blog", url: "https://netflixtechblog.com/feed", minLevel: 3 },
    { source: "GitHub Engineering", url: "https://github.blog/engineering/feed/" },
    { source: "All Things Distributed", url: "https://www.allthingsdistributed.com/index.xml", minLevel: 3 },
    { source: "Stripe Blog", url: "https://stripe.com/blog/feed.rss" },
    { source: "PostgreSQL News", url: "https://www.postgresql.org/news.rss" },
    { source: "Go Blog", url: "https://go.dev/blog/feed.atom" },
    { source: "Meta Engineering", url: "https://engineering.fb.com/feed/", minLevel: 3 },
  ],
  ai: [
    { source: "Sebastian Raschka", url: "https://magazine.sebastianraschka.com/feed", minLevel: 3 },
    { source: "Lilian Weng", url: "https://lilianweng.github.io/index.xml", minLevel: 4 },
    { source: "Interconnects", url: "https://www.interconnects.ai/feed", minLevel: 3 },
    { source: "OpenAI News", url: "https://openai.com/news/rss.xml" },
    { source: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml" },
    { source: "Simon Willison", url: "https://simonwillison.net/atom/everything/" },
    { source: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml" },
    { source: "Latent Space", url: "https://www.latent.space/feed", minLevel: 3 },
    { source: "Import AI", url: "https://jack-clark.net/feed/", minLevel: 3 },
  ],
  systems: [
    { source: "LWN", url: "https://lwn.net/headlines/newrss", minLevel: 3 },
    { source: "Brendan Gregg", url: "https://www.brendangregg.com/blog/rss.xml", minLevel: 4 },
    { source: "Dan Luu", url: "https://danluu.com/atom.xml", minLevel: 3 },
    { source: "Marc Brooker", url: "https://brooker.co.za/blog/rss.xml", minLevel: 4 },
    { source: "Rust Blog", url: "https://blog.rust-lang.org/feed.xml" },
    { source: "Julia Evans", url: "https://jvns.ca/atom.xml" },
  ],
  systemdesign: [
    { source: "ByteByteGo", url: "https://blog.bytebytego.com/feed" },
    { source: "High Scalability", url: "https://highscalability.com/rss/", minLevel: 3 },
    { source: "InfoQ Architecture", url: "https://feed.infoq.com/architecture-design/" },
    { source: "AWS Architecture", url: "https://aws.amazon.com/blogs/architecture/feed/", minLevel: 3 },
    { source: "Martin Fowler", url: "https://martinfowler.com/feed.atom", minLevel: 3 },
  ],
};
