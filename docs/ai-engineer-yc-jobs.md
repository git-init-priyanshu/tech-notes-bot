# AI engineer skills in YC job listings

Checked: 2026-10-05.

Seven publicly accessible YC listings across six companies form a small qualitative sample. They were selected for applied AI engineering work, including product, agent runtime, and infrastructure specializations. This is not a representative hiring survey. Accessible pages and application links do not confirm that employers are still hiring. Posting dates were not established.

## Roles and expectations

| Role | Stated requirements or candidate expectations | Explicit preferences or bonuses | Specialization |
| --- | --- | --- | --- |
| [Coast: AI Engineer](https://www.ycombinator.com/companies/coast/jobs/R9FnGRK-ai-engineer) | Header: 3+ years. Candidate-fit examples include production LLM use, prompt workflows, developer copilots, design tooling, ASTs, and context-aware outputs. These are presented as possible fit signals, not a strict required checklist. | Semantic embeddings, prompt testing and LLM evaluation tools, product and UI judgment. | UI generation and code copilots; RAG over documentation and component libraries; speed and output consistency. |
| [Peppr AI: AI Developer / AI Engineer](https://www.ycombinator.com/companies/peppr-ai/jobs/ZJhISZP-ai-developer-ai-engineer) | Body explicitly requires 3+ years, deployed LLM systems, Python, Transformers/LangChain familiarity, vector databases, real-time audio, Docker/Kubernetes, CI/CD, monitoring, and secure APIs. Header says new grads accepted, contradicting the body. | Agent orchestration, caching/quantization, conversational UX, security knowledge, product ownership. | Voice agents and enterprise context pipelines, including STT/VAD/TTS, streaming, RAG, and FastAPI. |
| [Sphere: AI Engineer](https://www.ycombinator.com/companies/sphere/jobs/5CBpoL3-ai-engineer) | Header: 6+ years. AI product and RAG experience, base-model fine-tuning, understanding LLM/reasoning behavior, and willingness to learn tax reasoning. RFT is an ideal fine-tuning approach rather than the only acceptable one. | Legal-domain LLM experience; retrieval data pipelines and data curation. | Domain reasoning accuracy, evaluation ownership, and model adaptation using proprietary data. |
| [Fieldguide: Senior AI Engineer](https://www.ycombinator.com/companies/fieldguide/jobs/b9iFMXp-senior-ai-engineer) | Candidate profile describes production software, TypeScript/Python/Postgres, shipped LLM features, retrieval and agent orchestration, evaluations, vector databases, embeddings, and LLM APIs. Years are explicitly flexible: most strong candidates have 3-6+ years. | No separate bonus checklist. Human review, explainability, and domain judgment are highlighted interests. | Audit workflow agents with measurable quality, observability, reliability, and customer value. |
| [Feather: Backend + AI Engineer](https://www.ycombinator.com/companies/feather-2/jobs/OGlm8aX-backend-ai-engineer) | 3-7 years in scalable backend/distributed systems, Python or TypeScript, async/event-driven design, APIs, production LLM integration, agent/tool familiarity, debugging, and performance work. | Agent tooling, workflow engines, real-time communication, RAG, evaluations, business automation experience. | Long-lived agent execution, queues/DAGs, voice and messaging, retries, fallbacks, and human handoffs. |
| [Eloquent AI: AI Engineer, Agent](https://www.ycombinator.com/companies/eloquent-ai/jobs/2xwyYHg-ai-engineer-agent) | 3+ years in production software/AI/NLP, Python, frameworks such as PyTorch/TensorFlow, LLM fine-tuning/inference optimization, APIs, cloud, enterprise integration, and customer iteration. | Prompt engineering, PEFT, RAG, RL, frontend/backend skills, retrieval, research publications, and open-source NLP. | Enterprise agents; model adaptation and integration; performance measured through simulations and evaluations. |
| [Eloquent AI: AI Engineer, AIOps & Infrastructure](https://www.ycombinator.com/companies/eloquent-ai/jobs/aCloWFq-ai-engineer-aiops-infrastructure) | Body requires 5+ years although header says 6+. Kubernetes, cloud/distributed computing, Python services, model deployment/serving, inference optimization, and monitoring. RAG appears in requirements but is explicitly described as a plus. | LLMOps/fine-tuning, GPU optimization, model parallelism/distributed training, AI application infrastructure, open-source contributions. | Model serving infrastructure, GPU/cloud efficiency, observability, high availability, and on-call operations. |

## Curriculum implications

These are inferences from this sample, not universal hiring requirements:

- Start with software engineering foundations. Python, APIs, databases, async execution, deployment, and debugging recur in [Peppr](https://www.ycombinator.com/companies/peppr-ai/jobs/ZJhISZP-ai-developer-ai-engineer), [Fieldguide](https://www.ycombinator.com/companies/fieldguide/jobs/b9iFMXp-senior-ai-engineer), and [Feather](https://www.ycombinator.com/companies/feather-2/jobs/OGlm8aX-backend-ai-engineer). TypeScript remains useful, especially for product and backend integration.
- Teach LLM behavior, prompting, context, structured outputs, and tool use before introducing elaborate frameworks. [Coast](https://www.ycombinator.com/companies/coast/jobs/R9FnGRK-ai-engineer) and [Feather](https://www.ycombinator.com/companies/feather-2/jobs/OGlm8aX-backend-ai-engineer) emphasize useful workflows and dependable execution.
- Make ingestion, chunking, embeddings, retrieval, data quality, and RAG a core sequence. They appear in [Peppr](https://www.ycombinator.com/companies/peppr-ai/jobs/ZJhISZP-ai-developer-ai-engineer), [Sphere](https://www.ycombinator.com/companies/sphere/jobs/5CBpoL3-ai-engineer), and [Fieldguide](https://www.ycombinator.com/companies/fieldguide/jobs/b9iFMXp-senior-ai-engineer).
- Introduce evaluation early and revisit it throughout projects. [Fieldguide](https://www.ycombinator.com/companies/fieldguide/jobs/b9iFMXp-senior-ai-engineer) expects evaluations of model and agent behavior; [Sphere](https://www.ycombinator.com/companies/sphere/jobs/5CBpoL3-ai-engineer) assigns evaluation ownership; [Eloquent Agent](https://www.ycombinator.com/companies/eloquent-ai/jobs/2xwyYHg-ai-engineer-agent) uses simulations and evaluations.
- Follow with production reliability: tracing, monitoring, latency/cost measurement, retries, queues, security, and human review. [Feather](https://www.ycombinator.com/companies/feather-2/jobs/OGlm8aX-backend-ai-engineer), [Fieldguide](https://www.ycombinator.com/companies/fieldguide/jobs/b9iFMXp-senior-ai-engineer), and [Eloquent Infrastructure](https://www.ycombinator.com/companies/eloquent-ai/jobs/aCloWFq-ai-engineer-aiops-infrastructure) show why a working prototype is insufficient.
- Put fine-tuning, PEFT/RFT, voice, and GPU serving in advanced branches. [Sphere](https://www.ycombinator.com/companies/sphere/jobs/5CBpoL3-ai-engineer) requires model adaptation; [Peppr](https://www.ycombinator.com/companies/peppr-ai/jobs/ZJhISZP-ai-developer-ai-engineer) requires voice; [Eloquent Infrastructure](https://www.ycombinator.com/companies/eloquent-ai/jobs/aCloWFq-ai-engineer-aiops-infrastructure) focuses on serving infrastructure. These needs vary by specialization.
- Prefer a small number of deployed projects with evaluation sets and documented quality/cost/latency tradeoffs. Production delivery and customer outcomes recur across the listings. This portfolio suggestion is an educational inference; the listings do not prescribe a specific portfolio format.

## Suggested reading path: 30 core chapters, then specializations

This order is an educational recommendation based on the sampled roles. It assumes you already build software. Review Python, HTTP, SQL, async programming, and basic deployment alongside the AI lessons where needed. Each chapter should teach one concept with a worked example. A chapter is a small lesson, not an entire course or long article.

Use the Full Stack LLM Bootcamp as an application-oriented starting point. Its recordings are from 2023, so use current provider documentation for API details. The Hugging Face LLM course is a deeper supplement: it expects Python and recommends prior introductory deep learning. Select its foundations first rather than making the entire course a prerequisite. [Full Stack Bootcamp](https://fullstackdeeplearning.com/llm-bootcamp/), [Hugging Face introduction](https://huggingface.co/learn/llm-course/chapter1/1).

### 1. Understand the model: chapters 1-5

Read [Full Stack: LLM Foundations](https://fullstackdeeplearning.com/llm-bootcamp/spring-2023/), the introductory sections of the [Hugging Face LLM course](https://huggingface.co/learn/llm-course/chapter1/1), and Jay Alammar's [Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/). The illustrated article explains the original encoder-decoder architecture; use the course to distinguish modern decoder-only LLMs.

1. Training versus inference: what the model learns and what an API call actually does.
2. Tokens and context windows: why character count is not token count, and what gets truncated.
3. Embeddings: representing meaning as vectors; token embeddings versus document retrieval embeddings.
4. Attention and transformers: how a model uses surrounding text, explained visually before equations.
5. Generation and failure: sampling, unsupported answers, and why fluent text does not establish correctness.

Suggested exercise: compare responses to the same question with and without an explicit source paragraph.

### 2. Build a small LLM feature: chapters 6-10

Use Anthropic's [prompting overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview), [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), and [latency guidance](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency). These are implementation references for one provider, not a requirement to use that provider.

6. First model call: inputs, outputs, token usage, and five example cases with expected behavior.
7. Prompt construction: clear tasks, examples, source delimiters, and explicit success criteria.
8. Structured outputs: JSON Schema, validation, and the distinction between valid structure and correct content.
9. Streaming: partial responses, cancellation, and time to first token versus total completion time.
10. Failure handling: timeouts, bounded retries, rate limits, and showing useful errors to users.

Suggested exercise: build a support-ticket classifier that returns validated JSON and records failures.

### 3. Measure quality: chapters 11-14

Read Hamel Husain's [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/). It covers task-specific assertions, inspecting traces, human review, model-based evaluation, and production experiments.

11. Evaluation sets: representative tasks, expected outcomes, and a held-out set for honest comparisons.
12. Error analysis: inspect failures, group recurring causes, and prioritize the problems users actually encounter.
13. Deterministic checks: required fields, allowed actions, citation presence, and feature-specific assertions.
14. Human review and LLM judges: write a rubric and check whether automated judgments agree with human labels.

Suggested exercise: extend the classifier to 30-50 varied cases. This is a suggested practice size, not a statistical guarantee. Compare two prompts on the same cases before choosing one.

### 4. Retrieve useful knowledge: chapters 15-20

Read Pinecone's [RAG overview](https://www.pinecone.io/learn/retrieval-augmented-generation/) and [Rerankers and Two-Stage Retrieval](https://www.pinecone.io/learn/series/rag/rerankers/), then use the [pgvector documentation](https://github.com/pgvector/pgvector) for a Postgres implementation. Pinecone's examples use its product; the retrieval concepts can be practiced with another database.

15. Ingestion and chunking: extract usable text and preserve document identity and provenance.
16. Embedding retrieval: encode queries and chunks, choose a distance measure, and inspect relevance failures.
17. Vector indexes and filters: exact versus approximate search, metadata, and authorization boundaries.
18. Hybrid retrieval: combine lexical and semantic search when identifiers or exact terms matter.
19. Reranking: reorder retrieved candidates and measure the quality versus latency trade-off.
20. RAG evaluation: distinguish retrieval failure from generation failure; verify citations and unsupported-answer behavior.

Suggested exercise: answer questions over a small documentation set with citations and an explicit unknown response. Compare retrieval variants against the same labeled questions.

### 5. Make agents dependable: chapters 21-25

Read Anthropic's [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), [Tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), [Writing effective tools](https://www.anthropic.com/engineering/writing-tools-for-agents), [Context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), and [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

21. Tool calling: the model proposes an action; application code validates and executes it.
22. Workflows versus agent loops: choose explicit steps or model-directed execution; bound the number of steps.
23. Tool contracts: clear descriptions, useful results, validation, and actionable failures.
24. Context management: choose relevant information, summarize long sessions, and separate durable state from conversation history.
25. Agent evaluation: inspect trajectories, verify final state, test tool failures, and exercise human handoffs.

Suggested exercise: let the documentation assistant retrieve a record and draft a proposed update. Require human approval before any write. Measure task completion and unintended actions.

### 6. Operate the product: chapters 26-30

Read Chip Huyen's [Building A Generative AI Platform](https://huyenchip.com/2024/07/25/genai-platform.html), Anthropic's [latency guidance](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency) and [prompt injection guidance](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks), and Full Stack's [LLMOps lecture](https://fullstackdeeplearning.com/llm-bootcamp/spring-2023/llmops/). Use the older lecture for deployment and iteration concepts, alongside current documentation for specific tools.

26. Observability: traces, prompt/model versions, failure categories, and sensitive-data handling.
27. Security: untrusted retrieved text, prompt injection, least-privilege tools, and human review for consequential actions.
28. Cost control: model selection, routing, caching, and measuring cost per successful task.
29. Latency and reliability: measure slow stages, use bounded concurrency, and test timeouts and fallback behavior.
30. Deployment and iteration: version prompts and datasets, evaluate changes, monitor real traffic, and plan rollback.

Suggested exercise: deploy the assistant and report quality, cost per task, and p50/p95 latency. Document one change that improved a measured result.

### Advanced branches: select by target role

These follow the core path rather than forming mandatory chapters for every AI engineer.

| Chapter | Specialization | Recommended resource | Practice outcome |
| --- | --- | --- | --- |
| 31 | Decide when to fine-tune; curate examples and separate training from evaluation | [Hugging Face LLM course](https://huggingface.co/learn/llm-course/chapter1/1), especially its fine-tuning and dataset chapters | Compare a prompt/RAG baseline with a small adapted model on held-out cases. |
| 32 | Parameter-efficient fine-tuning with LoRA | [Hugging Face PEFT: LoRA](https://huggingface.co/docs/peft/main/en/conceptual_guides/lora) | Explain the memory and adaptation trade-offs; try a small experiment if hardware permits. |
| 33 | Reward-based model adaptation | [Hugging Face TRL: GRPO](https://huggingface.co/docs/trl/grpo_trainer) | Understand reward functions and test for reward exploitation. GRPO is one method, not synonymous with all RFT. |
| 34 | Real-time voice: speech recognition, synthesis, interruptions, and streaming | [Pipecat progressive examples](https://github.com/pipecat-ai/pipecat/blob/main/examples/README.md) | Build a small voice agent and measure interruption behavior and response delay. |
| 35 | Open-model serving: batching, KV cache, quantization, and throughput | [vLLM documentation](https://docs.vllm.ai/en/stable/) | Compare serving configurations under a fixed workload when GPU access is available. |

Sphere motivates chapters 31-33; Peppr motivates chapter 34; Eloquent's infrastructure role motivates chapter 35. They are role-specific extensions of the shared application engineering foundation.

## Suggested bot curriculum

Replace the AI feed with an explicit ordered list of the 30 core chapters. Each entry should have a stable chapter ID, a title, a narrow learning objective, a source URL, and the relevant section of that source. Several chapters can use different sections of the same article. Completion must therefore track chapter IDs rather than only source URLs, or finishing one section would incorrectly finish every chapter sharing that article.

Send one chapter at the AI slot. Done completes that chapter; Explain more adds examples from the same chapter. At the end of the core sequence, choose an advanced branch. This is a curriculum proposal; the bot's AI source selection has not been changed by this research.
