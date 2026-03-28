# **Junction immediate next-step plan**

## **Objective**

Validate whether Junction can become a real company by proving three things in parallel:

1. **Product credibility** — technical teams can understand, trial, and trust it

2. **Market pull** — a specific ICP feels enough pain to engage and pay

3. **Commercial shape** — there is a repeatable path from OSS interest to services and then software revenue

---

# **1\. Core goal for this phase**

The goal is **not** broad launch.

The goal is to answer:

**For which specific type of scaling company does Junction solve a painful enough implementation problem that they will engage deeply, trial it, and pay for some combination of services, hosting, or software?**

This phase should be treated as:

* PMF exploration

* design partner recruitment

* product hardening

* narrative sharpening

---

# **2\. Primary ICP for exploration**

## **Primary target**

**Technical growth-stage startups and scaling companies** that are:

* engineering-led or product-led

* increasingly complex in analytics / martech needs

* beyond “just install GA4”

* uncomfortable with brittle GTM sprawl or ad hoc tracking

* interested in speed, flexibility, and future scalability

## **Best-fit examples**

* B2B SaaS

* PLG startups

* headless / technical ecommerce teams

* companies with both product analytics and marketing destinations

* teams using AI-assisted development workflows

## **Buyer / champion candidates**

* founder

* engineering lead

* product lead

* growth engineering lead

* analytics owner

* head of data at smaller companies

## **Positioning for this ICP**

Junction is:
 **the developer-native event implementation layer for scaling companies that need more control than legacy tag managers and less overhead than a full CDP.**

---

# **3\. Strategic posture**

## **What Junction is**

* code-first event collection and routing

* schema-validated implementation layer

* consent-aware data collection foundation

* product \+ marketing destination bridge

* modern replacement for brittle tag-manager sprawl

## **What Junction is not**

* not a CDP

* not a customer-360 platform

* not an audience builder

* not an identity graph company

* not trying to out-Segment Segment

## **Why this matters**

The company should own:

* implementation

* collection

* validation

* consent-aware routing

* observability

* developer workflow

It should remain:

* CDP-compatible

* warehouse-friendly

* identity-ready at the event level

But not become responsible for profiles, audiences, and customer unification in the near term.

---

# **4\. Near-term product roadmap**

## **Tier 1: must-do now**

### **A. Add PostHog destination**

Why:

* supports startup / technical ICP

* broadens story beyond martech

* strengthens “one event layer for product \+ growth”

* fits AI-native builder audiences

Success outcome:

* Junction can credibly support both product and marketing use cases in the same implementation story

### **B. Improve debugging / observability**

This is likely the most important product improvement after core destination support.

Must-have capabilities:

* live event stream

* payload inspection

* validation error visibility

* queued / dropped / replayed event visibility

* destination delivery status

* human-readable explanation of failures

* clear consent-blocking visibility

Success outcome:

* a prospect can understand what happened, why it happened, and whether Junction is trustworthy

### **C. Create a lightweight hosted gateway / runtime MVP**

Must-have capabilities:

* managed ingestion endpoint

* credential/secret handling

* delivery logs

* retries

* basic health status

* simple managed deployment story

Success outcome:

* a design partner can adopt Junction without needing to self-host everything or worry about runtime ops

### **D. Build excellent reference implementations**

Prioritize:

* Next.js SaaS example

* Astro example

* one ecommerce/headless example

Each should show:

* event schemas

* consent flow

* multiple destinations

* validation behavior

* debug workflow

Success outcome:

* a technical buyer can imagine adopting Junction in under 10 minutes

---

## **Tier 2: build next**

### **A. Add one or two more high-value destinations**

Best candidates:

* Mixpanel

* HubSpot

* LinkedIn Ads

* Segment as a destination

* RudderStack as a destination

Why:

* supports startup growth stacks

* reduces adoption friction

* lets Junction sit upstream even when customers keep existing tools

### **B. Improve schema / contract ergonomics**

Focus on:

* easier schema authoring

* reusable patterns

