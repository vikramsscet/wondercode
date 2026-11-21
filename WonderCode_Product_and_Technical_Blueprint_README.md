# WonderCode

## Product Requirements, Technical Blueprint & Implementation Prompts

**Tagline:** Imagine it. Build it. Understand it.\
**Product:** WonderCode --- an AI-powered coding and learning platform
for children aged 8--12.\
**Initial programming languages:** HTML, CSS and JavaScript only.\
**Document status:** Initial product and engineering baseline.

------------------------------------------------------------------------

# 1. Product Overview

WonderCode helps children turn ideas into working web applications using
natural-language prompts. Children can play with the result, explore the
generated HTML/CSS/JavaScript, understand how it works, and improve it
with guided help from an AI Teacher.

WonderCode combines two experiences:

1.  **Free creation:** Children can describe and build projects based on
    their imagination.
2.  **Structured learning:** Every project can become a learning
    opportunity through explanations, visual diagrams, challenges and a
    personal learning journey.

## Product vision

> A friendly AI coding companion that helps children create things they
> love and understand the code behind them.

## Target audience

-   Primary: children aged 8--12.
-   Account owner: parent or guardian.
-   Guest users: may try a restricted experience without creating a
    permanent child account.

## Product principles

-   Make creating enjoyable before introducing technical complexity.
-   Explain concepts in age-appropriate language.
-   Support English, Hindi and conversational Hinglish explanations.
-   Encourage children to think, predict, experiment and debug---not
    just accept generated code.
-   Keep child safety, privacy and secure code execution central to the
    design.
-   Do not introduce Python, C or C++ in the initial product.

------------------------------------------------------------------------

# 2. Confirmed Product and Technology Decisions

  -----------------------------------------------------------------------
  Area                                Decision
  ----------------------------------- -----------------------------------
  Product name                        WonderCode

  Visual identity                     Combination of playful and modern

  Frontend                            React + Vite + JavaScript +
                                      Tailwind CSS

  Backend                             Node.js + Express + JavaScript

  Database                            Supabase PostgreSQL

  File storage                        Hybrid: relational metadata in
                                      PostgreSQL; project file/version
                                      content in Supabase Storage where
                                      appropriate

  AI integration                      Provider-independent adapter
                                      supporting multiple AI providers

  AI Teacher                          Text-based, with visual
                                      explanations and diagrams

  Account model                       Parent-managed accounts + guest
                                      trial mode

  Initial business model              Free initially; monetization can be
                                      introduced later

  Learning model                      Free creation + structured learning
                                      paths

  Explanation languages               English, Hindi and Hinglish

  Hosting                             Low-cost initial hosting with a
                                      path to scalable cloud
                                      infrastructure

  Domain                              To be decided

  Initial coding languages            HTML, CSS and JavaScript

  Code editor                         Monaco Editor

  Initial execution                   Sandboxed browser preview for
                                      HTML/CSS/JavaScript

  Learning journey                    My Coding Journey
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 3. Product Scope and Requirements

## 3.1 MVP goals

The first usable release must let a child complete this journey:

1.  Open WonderCode and enter as a guest or through a parent-managed
    profile.
2.  Describe an idea, such as "Create a calculator" or "Make a game
    where a cat catches stars".
3.  Review a simple AI-generated project plan.
4.  Generate HTML, CSS and JavaScript files.
5.  Run the project in a secure preview.
6.  Play with or interact with the result.
7.  Explore the generated code.
8.  Select a code line or concept and receive an age-appropriate
    explanation.
9.  Ask the AI Teacher questions in English, Hindi or Hinglish.
10. Make a change, run it again and understand what changed.
11. Save the project when signed in through a parent-managed profile.

## 3.2 User roles

### Parent / Guardian

-   Register and sign in.
-   Create and manage child profiles.
-   Set age band and explanation-language preference.
-   View the child's projects and learning progress.
-   Manage usage limits and privacy settings.
-   Request account/profile deletion and data export where applicable.
-   Manage consent and child access.

### Child

-   Use a parent-managed child profile.
-   Create projects from prompts.
-   View project plans and generated applications.
-   Explore code and explanations.
-   Ask the AI Teacher questions.
-   Complete challenges and track learning progress.
-   Save and revisit projects.

### Guest

-   Try a limited, temporary creation flow.
-   Use predefined or moderated prompts.
-   Have strict AI usage, project-size and execution limits.
-   No persistent child profile or unrestricted public sharing.
-   Be invited to ask a parent to create an account to save ongoing
    work.

Guest trial must not be used to bypass age-appropriate safety,
moderation or execution restrictions.

## 3.3 Functional requirements

### FR-01: Landing page and onboarding

-   Explain WonderCode in child- and parent-friendly language.
-   Offer "Try as Guest" and "Parent Sign In / Create Account".
-   Explain that a parent manages a child's persistent profile.
-   Use a playful-modern visual system, readable typography and
    accessible controls.

### FR-02: Parent authentication and child profiles

-   Use Supabase Auth for parent authentication unless a later
    architecture review selects another provider.
-   Parent can create one or more child profiles.
-   Store only information needed to operate the service.
-   Use an age band or age value only where legally and operationally
    appropriate.
-   Store preferred explanation language: `en`, `hi` or `hinglish`.
-   Enforce parent-to-child and child-to-project authorization on every
    relevant API.

### FR-03: Prompt Studio

-   Large, friendly prompt input.
-   Example prompts and project starter cards.
-   Accept English and Hindi prompts; understand Hinglish where
    possible.
-   Offer project-type suggestions such as game, quiz, calculator,
    animation or webpage.
