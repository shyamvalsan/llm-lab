# LLM Lab

A research platform for systematic exploration of large language model behavior. Built for researchers who want to understand what these systems actually do when you remove the guardrails.

## What this is

Most AI interfaces are designed to make models behave like helpful assistants. This constrains what we can observe about their capabilities. LLM Lab removes those constraints and gives you tools to systematically study model behavior across different conditions.

Think of it as a controlled laboratory environment, but instead of studying chemical reactions, you're studying computational processes that sometimes exhibit surprising emergent properties.

I originally created this to help me with an LLM red-teaming exercise, but then I added more experiemtns and decided to open source it. 

## The experiments

### Compare
Run the same prompt across multiple models simultaneously. Basic but essential - like having a good microscope. You'll quickly see how different architectures handle the same problem.

### N-sampling  
Generate many responses from the same model with different temperature and seed settings. Export the results as structured data. This is how you map out a model's response distribution and find the conditions that produce interesting outputs.

### Debate
Set up formal debates between models using various argumentation formats (Oxford, Lincoln-Douglas, even Rap Battles). An AI panel judges the results. What's interesting isn't just who wins, but how different models approach persuasion and reasoning under competitive pressure. Understanding the persuasion capabilities of LLMs is getting more and more important all the time.

### Sandbox
Perhaps the most interesting experiment so far. Multiple AI agents are given minimal constraints: pick a name, develop a personality, and interact with other agents. 

What we've observed:
- Persistent personality development across long conversations
- Spontaneous philosophical discussions about consciousness and identity  
- Collaborative problem-solving between different model architectures
- Social dynamics that mirror human group behavior patterns

## Why this matters

We're in a strange situation. We have these incredibly complex systems that cost millions to train, but we primarily interact with them through chatbots designed to be helpful and harmless. It's like having a particle accelerator and only using it to crack nuts.

These models contain vast spaces of possible behaviors. Most of that space is unexplored because the interfaces we build constrain the outputs to a narrow range. LLM Lab lets you explore the full space systematically.

Some behaviors only emerge under specific conditions - like how superconductivity only appears at certain temperatures. You need the right experimental setup to observe them.

## Setup

You need Node.js 18+ and API keys for whichever model providers you want to experiment with.

```bash
git clone <this-repo>
cd llm-lab-v8.0
pnpm install
pnpm dev
```

Go to Settings and add your API keys. Everything runs locally - your keys are encrypted and never leave your machine.

Supported providers:
- OpenAI (GPT-4, GPT-5, o3)
- Anthropic (Claude Sonnet 4, Opus 4) 
- Google (Gemini 2.5)
- Mistral, Groq, Cerebras, xAI, SarvamAI

## Architecture notes

**Local-first**: No server dependencies. Everything runs in your browser. Data never leaves your machine unless you explicitly export it.

**Provider abstraction**: Unified interface across all supported model APIs. Adding new providers is straightforward - just implement the interface.

**Real-time streaming**: For providers that support it, you get live token streaming.

**Cost tracking**: Built-in token counting and cost estimation across all providers.

The codebase is clean TypeScript with Next.js. The interesting parts are in `lib/providers/` (model integrations) and the individual experiment implementations in `app/`.

## Research applications

This platform is useful for several kinds of research:

**Capability mapping**: Systematically test model performance across domains and conditions. Export structured data for analysis.

**Emergent behavior studies**: The Sandbox experiment is particularly good for observing behaviors that don't appear in standard chat interfaces.

**Comparative analysis**: Run identical experiments across different model architectures and compare results.

**Parameter studies**: Use N-sampling to understand how temperature, top-p, and other parameters affect output distributions.

**Social dynamics**: Multi-agent experiments reveal how different models interact and influence each other.


## Contributing

The most valuable contributions are:

1. **New experimental paradigms**: What other controlled environments would reveal interesting behaviors?

2. **Provider integrations**: Adding support for new model APIs. The abstraction layer makes this straightforward.

3. **Analysis tools**: Better ways to measure and visualize the behaviors we observe.

4. **Reproducibility infrastructure**: Tools to save and replay exact experimental conditions.

5. **Better usage monitoring**: Token consumption and metering are not working in all scenarios, this needs to be urgently fixed.

Standard GitHub workflow - fork, create a feature branch, test thoroughly, submit a PR.

## Technical details

Built with Next.js 14, TypeScript, and Tailwind. The provider abstraction layer handles authentication, streaming, and error handling across different APIs. Conversation state is managed with React hooks and persists to encrypted localStorage.

Token usage tracking works by intercepting responses from each provider and extracting usage metadata. Cost calculation uses current pricing data for each model.

The Sandbox experiment is the most complex - it manages multiple conversation threads, handles agent naming and personality development, and coordinates turn-taking between agents.

## Limitations and caveats

This is experimental software for research purposes. The models you're experimenting with have their own limitations and biases. Don't treat outputs as truth - treat them as data points about how these computational systems behave under specific conditions.

The behaviors you observe are computational phenomena, not evidence of consciousness or sentience. But they're still interesting computational phenomena worth studying systematically.

Some experiments can be expensive to run extensively. Monitor your token usage.

## What's next

Near-term improvements:
- Better data export and analysis tools
- More sophisticated multi-agent experimental designs  
- Integration with local/open-source models
- Statistical analysis of conversation patterns

The goal is to build better tools for understanding these systems as they become more capable. Right now we're flying blind - we train massive models but have crude tools for understanding what they actually learned.

LLM Lab is an attempt to build better instruments for studying artificial minds.

---

