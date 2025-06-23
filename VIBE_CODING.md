# Vibe Coding: Best Practices & Insights

This document summarizes key learnings and insights from expert advice on effectively using AI coding assistants (often referred to as "Vibe Coding").

## Overall Philosophy & Approach

*   Vibe coding is a skill that can be improved with practice and by adopting best practices.
*   Many effective vibe coding techniques mirror those of professional software engineering.
*   The primary goal is to leverage AI tools to achieve the best possible results.
*   Treat AI as a new type of programming language where you program with natural language, requiring detailed context and information.
*   The overarching theme is to guide the LLM to follow the processes a good professional software developer would use.

## Getting Started & Tooling

*   **For beginners:** Tools like Replit or Lovable offer easy visual interfaces, especially for UI. Product managers/designers are using these for quick UI implementation instead of Figma.
*   **For experienced coders (even if rusty):** Can often go straight to tools like Windsurf, Cursor, or Claude Code.
*   **If an AI IDE gets stuck:** Try pasting the code and question directly into the LLM's web UI.
*   **Consider using multiple AI tools concurrently:** 
    *   Use a faster tool for quick frontend/full-stack tasks while a slower, more thorough tool processes a larger request.
    *   Run the same prompt on multiple tools simultaneously to get different iterations and pick the best one.
*   **Continuously experiment with new model releases:** Their strengths in different areas (debugging, planning, implementation, refactoring) change rapidly. Check which models perform best for specific tasks at any given time.

## Planning & Project Management

*   **Crucial First Step: Work with the LLM to write a comprehensive plan *before* writing code.**
    *   Store this plan in a markdown file (e.g., `PLAN.md`) within your project.
    *   Continuously refer to and update this plan collaboratively with the AI throughout the project.
    *   Refine the plan: remove unwanted items, explicitly mark features as "won't do" or "out of scope for now," and keep a section for "ideas for later."
*   **Implement the plan section by section.** Clearly instruct the AI which part of the plan to work on (e.g., "Let's just do section two right now.").
*   **After each section is implemented:**
    1.  Check that it works correctly.
    2.  Run your tests.
    3.  Commit the working code to Git.
    4.  Have the AI mark the completed section in your plan document.
*   **Don't expect AI to "one-shot" entire complex products.** Build piece by piece, ensuring a working implementation at each step.
*   **Spend significant time with a pure LLM (e.g., ChatGPT, Claude web UI) to define the scope and architecture *before* using integrated coding tools.** This helps prevent the AI from "free-running" and making up unworkable solutions in the codebase.

## Version Control (Git)

*   **Use Git religiously. It's your friend.**
*   Commit frequently, especially after each working piece of functionality or a successful section implementation.
*   **Start new features or significant changes from a clean Git slate.** This ensures you can revert to a known working version if the AI goes off track.
*   Don't fully trust built-in revert functionalities in AI tools yet; rely on Git for robust version control.
*   If the AI goes off track or code becomes messy after multiple attempts, **don't hesitate to use `git reset --hard`** to revert to a clean state and try a different approach.
*   If a correct solution is found after many messy attempts, `git reset` to a clean state and then feed the *final, working solution/approach* to the AI to implement cleanly, avoiding layers of accumulated "cruft."

## Testing

*   **Write tests or have the LLM write tests for you.** LLMs are generally good at generating test code.
*   **Prefer high-level integration tests** that simulate user flows and ensure features work end-to-end. LLMs often default to generating low-level unit tests, so you may need to guide them towards integration tests.
*   **Write these high-level integration tests *before* moving on to the next feature.**
*   Test suites are crucial for catching regressions, especially since LLMs can make unintended changes to unrelated parts of the code.
*   If tests fail due to unexpected, unrelated changes made by the AI, `git reset` and try the operation again on a clean base.
*   **For test-driven development (TDD):** Consider handcrafting your test cases first (without LLM assistance for this part). These well-defined tests can then act as strong guardrails for the code the LLM generates.

## Coding & Implementation Best Practices

