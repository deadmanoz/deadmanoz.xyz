---
title: 'Closing the observability loop: Bitcoin P2P case study'
excerpt: "Exploring how far a general-purpose agent can get investigating Bitcoin's P2P network with existing telemetry, analytical tools and source code"
coverImage: '/assets/blog/2026/closing-observability-loop/closing-observability-loop-cover.png'
date: '2026-08-31T00:00:00.000Z'
tags:
  - observability
  - ai
  - bitcoin
  - p2p
author:
  name: deadmanoz
ogImage:
  url: '/assets/blog/2026/closing-observability-loop/closing-observability-loop-cover.png'
status: published
---

## Introduction

Most observability systems are built as pipelines. Engineers decide what to instrument, collect a predetermined set of telemetry, and feed it through dashboards, alerts and detectors. Machine intelligence has been used within these pipelines, but typically in a narrow role. The pipeline may flag a problem, but a human still has to work out why, decide what to measure next and, when the existing telemetry is not enough, change the instrumentation and continue the investigation.

Over [[the last few years||"Five years is an eternity in AI" - Andrew Ng, [The Batch](https://charonhub.deeplearning.ai/issue-23/)]], however, longer context windows, more reliable tool use, stronger coding models and better agent harnesses have made it plausible for an LLM-based agent using a general-purpose model to direct more of an investigation, rather than assist with isolated parts of it. With access to the same telemetry, analytical tools and source code as a human investigator, it could test explanations and recognise when the available evidence is not enough. If it could also change the instrumentation on a system under its control, it could add the measurement it needs and continue the investigation.

I plan to explore this through Bitcoin P2P network monitoring, beginning with problem detection and investigation using existing telemetry. If those capabilities prove useful, agent-directed instrumentation and "closing the loop" will follow.

## Not a better anomaly detector

I do not think the answer is to replace existing anomaly-detection techniques with an LLM or point one directly at raw telemetry. Indeed, recent benchmarks caution against this.

[mTSBench](https://arxiv.org/abs/2506.21550), published in TMLR in February 2026, evaluated 24 multivariate time-series anomaly detectors, including [["the only two publicly
available large language model-based methods for multivariate time series"||[ALLM4TS](https://arxiv.org/abs/2402.04852) (Bian et al., 2024) and [OFA](https://arxiv.org/abs/2310.06625) (Zhou et al., 2023): pretrained language-model-based time-series foundation models for multivariate anomaly detection, not general-purpose chat LLMs applied to raw telemetry.]], across 344 time series from 19 datasets. No detector performed consistently well across datasets, perhaps unsurprisingly. More notable was that existing methods for selecting which detector to use also remained substantially below an [[optimal selector||mTSBench's Oracle baseline: with labels, always pick the best of the 24 detectors for that series. The published selectors (MetaOD, FMMS, Orthus) stayed about 15–30% below even the second-best choice.]], leading the authors to call for "more adaptive selection strategies".

A [January 2026 benchmark of LLMs applied directly to aerospace telemetry](https://arxiv.org/abs/2601.12448) provides more direct evidence against using LLMs as multivariate anomaly detectors. ATSADBench evaluated [[two open-source LLMs||DeepSeek-V3-0324 and Qwen3-235B-A22B. Commercial and closed-source models were excluded because the aerospace setting required local inference.]] across univariate and multivariate anomaly-detection tasks. While the models performed well on univariate tasks, they struggled with multivariate telemetry, where alarm accuracy approached random guessing and alarms were scattered rather than contiguous.

Anomaly detection still has a role, but I think the stronger case for agents using general-purpose models sits further up the analytical stack. Statistical methods and anomaly detectors become components in a broader toolkit. The agent can choose among them and interpret their results alongside other evidence. This does not require an LLM to process every packet, log line or time-series sample; model inference remains too slow and expensive for the raw data stream.

A [June 2026 *Nature Medicine* study](https://www.nature.com/articles/s41591-026-04431-5) offers indirect support for putting a general-purpose model at the coordinating layer: [[generally available frontier models||Of the time: GPT-5.2, Claude Opus 4.6 & Gemini 3.1 Pro]] outperformed specialised clinical AI systems across medical knowledge, clinician alignment and real clinical queries. Although the study says nothing about observability, it suggests that the system directing the overall task need not itself be specialised. That is, generality rather than speciality may be more useful when the work involves crossing boundaries between specialised components and evaluating different kinds of evidence.

## Fixed-telemetry investigation

[ORCA-bench](https://arxiv.org/abs/2607.28545), published in July 2026, evaluates general-purpose coding agents performing root-cause analysis (RCA) in a live, OpenTelemetry-instrumented microservice environment. Rather than presenting a model with a neatly packaged time series, agents investigate incidents using six days of metrics, logs, and traces exposed through [[real observability infrastructure||Prometheus, Jaeger, and OpenSearch via Grafana]], with the success criterion being a "defensible diagnosis". In the main benchmark configuration, the agents also have access to the system's source code. Starting with an incident report, the agent must decide how to move between those sources of evidence until it can diagnose the cause.

The results reveal that the agent's capabilities are still some way from being "production-ready". Across 1,079 RCA tasks, the best-performing [[frontier agent||The main evaluation included Claude Opus 4.7, Claude Sonnet 4.6, GPT-5.5, GLM-5 and DeepSeek-V4-Pro. Claude Fable 5 was evaluated separately on the smaller ORCA-bench Verified subset, where it achieved 40.6 ± 8.8% RCA accuracy across (only) 32 tasks.]] achieved only 25.3% accuracy on the benchmark's [[medium-difficulty tasks||The agent receives a report that identifies the affected component, but not the specific symptom or error message. ORCA-bench calls this its realistic-input setting.]] and 10.0% on [[hard tasks||The agent receives only a vague report such as "Users are reporting site issues", with no affected component, symptom, or error message identified.]] (and removing source-code access degraded every reported metric). The authors conclude that substantial engineering remains before frontier coding agents can reliably investigate production incidents.

ORCA-bench begins with a reported incident, so it does not test whether the agent can recognise a problem. It tests what happens next: whether the agent can diagnose the cause using the telemetry, analytical tools and source code already available. The low accuracy shows that even this narrower task is not yet solvable with current capabilities. But the source-code result is encouraging: the agents [[did better||Across the five evaluated agents, removing source-code access reduced RCA accuracy by 9–16%.]] when they could relate the telemetry to the system's implementation.

## Closing the loop

Despite those results, fixed telemetry need not define the limit of an agent's investigation. If problem detection and fixed-telemetry investigation become useful, [[instrumentation might become another tool available to the agent||ORCA-bench limits agents to fixed telemetry. Here, as in [active perception](https://link.springer.com/article/10.1007/s10514-017-9615-3), the agent can change how it senses by modifying instrumentation.]]. When the available telemetry is insufficient for whatever reason, the agent could add a measurement on a system under its control and continue the investigation.

In the longer term, these capabilities could form a loop that allows an investigation to continue when the existing telemetry is not enough:

**detect → investigate → hypothesise → identify missing evidence → change instrumentation → observe again → test → repeat**

Building that loop means testing each capability on its own, then testing how they work together. Even if the agent recognises what evidence is missing, it may not be able to recover it: new instrumentation takes time to implement and deploy, the event may not recur, and some evidence may already be lost.

Even still, when it can collect another measurement the result may not be trustworthy. The agent must distinguish a genuine change in the system's behaviour from sampling bias, broken instrumentation or an artefact of its own measurement methodology. Giving it control of the instrumentation creates another way for these errors to enter the investigation.

## Why Bitcoin's P2P network

I plan to begin on Bitcoin's P2P network by testing whether an agent can detect and investigate problems using existing telemetry. Tens of thousands of independently operated nodes are distributed around the world, with no central operator or Network Operations Centre tracking how the network behaves as a whole (though b10c proposed a [Bitcoin Network Operations Collective](https://b10c.me/projects/024-peer-observer/#a-bitcoin-network-operations-collective), which is now [alive and growing](https://bnoc.xyz)). Software versions, relay policies, application-layer usage and the population of nodes all change over time, while detailed observation of even a handful of nodes can produce a large volume of telemetry. Because Bitcoin Core is open source, anyone can inspect its behaviour and run an instrumented node.

Projects such as [peer-observer](https://github.com/peer-observer/peer-observer) provide that instrumentation, collecting P2P messages, RPC-polled node state and parsed `debug.log` lines from Bitcoin Core nodes. That still leaves a harder problem: deciding what those observations mean and what else to collect when they cannot answer the question.

The May 2023 [`inv-to-send` queue incident](https://b10c.me/observations/15-inv-to-send-queue/) shows what that harder problem looks like in practice. Monitoring revealed block-propagation delays increasing from under one second to more than five seconds during the BRC-20 transaction surge, alongside an approximately ten-fold increase in the stale-block rate. That established that block propagation was slowing, but not why. Explaining the cause required correlating different signals, forming hypotheses and investigating the underlying Bitcoin Core behaviour.

## Towards adaptive, autonomous observability

ORCA-bench shows that we are still a long way from agents capable of investigating harder problems like the `inv-to-send` queue incident. Its agents began with a reported incident and fixed telemetry, and still struggled to determine the cause. On Bitcoin's P2P network, there may be no incident report to start from. The agent would first have to recognise that something has changed, then test possible explanations against P2P messages, node state, logs and Bitcoin Core's source.

For now, progress will be gradual. Problem detection and fixed-telemetry investigation need to become useful before agent-directed instrumentation makes sense. The sudden part could come when these capabilities work well enough together to cross a [[practical delegation threshold||The [DARPA Grand Challenge](https://www.darpa.mil/about/innovation-timeline/grand-challenge) is perhaps a relevant precedent: no vehicle completed the 2004 course, while five completed the 2005 course as integrated autonomous systems became reliable enough.]]: working with the agent takes less effort than conducting the investigation directly. Once that threshold is crossed, the agent can become the first investigator rather than another tool a human has to operate.

I will start with whether an agent can notice a problem on Bitcoin's P2P network and investigate it with the telemetry, tools and source already available. And then, if that works, perhaps we can extend the agent's remit to modifying instrumentation, and begin closing the loop, freeing up humans to work higher up the value chain where their expertise is needed most.

## Forecasting postscript

Forecasting may be another useful tool inside the loop. Time-series foundation models such as Google's recently updated [TimesFM-3](https://research.google/blog/timesfm-3-a-zero-shot-foundation-model-for-multivariate-forecasting) produce zero-shot point and quantile forecasts for multiple related series, without task-specific fine-tuning. Those forecasts could give an agent a range of likely near-term behaviour against which to compare observations. With a separately calibrated scoring rule, a sufficiently large miss could become one reason to investigate (though predicting what is likely to happen is not the same as [[deciding whether that behaviour is normal or healthy||An earlier univariate TimesFM adapted to persistent anomalous behaviour and was not competitive with established anomaly-detection baselines in a zero-shot evaluation ([Uray et al., 2026](https://arxiv.org/abs/2607.12454)).]]). Forecasting may strengthen detection but it cannot tell the agent whether a departure matters or why it occurred.