-   Ask a short clarifying question when a prompt is incomplete.
-   Provide clear, child-friendly safety feedback for unsupported
    requests.

### FR-04: AI project planning

Before code generation, create a structured plan containing: - Project
title and short description. - Intended user interaction. - Features and
expected behaviour. - Files expected to be generated. - Learning
concepts involved. - A short child-friendly summary.

The child should be able to review the plan before generation.

### FR-05: Code generation

-   Generate a structured project with separate HTML, CSS and JavaScript
    files.
-   Use beginner-friendly code, meaningful names and helpful comments.
-   Avoid unnecessary dependencies and external scripts.
-   Return a schema-validated response, not unstructured prose.
-   Associate each generated result with a project version.
-   Do not claim code has run successfully until execution has actually
    succeeded.

### FR-06: Coding Workspace

Provide three primary areas: 1. Project files. 2. Code editor. 3. Live
preview.

Include: - Monaco Editor with syntax highlighting and line numbers. -
File switching. - Run, Stop and Restart controls. - Responsive
preview. - Clear execution status and child-friendly errors. - Autosave
for signed-in projects, with recovery for unsaved changes. - A simple,
uncluttered layout that works on desktop and tablet.

### FR-07: Secure live preview

-   Render HTML/CSS/JavaScript in a sandboxed iframe, separate from the
    main application origin where feasible.
-   Treat all generated and user-edited code as untrusted.
-   Use a restrictive Content Security Policy.
-   Do not expose parent application cookies, local storage, tokens or
    secrets to preview code.
-   Do not allow arbitrary network access by default.
-   Use a strict `postMessage` protocol; validate message origin and
    source.
-   Apply execution time, memory/size and output limits where
    technically possible.
-   Never execute generated code in the Express API process or main
    frontend context.

### FR-08: Code Explorer

-   Show the actual source files used by the preview.
-   Allow a child to select a line or code range.
-   Show file name, language and relevant concept.
-   Where feasible, connect preview interactions to relevant source
    code.
-   Keep explanations tied to the exact project version and file
    content.

### FR-09: AI Teacher

-   Answer questions using the current project, code version, selected
    file/line and child's explanation-language preference.
-   Explain concepts using short sentences and everyday examples.
-   Support English, Hindi and Hinglish.
-   Keep programming keywords and code syntax unchanged.
-   Provide visual explanations such as simple flow diagrams, step
    sequences and input/output examples.
-   Encourage the child to reason rather than always providing the
    complete answer.
-   Keep conversations focused on safe, age-appropriate learning.

### FR-10: Line-by-line and concept explanations

For a selected line or range, explain: - What the code does. - Why it is
used. - How it affects the application. - A simple real-world analogy. -
What may happen if it is changed or removed. - Related programming
concepts.

Explanations must reference the exact code version. If code changes,
mark earlier explanations as stale and regenerate them when needed.

### FR-11: Experiment Mode

-   Let the child request a change in natural language.
-   Identify the affected files and features.
-   Generate a new project version rather than overwriting the previous
    version.
-   Show a simple change summary.
-   Run the updated version.
-   Explain what changed and why.
-   Support undo/restore to a previous version.

### FR-12: Debugging and error learning

-   Capture preview console errors and execution status through the
    controlled preview bridge.
-   Translate technical errors into child-friendly explanations.
-   Highlight the likely relevant file and line where available.
-   Offer a suggested fix and explain it.
-   Distinguish verified errors from AI hypotheses.
-   Never silently alter code without showing the child what changed.

### FR-13: Projects and version history

-   Create, list, open, rename, duplicate and delete projects.
-   Maintain immutable project versions.
-   Store the prompt, plan, generated files and relevant metadata for
    each version.
-   Restore an earlier version by creating a new current version or a
    clearly audited restore event.
-   Keep guest projects temporary and subject to expiry.

### FR-14: My Coding Journey

Provide a visual learning journey with age-appropriate milestones, for
example: - **Seedling:** My First Webpage. - **Creator:** My First
Interactive Website. - **Explorer:** Buttons, Events and Variables. -
**Game Builder:** My First Browser Game. - **Young Developer:** Build
and explain a complete mini-project.

Track demonstrated learning, not just AI usage or project count.

### FR-15: Learning paths and challenges

-   Offer optional structured learning paths alongside free creation.
-   Include short, project-based challenges for HTML, CSS and
    JavaScript.
-   Examples: change a background, add a button, respond to a click,
    update a score, use a variable, add a condition.
-   Give hints before revealing a solution.
-   Record attempts and completion.
-   Avoid public leaderboards or pressure-based streaks for young
    children.

### FR-16: Parent dashboard

-   Show child profiles, saved projects and learning progress.
-   Show usage summaries and configured limits.
-   Provide privacy, consent and deletion controls.
-   Do not expose unnecessary sensitive conversation details in
    summaries.

### FR-17: Bilingual and localization support

-   UI language can be selected independently from explanation language.
-   Explanation language options: English, Hindi and Hinglish.
-   Support Hindi Unicode text and appropriate font rendering.
-   Preserve code syntax, identifiers and programming keywords.
-   Avoid machine-translating code.

------------------------------------------------------------------------