*   **Provide clear, detailed instructions and sufficient context to the LLM.** The more information it has, the better the results.
*   **Write specific "rules" or instructions for your AI coding agent** (e.g., in `cursorrules` files, `STYLE_GUIDE.md`, or a dedicated instructions markdown file). Some users write hundreds of lines of such instructions, which significantly improves agent effectiveness.
*   **For complex functionality that you might not fully trust the AI to implement directly in your main project:**
    1.  Consider building a small, simplified reference implementation of that feature in a clean, standalone project first.
    2.  Alternatively, find an existing open-source reference implementation (e.g., on GitHub).
    3.  Then, point the LLM to this reference implementation and instruct it to follow that pattern or approach when implementing the feature in your larger, more complex codebase.
*   **Modularity is key:**
    *   Favor small files and a modular or service-based architecture with clear API boundaries. This benefits both human developers and LLMs.
    *   A modular design with consistent external APIs allows internal implementation details to be changed more safely, as long as the external interface and tests pass.
*   **Refactor frequently:**
    *   Once a piece of code is working and the relevant tests pass, feel free to refactor it (or ask the AI to help refactor).
    *   Ask the LLM to identify parts of the codebase that seem repetitive or could be good candidates for refactoring.
    *   Keep files small and modular to make them easier for both humans and LLMs to understand and maintain.
*   **Tech Stack Choice:** AI tends to perform better with mature frameworks and languages that have well-established conventions and abundant, consistent, high-quality training data online (e.g., Ruby on Rails was cited as an example). Performance might be less predictable or effective with newer, less common languages or frameworks that have less online training data (e.g., Rust, Elixir were cited at the time of the video). This landscape is, however, subject to rapid change as models are trained on more diverse data.

## Debugging Strategies

*   When a bug occurs, **first try copy-pasting the exact error message** (from server logs, browser console, etc.) directly into the LLM. This is often sufficient for the AI to identify and fix the problem.
*   For more complex bugs, ask the LLM to **suggest 3-4 possible causes *before* it attempts to write any code.** This encourages a more analytical approach.
*   After each failed bug-fix attempt by the AI, **`git reset` to a clean state** to avoid accumulating layers of incorrect or messy code (often referred to as "crust").
*   **Add logging statements** to your code to help diagnose issues. The LLM can also assist in adding relevant logging.
*   If one LLM struggles with a particular bug or task, **try switching to a different model** (e.g., from an OpenAI model to a Claude model or Gemini, or vice-versa), as they have varying strengths and training data.
*   Once a gnarly bug's root cause is identified (perhaps through manual debugging or with AI assistance), `git reset` all attempted (and failed) fixes. Then, provide the LLM with very specific, targeted instructions to fix *that precise bug* on the clean codebase.
*   **Monitor if the LLM is falling into a "rabbit hole"** (e.g., repeatedly generating problematic code, requiring constant error message pasting, or not making progress). If this happens:
    1.  Take a step back.
    2.  Prompt the LLM to analyze *why* it's failing.
    3.  Consider if you've provided enough context or if the task is too ambiguous.

## Interacting with LLMs & Advanced Techniques

*   **Use LLMs for non-coding tasks related to your project:**
    *   DevOps tasks (e.g., configuring DNS servers, setting up hosting environments via command-line tools).
    *   Creating design assets (e.g., generating images for favicons).
    *   Writing utility scripts for asset processing (e.g., resizing images into multiple formats).
*   **Use LLMs as a learning tool:** After the AI implements a feature or writes a piece of code, ask it to walk through the code line by line and explain what it does and why. This can be a great way to learn new technologies or understand unfamiliar code.
*   **API Documentation:** Pointing LLMs to live online documentation can be unreliable or yield patchy results. A more effective approach is often to:
    1.  Download the relevant API documentation (e.g., as markdown files, text files, or even PDFs if text-extractable).
    2.  Place these downloaded documentation files in a local subdirectory within your project.
    3.  Instruct the LLM to read these local docs before implementing features that use that API.
*   **Use screenshots effectively:** Most modern AI coding agents accept image inputs. Paste screenshots into the AI tool to:
    *   Clearly demonstrate UI bugs.
    *   Provide design inspiration from other websites or mockups.
*   **Use voice input for speed:** Tools that transcribe voice to text (e.g., Aqua was mentioned) can allow you to input instructions and prompts much faster than typing (e.g., 140 words per minute). LLMs are often tolerant of minor grammatical errors or punctuation mistakes in transcriptions.

By applying these practices, you can significantly enhance your productivity and the quality of output when vibe coding.