* standard event templates

* better validation messages

* starter event libraries

### **C. Improve consent implementation experience**

Focus on:

* cookbook examples

* common consent modes

* better destination-level mapping

* visibility into why events are blocked/queued

* practical examples of GPC/DNT handling

### **D. Build migration helpers**

Focus on:

* GTM-to-Junction guidance

* Launch-to-Junction guidance

* event inventory templates

* data layer mapping patterns

* switch-over playbooks

---

## **Tier 3: differentiators to layer in**

* AI CLI helpers

* config scaffolding from prompts

* schema generation assistance

* destination mapping suggestions

* implementation explainers

* more vertical templates

These matter, but should not outrun core operability.

---

# **5\. Design partner program**

## **Purpose**

Use design partners to validate:

* who cares most

* what pain is strongest

* which capabilities drive adoption

* what buyers will pay for

* what should become product vs. service

## **What a design partner is**

A real early customer who:

* has a real problem

* collaborates closely

* accepts some product immaturity

* gives structured feedback

* helps shape the product

## **Design partner selection criteria**

Prioritize companies that:

* have current implementation pain

* are collaborative

* are technical enough for code-first adoption

* resemble future customers you want more of

* can assign a real internal owner

Avoid companies that are:

* just curious

* too custom

* too early to feel real pain

* too enterprise-heavy for an evolving product

* unwilling to commit time or money

## **Design partner commercial model**

Default model should be:
 **paid, but advantaged**

Likely structure:

* discounted implementation/design-partner engagement

* possible hosted/runtime access included

* direct access to founders

* input into roadmap

* expectation of active collaboration

Do not default to free.

---

# **6\. GTM learning plan**

## **Phase 1: interview and pattern-find**

Build a target list of founders and operators and run structured conversations.

Target:

* 10–15 discovery interviews

Goals:

* understand current stack

* identify breaking points

* hear buyer language

* validate who owns the problem

* test whether the pain is speed, complexity, reliability, trust, or flexibility

Questions to probe:

* what broke first in your current setup?

* where does implementation slow you down?

* how do new tools get added today?

* who owns tracking?

* how much engineering work does analytics create?

* how do you debug broken or missing events?

* what happens when consent requirements complicate tracking?

* what would have to be true for you to switch approaches?

## **Phase 2: convert 2–3 design partners**

The initial commercial offer should be framed as:
 **Analytics Implementation Modernization**

Package includes:

* audit/current-state review

* event architecture design

* Junction implementation

* destination setup

* consent-aware modeling

* QA and launch support

## **Phase 3: extract repeatable pain**

After each engagement, document:

* what they thought they were buying

* what value showed up fastest

* what blocked adoption

* which capabilities mattered most

* which asks are productizable

* what they would actually pay for

---

# **7\. Monetization plan**

## **Near-term revenue**

### **A. Productized implementation services**

Sell through Stacked Analytics initially.

Examples:

* migration package

* modernization package

* instrumentation architecture package

* launch support package

Why:

* fastest path to revenue

* easiest entry into consideration set

* creates product learning

* design-partner friendly

### **B. Hosted gateway / runtime**

As product matures, offer managed runtime as recurring revenue.

What customers are buying:

* convenience

* reliability

* lower operational burden

## **Medium-term software monetization**

### **A. Observability / debugging / event QA**

This is likely the strongest premium software surface.

Customers buy:

* confidence

* faster troubleshooting

* clearer delivery visibility

* less time lost to broken implementations

### **B. Team workflows / environments / audit trail**

Add later for:

* larger teams

* agencies

* mid-market accounts

* enterprise readiness

Customers buy:

* coordination

* control

* rollback

* traceability

## **Monetization sequence**

1. services

2. hosted runtime

3. observability / QA

4. team workflows / audit trail

---

# **8\. Role of Stacked Analytics**

## **Recommended model**

Use Stacked as:

* implementation/services partner

* design partner delivery layer

* migration and architecture partner

Use Junction as:

* product/platform

