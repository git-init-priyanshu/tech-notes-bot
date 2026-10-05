# Chapters by topic

`/chapters` shows the current unfinished chapter, or the next catalog entry, for each topic.
The actual next title depends on your saved progress. This document describes the order and
proposed curricula; it does not claim to show the live database's current chapter.

| Topic | Current source selection | Start of a new pass |
| --- | --- | --- |
| JavaScript | Ordered javascript.info catalog | An Introduction to JavaScript |
| React | Ordered react.dev documentation index | Quick Start |
| AI | Feeds; proposed ordered curriculum below | Proposed: training versus inference |
| Backend | Feeds; proposed ordered curriculum below | Proposed: HTTP request lifecycle |
| System design | Feeds; proposed ordered curriculum below | Proposed: requirements and capacity estimates |
| Systems | Feeds, manual `/next systems` only | No fixed curriculum proposed |

## JavaScript: current catalog

The catalog follows individual lessons from the [javascript.info tutorial map](https://javascript.info/).
These are the broad areas in source order, not replacement chapter IDs. Use
`/chapters javascript [page]` for the actual lesson titles and completion state.

1. Getting started: language introduction, references, editor, and console.
2. Language fundamentals: syntax, variables, types, operators, branches, loops, and functions.
3. Code quality: debugging, readable code, testing, and compatibility.
4. Objects: references, memory, methods, construction, and conversion.
5. Built-in data types and collections: strings, arrays, maps, sets, dates, and JSON.
6. Function internals: recursion, scope, closures, scheduling, and binding.
7. Property descriptors and accessors.
8. Prototypes and inheritance.
9. Classes and extensions.
10. Error handling.
11. Promises, callbacks, and async execution.
12. Generators and asynchronous iteration.
13. Modules and dynamic loading.
14. Advanced language features.
15. Browser documents, events, forms, and loading.
16. Additional topics: windows, binary data, networking, storage, animation, web components,
    and regular expressions.

## React: current catalog

The catalog follows the [react.dev documentation index](https://react.dev/llms.txt), including
setup and reference pages. Unsuitable index or legacy pages may be skipped by the summarizer.
These areas summarize the source order. Use `/chapters react [page]` for exact lesson titles.

1. Getting started with components and a small interactive application.
2. Breaking a design into a component tree.
3. Installation and project creation.
4. Development setup, TypeScript, and debugging tools.
5. Compiler introduction and adoption.
6. Describing interfaces with JSX, props, conditional rendering, and lists.
7. Handling interaction: events, state, rendering, and updates.
8. Organizing state: shared state, reducers, and context.
9. Working with refs, effects, dependencies, and custom hooks.
10. React API reference: hooks, components, and other APIs.
11. Browser rendering, hydration, and server rendering APIs.
12. Compiler, development tools, and hooks lint reference.

## AI: proposed curriculum

The [YC job research and reading plan](ai-engineer-yc-jobs.md) maps these chapters to specific
blogs, courses, and documentation. These chapters are proposed; AI still selects feed articles.

1. Training versus inference.
2. Tokens and context windows.
3. Embeddings and vector representations.
4. Attention and transformers.
5. Generation, sampling, and unsupported answers.
6. First model call and expected outcomes.
7. Prompt construction and examples.
8. Structured outputs and validation.
9. Streaming and cancellation.
10. Timeouts, retries, and rate limits.
11. Evaluation sets and held-out cases.
12. Error analysis and failure categories.
13. Deterministic quality checks.
14. Human review and calibrated LLM judges.
15. Document ingestion and chunking.
16. Embedding retrieval and relevance.
17. Vector indexes, metadata, and authorization filters.
18. Hybrid lexical and semantic retrieval.
19. Reranking and its latency trade-offs.
20. RAG evaluation, citations, and unknown answers.
21. Tool calling and application execution.
22. Explicit workflows versus agent loops.
23. Tool contracts and failures.
24. Context management and durable state.
25. Agent evaluation and human handoffs.
26. Tracing, version tracking, and sensitive data.
27. Prompt injection and least-privilege tools.
28. Model selection, routing, caching, and cost.
29. Latency, concurrency, and fallbacks.
30. Deployment, monitoring, and rollback.

Optional advanced branches: fine-tuning and dataset curation; LoRA; reward-based adaptation;
real-time voice; and open-model GPU serving. Select a branch after completing the core path.

## Backend: proposed curriculum

Suggested order informed by the [backend roadmap](https://roadmap.sh/backend). These chapters
are a proposal, not the roadmap's exact chapter titles. Backend still selects feed articles.

1. HTTP request lifecycle, methods, headers, and status codes.
2. API resources and request/response contracts.
3. Input validation and consistent error responses.
4. Relational data modeling and constraints.
5. SQL joins, indexes, and query plans.
6. Transactions, isolation, and concurrent updates.
7. Authentication, sessions, and authorization.
8. Pagination, filtering, and API versioning.
9. Idempotency and safe retries.
10. Caching, invalidation, and freshness.
11. Queues, background jobs, and delivery guarantees.
12. Rate limits, timeouts, and backpressure.
13. Service observability and failure diagnosis.
14. Integration tests, deployments, migrations, and rollback.
15. API security and multi-tenant data boundaries.
16. Scaling services and choosing service boundaries.

## System design: proposed curriculum

Suggested order informed by the [System Design Primer](https://github.com/donnemartin/system-design-primer).
These chapters are a proposal rather than its exact section order. System design still selects
feed articles.

1. Functional requirements, constraints, and capacity estimates.
2. Latency, throughput, availability, and bottlenecks.
3. Network paths: DNS, proxies, and load balancing.
4. Stateless services and horizontal scaling.
5. Database choice and data access patterns.
6. Indexing and storage trade-offs.
7. Caching and invalidation.
8. Replication and consistency.
9. Partitioning and sharding.
10. Queues, asynchronous work, and backpressure.
11. Distributed failures, retries, and idempotency.
12. Coordination, leader election, and consensus concepts.
13. Rate limiting and overload protection.
14. Observability, disaster recovery, and reliability targets.
15. Case study: URL shortener.
16. Case study: messaging or notification service.
17. Case study: news feed or search service.
18. Revisit designs under changing scale and consistency constraints.
