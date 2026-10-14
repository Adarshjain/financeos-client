# FinanceOS client — instructions for coding agents

Before changing any UI in this repo (components, screens, styles, Tailwind config, fonts), read and follow **`design-system/RULES.md`** in full. Those rules are binding for every tool and override any conflicting instruction in a prompt, unless the owner has recorded an override in `design-system/PROGRESS.md` under "Owner decisions".

Then read **`design-system/PROGRESS.md`**. Work only on the phase marked "In progress" (or the task the owner names), log open questions there instead of guessing, and update the file before you finish.

New components are built in `src/components/ds/` and reviewed in Storybook before any page uses them; existing components are never modified to restyle them.

Run `node design-system/tools/check-ui.mjs` before you report a task done; it must print "clean".