# 4. Non-Functional Requirements

  -----------------------------------------------------------------------
  Area                                Requirement
  ----------------------------------- -----------------------------------
  Performance                         Target first useful project preview
                                      within 30 seconds for typical MVP
                                      prompts; measure actual performance

  Availability                        Establish an initial service target
                                      and monitor it; do not promise
                                      availability before hosting is
                                      selected

  Security                            Strict authorization, secure
                                      secrets handling and sandboxed
                                      execution

  Privacy                             Data minimization, parent controls,
                                      retention and deletion policies

  Accessibility                       Keyboard navigation, readable text,
                                      contrast and clear focus states

  Responsive design                   Desktop and tablet first; usable on
                                      mobile browsers

  Reliability                         Autosave/recovery, immutable
                                      versions and retry-safe APIs

  Localization                        English, Hindi and Hinglish
                                      explanations

  Observability                       Structured logs, metrics, error
                                      tracking and request correlation

  Cost control                        AI quotas, guest limits,
                                      prompt/file-size limits and usage
                                      tracking
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 5. Technical Architecture

## 5.1 Architecture approach

Start with a **modular Express backend**, not microservices. Keep
modules separated so that high-load or security-sensitive capabilities
can later be extracted independently.

### Logical architecture

``` mermaid
flowchart TB
    B[Child / Parent Browser]

    subgraph FE[React + Vite Frontend]
      LAND[Landing and Onboarding]
      DASH[Child Dashboard]
      STUDIO[Prompt Studio]
      WORK[Workspace: Files + Monaco]
      PREVIEW[Isolated Preview iframe]
      TEACHER[AI Teacher and Learning UI]
      PARENT[Parent Dashboard]
    end

    subgraph API[Node.js + Express API]
      AUTH[Auth and Profile]
      PROJECT[Project and Version Module]
      AI[AI Orchestrator]
      VALIDATE[Code Validation]
      EXPLAIN[Explanation and Teacher]
      LEARN[Learning Journey]
      USAGE[Usage and Safety Controls]
    end

    SUPA[(Supabase Auth + PostgreSQL)]
    STORE[(Supabase Storage)]
    LLM[AI Provider Adapters]
    OBS[Logs / Metrics / Errors]

    B --> FE
    FE --> API
    API --> AUTH
    API --> PROJECT
    API --> AI
    API --> VALIDATE
    API --> EXPLAIN
    API --> LEARN
    API --> USAGE
    AUTH --> SUPA
    PROJECT --> SUPA
    PROJECT --> STORE
    AI --> LLM
    EXPLAIN --> LLM
    API --> OBS
    PREVIEW -. isolated execution .-> PREVIEW
```

The preview iframe is a browser-side runtime and must not be treated as
part of the trusted API environment.

## 5.2 Frontend architecture

Recommended structure:

``` text
wondercode/
  frontend/
    src/
      app/
      components/
        common/
        layout/
      features/
        onboarding/
        auth/
        child-profile/
        dashboard/
        prompt-studio/
        project-planner/
        workspace/
        code-explorer/
        live-preview/
        ai-teacher/
        learning-journey/
        challenges/
        parent-dashboard/
      services/
      hooks/
      contexts/
      localization/
      utils/
      styles/
      assets/
```

Responsibilities: - React handles presentation and client-side state. -
API services communicate with Express. - Monaco Editor displays and
edits source code. - Preview manager prepares and controls the sandboxed
iframe. - Localization layer handles UI language. - Explanation
components render text and safe visual diagrams.

## 5.3 Backend architecture

Recommended structure:

``` text
wondercode/
  backend/
    src/
      config/
      routes/
      controllers/
      services/
      repositories/
      middleware/
      modules/
        auth/
        children/
        projects/
        ai/
        code-validation/
        explanations/
        execution-metadata/
        learning/
        challenges/
        parent-dashboard/
        usage/
      providers/
        ai/
      utils/
      app.js
      server.js
```

Use clear controller → service → repository separation. Keep
provider-specific AI SDK code behind adapter interfaces. Do not let
route handlers call provider SDKs or database queries directly.

## 5.4 AI provider abstraction

Create a common interface so the application can switch providers
without changing product logic.

Illustrative interface:

``` javascript
class AIProvider {
  async generateProjectPlan(input) {
    throw new Error("Not implemented");
  }

  async generateProjectCode(input) {
    throw new Error("Not implemented");
  }

  async explainCode(input) {
    throw new Error("Not implemented");
  }

  async answerTeacherQuestion(input) {
    throw new Error("Not implemented");
  }

  async suggestCodeFix(input) {
    throw new Error("Not implemented");
  }
}
```

Implement provider adapters separately, for example: -
`OpenAIProvider` - `AnthropicProvider` - `GeminiProvider`

The selected provider and model should be configured server-side. API
keys must never be sent to the browser. Add timeouts, bounded retries,
structured-output validation, usage metering and safe fallback
behaviour.

## 5.5 Project generation workflow

``` mermaid
sequenceDiagram
    participant C as Child
    participant UI as React UI
    participant API as Express API
    participant AI as AI Provider
    participant DB as Supabase
    participant R as Preview Runtime

    C->>UI: Enter project idea
    UI->>API: Request project plan
    API->>AI: Understand prompt and plan
    AI-->>API: Structured plan
    API-->>UI: Show plan
    C->>UI: Approve plan
    UI->>API: Generate project
    API->>AI: Generate HTML/CSS/JS files
    AI-->>API: Structured files
    API->>API: Validate schema and content
    API->>DB: Save project version and metadata
    API-->>UI: Return files and version
    UI->>R: Load files into isolated preview
    R-->>UI: Execution status and controlled output
    UI-->>C: Show working project
```

Important: - Validate AI output against a strict schema. - Do not trust
the AI provider's statement that code is safe or executable. - The
preview execution result---not the model response---determines whether
the project ran successfully. - Save each generation/refinement as a
version. - Do not pass secrets or private parent data into model
context.

------------------------------------------------------------------------

# 6. Database Design

Use Supabase PostgreSQL. Supabase Auth manages parent authentication.
The Express backend verifies access tokens and enforces authorization.
Keep the Supabase service-role key only on the server.