* OSS project

* hosted offering

* core company narrative

## **Why this works**

* Stacked can absorb high-touch work

* Junction stays product-disciplined

* early revenue does not force Junction into consultancy identity

* customer learning still flows into roadmap

## **Guardrails**

Be explicit that:

* Stacked sells services

* Junction is the product

* design partners are helping shape Junction

* not every services request becomes a product feature

Avoid Junction becoming perceived as just “Stacked’s internal framework.”

---

# **9\. Competitive differentiation**

## **Primary competitors**

* GTM

* Adobe Launch / Tags

* Segment

* RudderStack

* Tealium

## **Secondary / adjacent**

* Snowplow

* mParticle

* Piwik PRO

* JENTIS

* Commanders Act

## **Vertical / ecosystem-specific**

* Stape

* Elevar

## **Junction’s differentiation**

Junction should win by being:

* more code-first than GTM / Adobe

* lighter and more controllable than a full CDP

* more implementation-focused than broader customer-data platforms

* more developer-native than marketer-first tools

* better at typed, consent-aware event implementation than tag-sprawl approaches

Key line:
 **more control than legacy tag managers, less overhead than a full CDP**

---

# **10\. Messaging to test**

## **Primary message direction**

Sell Junction as growth infrastructure, not governance infrastructure.

Test messages like:

* ship analytics and downstream integrations faster

* replace brittle tag-manager sprawl with typed event infrastructure

* one implementation layer for product and marketing data

* scale your analytics implementation without inheriting CDP complexity

* a code-first foundation for reliable growth and product data

## **What not to lead with**

* governance

* compliance

* customer 360

* “GTM killer”

* “open-source CDP”

Governance should be supporting proof, not the front-door pitch.

---

# **11\. Immediate 90-day execution plan**

## **Days 1–30**

### **Product**

* scope and build PostHog destination

* define observability MVP

* define hosted gateway MVP

* improve docs and quickstart narrative

### **Market**

* build founder/operator target list

* run first 5–7 discovery conversations

* test positioning language

* draft design partner offer

### **Internal**

* define Stacked vs Junction relationship language

* define design partner qualification criteria

* create interview note template and product-learning template

## **Days 31–60**

### **Product**

* ship PostHog

* ship first observability improvements

* publish one great startup-focused example implementation

* tighten consent and validation docs

### **Market**

* complete 10–15 discovery interviews

* identify strongest ICP signals

* move best-fit prospects into design-partner conversations

* refine offer based on objections and feedback

### **Commercial**

* package paid design-partner engagement

* define what is OSS vs hosted vs services

* create a simple one-page design partner brief

## **Days 61–90**

### **Product**

* deliver hosted gateway/runtime MVP

* improve debug/event inspection further

* start next destination based on interview signal

* publish migration guide(s)

### **Market**

* close 2–3 design partners

* begin real implementations

* gather case-study material

* document repeated pain themes

### **Strategy**

* review what customers actually valued

* update roadmap based on repeated patterns

* refine investor/company narrative with evidence from real partner work

---

# **12\. Success criteria for this phase**

At the end of this phase, you want evidence that:

## **Product**

* Junction feels credible and understandable

* technical teams can adopt it without huge friction

* debugging/operability is strong enough to build trust

## **Market**

* a clear ICP emerges

* a repeatable pain narrative shows up

* design partners engage for real reasons, not curiosity

## **Commercial**

* at least some buyers will pay

* services-led motion works

* hosted/runtime interest exists

* you can see the path to recurring software revenue

---

# **13\. Bottom-line recommendation**

The next step is not just “build more features.”

It is to run a coordinated exploration with four priorities:

1. **Add PostHog and strengthen product credibility**

2. **Improve observability and create a lightweight hosted path**

3. **Run disciplined founder/design-partner discovery**

4. **Use Stacked for paid early services while keeping Junction clearly standalone**

That is the best path to figuring out whether Junction is:

* an interesting OSS tool

* a services-enabled product

* or the foundation of a real company