Enable Row Level Security (RLS) on tables exposed through Supabase APIs.
Use least-privilege policies. Never rely only on frontend checks.

## 6.1 Core entities

  -----------------------------------------------------------------------
  Table                               Purpose
  ----------------------------------- -----------------------------------
  `parent_profiles`                   Parent account profile and
                                      preferences

  `child_profiles`                    Parent-managed child profiles

  `guest_sessions`                    Temporary guest trial sessions and
                                      expiry

  `projects`                          Project metadata and ownership

  `project_versions`                  Immutable version records

  `project_files`                     File manifest, storage key and file
                                      metadata

  `ai_interactions`                   Minimal AI request metadata, type,
                                      provider and usage

  `code_explanations`                 Version-bound explanations

  `teacher_conversations`             Conversation metadata

  `teacher_messages`                  Individual messages, with retention
                                      controls

  `learning_concepts`                 Catalog of coding concepts

  `learning_paths`                    Structured learning journeys

  `learning_path_steps`               Ordered steps in a learning path

  `challenges`                        Challenge definitions

  `challenge_attempts`                Child attempts and completion
                                      status

  `learning_progress`                 Demonstrated progress by concept

  `usage_events`                      AI and execution quota accounting

  `consent_records`                   Parent consent and policy version
                                      records
  -----------------------------------------------------------------------

## 6.2 Relationships

``` mermaid
erDiagram
    parent_profiles ||--o{ child_profiles : manages
    parent_profiles ||--o{ consent_records : grants
    child_profiles ||--o{ projects : owns
    guest_sessions ||--o{ projects : temporary_owner
    projects ||--o{ project_versions : has
    project_versions ||--o{ project_files : contains
    project_versions ||--o{ code_explanations : explains
    child_profiles ||--o{ teacher_conversations : has
    teacher_conversations ||--o{ teacher_messages : contains
    child_profiles ||--o{ learning_progress : tracks
    learning_concepts ||--o{ learning_progress : measures
    learning_paths ||--o{ learning_path_steps : contains
    learning_concepts ||--o{ challenges : teaches
    challenges ||--o{ challenge_attempts : receives
    child_profiles ||--o{ challenge_attempts : submits
    child_profiles ||--o{ usage_events : consumes
```

## 6.3 Important schema fields

These are logical fields; finalize types, constraints and indexes during
the database implementation prompt.

### `parent_profiles`

-   `id` UUID, references Supabase Auth user.
-   `display_name`
-   `created_at`
-   `updated_at`

### `child_profiles`

-   `id` UUID
-   `parent_id` UUID
-   `display_name` (nickname; avoid requiring a legal name)
-   `age_band`
-   `explanation_language` (`en`, `hi`, `hinglish`)
-   `created_at`
-   `updated_at`
-   `deleted_at` where soft deletion is required by the retention design

### `guest_sessions`

-   `id` UUID
-   `session_token_hash`
-   `created_at`
-   `expires_at`
-   `usage_limit`
-   `status`

Store only a hash of guest session credentials. Guest sessions must be
rate-limited and expire automatically.

### `projects`

-   `id` UUID
-   `child_id` nullable for guest-owned temporary projects
-   `guest_session_id` nullable
-   `title`
-   `description`
-   `project_type`
-   `status`
-   `current_version_id`
-   `created_at`
-   `updated_at`

Add a constraint so a project has exactly one valid owner type: a child
profile or a guest session.

### `project_versions`

-   `id` UUID
-   `project_id` UUID
-   `version_number`
-   `prompt`
-   `project_plan` JSONB
-   `language_set` (initially HTML/CSS/JavaScript)
-   `generation_status`
-   `created_at`

Unique constraint: `(project_id, version_number)`.

### `project_files`

-   `id` UUID
-   `version_id` UUID
-   `file_path`
-   `language`
-   `storage_key`
-   `content_hash`
-   `size_bytes`
-   `created_at`

Store source content in Supabase Storage for the hybrid approach. Keep
the manifest and metadata in PostgreSQL. Use private buckets and
short-lived signed URLs or backend-mediated access. Do not expose
unrestricted bucket access.

### `code_explanations`

-   `id` UUID
-   `version_id` UUID
-   `file_path`
-   `line_start`
-   `line_end`
-   `code_hash`
-   `explanation_language`
-   `explanation_payload` JSONB
-   `created_at`

### `learning_progress`

-   `id` UUID
-   `child_id` UUID
-   `concept_id` UUID
-   `mastery_status`
-   `evidence_count`
-   `last_demonstrated_at`
-   `updated_at`

Do not claim mastery merely because AI generated code containing a
concept. Record evidence from child actions or challenge attempts.

## 6.4 Database rules

-   Use UUID primary keys.
-   Use foreign keys and appropriate delete behaviour.
-   Add indexes for owner, project, version and created-date queries.
-   Use transactions for operations that update related project/version
    metadata.
-   Keep project versions immutable.
-   Store large file content and assets outside relational rows.
-   Use JSONB only for genuinely flexible structured payloads.
-   Define guest data expiry and cleanup.
-   Define parent account deletion and child data deletion workflows.
-   Keep AI conversation retention limited and documented.
-   Never store passwords directly; delegate parent authentication to
    Supabase Auth.
-   Do not put Supabase service-role credentials in frontend code.

------------------------------------------------------------------------

# 7. REST API Specification

Base path: `/api/v1`

Use JSON request/response bodies. Use a consistent error envelope and
request correlation ID.

## 7.1 Authentication and profiles

  -----------------------------------------------------------------------
  Method                  Endpoint                Purpose
  ----------------------- ----------------------- -----------------------
  POST                    `/auth/guest-session`   Create limited guest
                                                  session

  GET                     `/auth/me`              Get authenticated
                                                  parent context

  POST                    `/children`             Create child profile

  GET                     `/children`             List parent's child
                                                  profiles

  GET                     `/children/:childId`    Get child profile

  PATCH                   `/children/:childId`    Update child
                                                  preferences

  DELETE                  `/children/:childId`    Delete child profile
                                                  and initiate data
                                                  deletion
  -----------------------------------------------------------------------

Parent sign-in/sign-up can initially use Supabase Auth client flows.
Express must verify Supabase access tokens on protected routes.

## 7.2 AI planning and generation

  ------------------------------------------------------------------------------------------------------
  Method                  Endpoint                                               Purpose
  ----------------------- ------------------------------------------------------ -----------------------
  POST                    `/ai/project-plans`                                    Understand prompt and
                                                                                 create plan

  POST                    `/ai/projects/generate`                                Generate HTML/CSS/JS
                                                                                 project

  POST                    `/ai/projects/:projectId/refine`                       Generate a modified
                                                                                 project version

  POST                    `/ai/projects/:projectId/explanations`                 Generate explanations
                                                                                 for a version/file

  POST                    `/ai/teacher/conversations`                            Create teacher
                                                                                 conversation

  POST                    `/ai/teacher/conversations/:conversationId/messages`   Ask contextual question

  POST                    `/ai/projects/:projectId/debug`                        Explain error and
                                                                                 suggest fix
  ------------------------------------------------------------------------------------------------------

Generation and AI endpoints must enforce user/guest quotas, input
limits, moderation and authorization.

## 7.3 Projects and versions

  ----------------------------------------------------------------------------------------------------
  Method                  Endpoint                                             Purpose
  ----------------------- ---------------------------------------------------- -----------------------
  POST                    `/projects`                                          Create project from
                                                                               approved plan/files

  GET                     `/projects`                                          List accessible
                                                                               projects

  GET                     `/projects/:projectId`                               Get project metadata

  PATCH                   `/projects/:projectId`                               Rename/update project
                                                                               metadata

  DELETE                  `/projects/:projectId`                               Delete project

  GET                     `/projects/:projectId/versions`                      List versions

  GET                     `/projects/:projectId/versions/:versionId`           Get version and file
                                                                               manifest

  POST                    `/projects/:projectId/versions/:versionId/restore`   Restore version as a
                                                                               new current version
  ----------------------------------------------------------------------------------------------------

## 7.4 Preview and execution metadata

For the initial browser-only runtime, code executes in the isolated
browser preview. Do not create a server-side arbitrary-code execution
endpoint.

  -----------------------------------------------------------------------------------------------------------
  Method                  Endpoint                                                    Purpose
  ----------------------- ----------------------------------------------------------- -----------------------
  POST                    `/projects/:projectId/preview-events`                       Record limited
                                                                                      execution status/error
                                                                                      metadata

  GET                     `/projects/:projectId/versions/:versionId/preview-config`   Retrieve allowed
                                                                                      preview configuration
  -----------------------------------------------------------------------------------------------------------

Do not send arbitrary source code to an API just to execute it. The
browser preview bridge should send only validated, size-limited
diagnostic events.

## 7.5 Learning

  ----------------------------------------------------------------------------------------------
  Method                  Endpoint                                       Purpose
  ----------------------- ---------------------------------------------- -----------------------
  GET                     `/learning/paths`                              List learning paths

  GET                     `/learning/paths/:pathId`                      Get path and steps

  GET                     `/learning/concepts`                           List coding concepts

  GET                     `/learning/challenges`                         List challenges

  POST                    `/learning/challenges/:challengeId/attempts`   Record challenge
                                                                         attempt

  GET                     `/learning/progress`                           Get child's learning
                                                                         progress

  GET                     `/learning/journey`                            Get My Coding Journey
                                                                         milestones
  ----------------------------------------------------------------------------------------------

## 7.6 Parent dashboard

  Method   Endpoint                               Purpose
  -------- -------------------------------------- ------------------------
  GET      `/parent/children/summary`             List child summaries
  GET      `/parent/children/:childId/projects`   View child's projects
  GET      `/parent/children/:childId/progress`   View learning progress
  GET      `/parent/children/:childId/usage`      View usage summary
  PATCH    `/parent/children/:childId/limits`     Update usage controls

## 7.7 API conventions

Success response:

``` json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "request-identifier"
  }
}
```

Error response:

``` json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be processed.",
    "details": []
  },
  "meta": {
    "requestId": "request-identifier"
  }
}
```

Use appropriate HTTP status codes. Validate all path parameters, query
parameters and request bodies. Apply pagination to list endpoints. Do
not return internal stack traces, provider errors, secrets or sensitive
child data.

------------------------------------------------------------------------

# 8. AI Response Contracts

AI output must be structured and schema-validated before it is stored or
used.

## 8.1 Project plan example

``` json
{
  "title": "My Star Catcher Game",
  "description": "Move a basket to catch falling stars.",
  "projectType": "game",
  "features": [
    "Move the basket left and right",
    "Catch falling stars",
    "Increase the score"
  ],
  "files": ["index.html", "style.css", "script.js"],
  "learningConcepts": [
    "HTML elements",
    "CSS positioning",
    "JavaScript variables",
    "JavaScript events",
    "Conditions"
  ],
  "childSummary": {
    "en": "You will make a game where a basket catches stars.",
    "hi": "तुम एक ऐसा गेम बनाओगे जिसमें टोकरी सितारे पकड़ेगी।"
  }
}
```

## 8.2 Generated project example

``` json
{
  "project": {
    "title": "My Star Catcher Game",
    "runtime": "browser",
    "languageSet": ["html", "css", "javascript"]
  },
  "files": [
    {
      "path": "index.html",
      "language": "html",
      "content": "<!doctype html>..."
    },
    {
      "path": "style.css",
      "language": "css",
      "content": "..."
    },
    {
      "path": "script.js",
      "language": "javascript",
      "content": "..."
    }
  ],
  "learningConcepts": [
    "variables",
    "events",
    "conditions"
  ]
}
```

Enforce allowed file paths, maximum file count, maximum file size,
allowed file types and dependency restrictions. Do not accept executable
build scripts or arbitrary package installation in the MVP.

## 8.3 Explanation example

``` json
{
  "filePath": "script.js",
  "versionId": "version-uuid",
  "lineStart": 1,
  "lineEnd": 1,
  "codeHash": "sha256-hash",
  "concept": "variable",
  "explanation": {
    "en": "This creates a place to remember the player's score.",
    "hi": "यह खिलाड़ी का स्कोर याद रखने के लिए एक जगह बनाता है।",
    "hinglish": "Ye player ka score yaad rakhne ke liye ek variable banata hai."
  },
  "realLifeExample": {
    "en": "Think of it like a scoreboard.",
    "hi": "इसे एक स्कोरबोर्ड की तरह समझो।",
    "hinglish": "Isko ek scoreboard ki tarah samjho."
  },
  "tryThis": "What do you think happens if the starting score is 10?"
}
```

The server must verify that the referenced version, file, line range and
code hash match the saved source.

------------------------------------------------------------------------

# 9. Safety, Security and Child Privacy

This is a child-facing product. Security and privacy requirements must
be designed into the MVP.

## 9.1 Code execution safety

-   Generated code is untrusted.
-   Execute only inside the isolated preview context.
-   Prefer a separate preview origin.
-   Use sandboxed iframe restrictions and restrictive CSP.
-   Do not use `allow-same-origin` together with untrusted generated
    content unless a security review proves the configuration safe.
-   Do not expose parent app tokens, cookies or storage.
-   Restrict network access and external resources by default.
-   Validate `postMessage` origin, source and message schema.
-   Apply payload and output limits.
-   Never execute code in the Express server process.
-   Do not allow package installation, shell commands or arbitrary file
    access in the MVP.

## 9.2 API and database security

-   Verify Supabase JWTs on the backend.
-   Enforce parent/child/project ownership on every request.
-   Apply Supabase RLS to exposed tables.
-   Keep service-role credentials server-side only.
-   Use rate limits and quotas for guests and signed-in profiles.
-   Validate and sanitize inputs.
-   Avoid leaking provider errors or stack traces.
-   Use secure headers, CORS allowlists and request-size limits.

## 9.3 AI safety

-   Moderate prompts and generated content.
-   Refuse harmful or inappropriate requests in a calm, age-appropriate
    way.
-   Keep the AI Teacher focused on learning.
-   Do not request sensitive personal details from children.
-   Treat prompts and generated code as untrusted data, not system
    instructions.
-   Do not expose one child's project or conversation to another child.
-   Add limits to model context and tool capabilities.

## 9.4 Privacy and compliance

Before public launch, obtain qualified legal review for applicable child
privacy and consent requirements, including India's Digital Personal
Data Protection framework and any other target jurisdictions.

Design for: - Appropriate verifiable parental consent where required. -
Data minimization. - Clear parent-facing privacy information. - Defined
retention and deletion schedules. - Parent-managed access and
deletion. - No behavioural advertising to children. - No use of
children's private content for model training without an appropriate
legal basis and consent. - Restricted access to conversation and usage
data.

------------------------------------------------------------------------

# 10. Visual Design Direction

## Brand personality

-   Friendly, curious and encouraging.
-   Playful without looking like a toddler-only product.
-   Modern and clean.
-   Confidence-building, not competitive or stressful.

## Suggested visual system

-   Bright accent colours with a calm neutral background.
-   Rounded cards and buttons.
-   Friendly illustrations and simple icons.
-   Large readable typography.
-   Clear visual hierarchy.
-   Subtle animations, with reduced-motion support.
-   Consistent English/Hindi typography.

## Main screens

1.  Landing page.
2.  Parent sign-in and registration.
3.  Child profile selection.
4.  Child dashboard.
5.  Prompt Studio.
6.  Project plan review.
7.  Coding Workspace.
8.  Live Preview.
9.  Code Explorer.
10. AI Teacher panel.
11. My Coding Journey.
12. Challenges and learning paths.
13. Parent dashboard and privacy settings.

------------------------------------------------------------------------

# 11. Implementation Roadmap and Small Logical Prompts

Use the global development instructions supplied by the product owner
with every prompt below. Execute one prompt at a time. Review and test
each result before moving to the next.

## Phase A --- Foundation

### Prompt 01: Inspect Repository and Establish Architecture

Inspect the existing repository, identify frontend/backend structure,
dependencies, scripts and current conventions. Create or update the
architecture and development documentation. Do not implement business
features.

### Prompt 02: Create Frontend Foundation

Set up or refine React + Vite + JavaScript + Tailwind CSS. Configure
routing, shared layout, environment configuration and basic error
boundaries. Do not build feature screens yet.

### Prompt 03: Create Backend Foundation

Set up or refine Node.js + Express + JavaScript. Configure application
startup, routes, middleware, centralized errors, request logging,
security headers, CORS and health endpoint.

### Prompt 04: Configure Supabase

Configure Supabase client access for the backend, environment variables,
connection verification and local development instructions. Keep
service-role credentials server-side. Do not create all business tables
yet.

### Prompt 05: Establish Shared API and Coding Standards

Define response/error formats, request validation approach, API
versioning, naming conventions, linting/formatting and API documentation
conventions.

## Phase B --- Data and Identity

### Prompt 06: Design and Implement Database Schema

Create migrations for parent profiles, child profiles, guest sessions,
projects, project versions, project files, learning concepts, learning
paths, challenges, progress, consent and usage records. Add constraints,
indexes, RLS policies and documentation.

### Prompt 07: Implement Parent Authentication

Integrate Supabase Auth for parent registration, sign-in, sign-out and
session verification. Verify tokens in Express middleware. Do not build
child screens yet.

### Prompt 08: Implement Child Profiles

Implement create, list, read, update and delete operations for
parent-managed child profiles. Enforce ownership and privacy rules.

### Prompt 09: Implement Guest Trial Sessions

Create short-lived guest sessions with hashed credentials, expiry, rate
limits, project quotas and cleanup. Prevent guest access to persistent
parent/child data.

## Phase C --- Design and Navigation

### Prompt 10: Build WonderCode Design System

Implement the playful-modern theme, typography, colour tokens, buttons,
cards, forms, dialogs, loading states and responsive layout.

### Prompt 11: Build Landing and Onboarding

Create the landing page, product explanation, parent entry points and
guest trial entry. Keep parent and child experiences clearly separated.

### Prompt 12: Build Child Dashboard

Create the child dashboard with welcome section, recent projects,
starter ideas, learning journey preview and challenge cards using
temporary mock data only where APIs are not ready.

### Prompt 13: Build Parent Dashboard Shell

Create the parent dashboard layout for child profiles, project overview,
progress, usage and privacy settings. Connect real APIs when available.

## Phase D --- AI Creation

### Prompt 14: Implement AI Provider Abstraction

Create provider-independent interfaces, provider configuration,
timeouts, bounded retries, structured response validation and usage
tracking. Do not hard-code provider-specific logic into feature
services.

### Prompt 15: Implement Prompt Safety and Understanding

Validate and moderate child prompts. Detect project intent, language and
missing details. Return clarifying questions when needed. Do not
generate code yet.

### Prompt 16: Implement Project Planning

Generate a structured, age-appropriate project plan with features,
expected behaviour, files and learning concepts. Support English, Hindi
and Hinglish summaries.

### Prompt 17: Build Prompt Studio UI

Implement prompt input, example prompts, starter project cards, language
preference and plan review. Connect to the planning API.

### Prompt 18: Implement HTML/CSS/JavaScript Generation

Generate separate `index.html`, `style.css` and `script.js` files using
a strict schema. Enforce file/path/size/dependency restrictions and save
generated output as a new project version.

### Prompt 19: Implement Code Validation

Validate generated files, file paths, allowed types, size limits, syntax
and disallowed capabilities. Return structured validation results. Do
not execute code on the server.

## Phase E --- Workspace and Preview

### Prompt 20: Build Coding Workspace Layout

Create the project file explorer, editor area, preview area and
responsive workspace layout. Use mock project files only if generation
is not yet connected.

### Prompt 21: Integrate Monaco Editor

Add HTML, CSS and JavaScript syntax highlighting, line numbers, file
switching, editing and selected-line tracking.

### Prompt 22: Implement Isolated Browser Preview

Build the sandboxed iframe preview for HTML/CSS/JavaScript. Use
restrictive CSP, safe message passing, no parent secrets, no
unrestricted network access and clear execution limits. Do not use
server-side execution.

### Prompt 23: Add Run, Stop and Restart

Connect workspace controls to the preview runtime. Capture controlled
status and error events, enforce payload limits and display
child-friendly execution states.

### Prompt 24: Connect Generation to Workspace

Load generated project versions into the editor and preview. Ensure the
displayed source is exactly the source being previewed. Add recovery for
unsaved edits.

## Phase F --- Learning Experience

### Prompt 25: Implement Versioned Code Explanations

Generate explanations for selected code lines/ranges in English, Hindi
and Hinglish. Bind every explanation to version, file, line range and
code hash.

### Prompt 26: Build AI Teacher UI

Create a child-friendly text chat panel with suggested questions,
language selection and visual explanation rendering. Do not expose
provider credentials or unrestricted tools.

### Prompt 27: Implement Context-Aware AI Teacher

Provide the AI Teacher with only the authorized current project context,
selected file/line and relevant explanation. Add age-appropriate
response rules, moderation and usage limits.

### Prompt 28: Add Visual Learning Explanations

Render safe, structured flow diagrams, step sequences and input/output
examples. Do not render arbitrary AI-provided HTML or scripts.

### Prompt 29: Implement Experiment Mode

Allow natural-language modifications to create a new project version.
Show changed files and a child-friendly summary. Preserve previous
versions.

### Prompt 30: Implement Debugging Assistant

Explain preview errors, identify likely relevant code and suggest fixes.
Clearly distinguish verified runtime errors from AI-generated
hypotheses.

### Prompt 31: Add Predict-the-Output Activities

Before running selected examples, ask the child to predict the result.
Compare prediction with actual output and explain the difference.

## Phase G --- Projects and Learning Journey

### Prompt 32: Implement Project Library

Add project listing, opening, renaming, duplication and deletion.
Enforce ownership and guest expiry rules.

### Prompt 33: Implement Project Version History

Display version history, compare versions and restore an earlier version
without destroying history.

### Prompt 34: Implement Learning Paths and Challenges

Create short HTML, CSS and JavaScript challenges with hints, attempts
and completion records. Keep challenges age-appropriate and
project-based.

### Prompt 35: Implement My Coding Journey

Create visual milestones and track learning evidence. Award progress for
demonstrated understanding and challenge work, not merely AI-generated
output.

### Prompt 36: Connect Parent Dashboard to Real Data

Show child profiles, saved projects, learning progress, usage summaries
and available parent controls through authorized APIs.

## Phase H --- Safety, Quality and Launch

### Prompt 37: Implement Usage Limits and Cost Controls

Add guest and signed-in quotas, AI token/cost tracking, rate limits,
request-size limits and parent-configurable controls.

### Prompt 38: Complete Child Safety and Privacy Review

Review prompt moderation, AI responses, data collection, consent
records, retention, deletion, RLS, authorization and parent controls.
Document remaining risks.

### Prompt 39: Add Automated Tests

Add unit, integration and end-to-end tests for authentication,
ownership, guest limits, project generation, validation, preview
messaging, explanations and learning progress.

### Prompt 40: Add Observability

Add structured logs, request IDs, error reporting, performance metrics
and AI usage monitoring. Avoid logging child conversation content or
secrets unnecessarily.

### Prompt 41: Prepare Deployment

Configure low-cost initial hosting, environment variables, Supabase
production settings, HTTPS, build/deploy steps, backups and rollback
documentation. Keep infrastructure portable for future scaling.

### Prompt 42: MVP End-to-End Acceptance

Test the complete child journey: enter prompt → review plan → generate
HTML/CSS/JS → run preview → explore code → get explanation → ask AI
Teacher → modify project → save and revisit. Fix release-blocking issues
and document known limitations.

------------------------------------------------------------------------

# 12. Global Development Instructions

Use these instructions at the beginning of every implementation prompt.

## Product context

You are working on WonderCode, an AI-powered coding and learning
platform for children aged 8--12.

Children can: - Create applications using natural-language prompts. -
View and interact with generated applications. - Explore source code and
understand it through explanations. - Learn in English, Hindi and
Hinglish. - Follow free-creation and structured-learning experiences.

Initial programming languages are HTML, CSS and JavaScript only.

## Development guidelines

1.  Before implementing anything, inspect the existing project
    structure, source code, database schema and current implementation.
2.  Reuse existing components, services, utilities and coding patterns
    wherever possible.
3.  Do not unnecessarily rewrite or refactor unrelated modules.
4.  Follow the selected stack: React + Vite + JavaScript + Tailwind CSS,
    Node.js + Express + JavaScript, and Supabase PostgreSQL.
5.  Keep frontend, backend, AI integration, persistence and preview
    execution responsibilities clearly separated.
6.  Implement validation, error handling, logging and authorization.
7.  Treat all AI-generated code as untrusted.
8.  Never execute generated code in the Express server or trusted
    application context.
9.  Maintain backward compatibility with existing APIs and database
    structures.
10. Write appropriate unit and integration tests for implemented
    functionality.
11. Update API and technical documentation.
12. Do not introduce additional libraries without explaining their
    necessity.
13. Do not implement functionality belonging to future prompts unless
    explicitly required by the current scope.
14. Never expose AI provider keys, Supabase service-role keys or other
    secrets in frontend code.
15. Enforce parent, child, guest and project ownership on the backend.
16. Keep child safety, data minimization and parental controls in scope.

## Implementation process

-   Inspect the current implementation first.
-   Identify files to create or modify.
-   Explain the proposed implementation briefly.
-   Implement only the current prompt's scope.
-   Run relevant tests and resolve failures.
-   Summarize files created or modified.
-   Document assumptions, dependencies and pending work.

## Definition of Done

The implementation must satisfy the current prompt's acceptance
criteria, pass relevant tests and integrate correctly with the existing
application. Do not start the next prompt automatically.

------------------------------------------------------------------------

# 13. Definition of MVP Complete

WonderCode MVP is ready for controlled testing when:

-   A parent can register and create a child profile.
-   A guest can try a limited experience.
-   A child can submit an idea in English or Hindi/Hinglish.
-   AI can create a project plan.
-   AI can generate separate HTML, CSS and JavaScript files.
-   Generated code is validated before preview.
-   The child can run the application in an isolated browser preview.
-   The child can interact with the output.
-   The child can inspect and edit source code.
-   The child can select code and receive version-accurate explanations.
-   The AI Teacher can answer questions using authorized project
    context.
-   The child can request changes and see a new project version.
-   The child can save and revisit projects through a parent-managed
    profile.
-   My Coding Journey records meaningful learning evidence.
-   Parent controls, data deletion and usage limits work.
-   Security and child privacy reviews have been completed.
-   The complete end-to-end journey passes acceptance testing.

------------------------------------------------------------------------

# 14. Decisions Intentionally Deferred

The following decisions are not required to begin the MVP:

-   Final domain name.
-   Final hosting vendor.
-   Paid plans and subscription pricing.
-   Public project sharing or community features.
-   Voice-based AI Teacher.
-   Python, C and C++ support.
-   Mobile application.
-   School/teacher administration features.
-   Public leaderboards.

Do not implement these until they are explicitly approved.

------------------------------------------------------------------------

# 15. Immediate Next Step

Start with **Prompt 01 --- Inspect Repository and Establish
Architecture**.

Do not begin database migrations, authentication or feature development
until the repository inspection and architecture review are complete.

The product's first milestone is a reliable end-to-end experience:

**A child describes an idea, creates a working web application, plays
with it and understands how the HTML, CSS and JavaScript make it work.**
