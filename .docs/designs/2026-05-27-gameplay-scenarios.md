# Gameplay Scenarios — MooGPT

These scenarios are used to validate the graph design and clarify expected
behavior at the graph level. Each scenario traces one or more turns, showing
which nodes fire, what state changes, and how MooGPT responds.

**Terminology:** An *action* is a successful game event (something that happened
on the farm). Only `GameAction` intents that pass validation and execute count
against the budget. Failed validations, clarifications, and queries are
*conversation moves* — they never cost budget.

---

## Scenario 1: Normal Turn — Budget Exhausted Naturally

**Setup:** Day 4. Player has 3 actions remaining. Two cows (Bessie, Clover),
both hungry. Gold: 120. Milk inventory: 4 jugs.

**Turn start:**
- `generate_briefing` fires.
- MooGPT: *"Good morning! Bessie and Clover are looking a bit peckish — they
  haven't eaten since yesterday. Milk prices are holding steady at 8g per jug.
  You've got 3 actions today."*
- Graph `interrupt()`s. Waiting for player.

**Action 1 — Player:** `"feed both cows"`
- `parse_intent` → `{ type: "feed_animal", targets: ["bessie", "clover"], quantity: 1 }`
- `validate_action` → valid (costs 2 actions, gold sufficient)
- `execute_action` → deducts feed cost (−20g), sets both cows `fed: true`, `actionsRemaining: 1`
- `appliedDeltas`: `[{ type: "feed", animal: "bessie" }, { type: "feed", animal: "clover" }]`
- `generate_narrative`: *"Done! Bessie and Clover are munching away happily. One action left — make it count."*
- Graph `interrupt()`s.

**Action 2 — Player:** `"sell all my milk"`
- `parse_intent` → `{ type: "sell_product", targets: ["milk"], quantity: 4 }`
- `validate_action` → valid
- `execute_action` → adds 32g, clears milk inventory, `actionsRemaining: 0`, `shouldEndTurn: true`
- `appliedDeltas`: `[..., { type: "sell", product: "milk", quantity: 4, gold: 32 }]`
- Day 4 game turn ends. End-of-turn nodes fan out in parallel:
  - `end_turn` → increments `turnNumber`, resets `actionsRemaining` to budget, ticks animal ages
  - `generate_journal_entry` → sees full `appliedDeltas` (both feed actions + sell): *"Day 4: Fed the girls and moved all the milk. Ended the day with 132g — a tidy profit."*
  - `surface_decisions` → no thresholds triggered, returns `[]`
  - `update_assistant` → applies trust drift (no ignored suggestions today), personality stays `helpful`
- `reset_turn_state` → graph terminates at `END`. React writes `GameState` to `localStorage`.
- React starts a fresh graph run for Day 5. `generate_briefing` fires as the first node of the new run.

---

## Scenario 2: Failed Attempt — Not Enough Gold

**Setup:** Day 7. Gold: 15. Player wants to buy a new cow (costs 80g). 2 actions remaining.

**Turn start:**
- MooGPT briefs: *"Market's busy today. New livestock arrived at the auction — a young Holstein is going for 80g. You've got 2 actions."*

**Attempt — Player:** `"buy the holstein"`
- `parse_intent` → `{ type: "buy_animal", targets: ["holstein"], quantity: 1 }` (`GameAction`)
- `validate_action` → invalid: `validationError: "Not enough gold (need 80g, have 15g)"`
- `generate_narrative` (refusal path): *"I'd love to help, but your wallet's looking a little thin right now. You'd need 80g — you've only got 15. Maybe sell some milk first?"*
- Graph `interrupt()`s. `actionsRemaining` unchanged — validation failed, so no game event occurred.

**Action 1 — Player:** `"sell my cheese"`
- `parse_intent` → `{ type: "sell_product", targets: ["cheese"], quantity: 2 }`
- `validate_action` → valid
- `execute_action` → +30g, `actionsRemaining: 1`
- MooGPT: *"Sold! 30g in your pocket. Still not quite enough for that Holstein, but you're getting there."*
- Graph `interrupt()`s.

---

## Scenario 3: Pending Decision — Sick Animal

**Setup:** Day 12. Bessie's health has dropped below the sick threshold. `surface_decisions` fires at end of Day 11's turn and adds a `Decision` to `pendingDecisions`.

**Turn start (Day 12):**
- `generate_briefing` includes the pending decision: *"Morning. Bessie's been off her feed — she's looking poorly. I've been in touch with Doc Hammersley; he can come out for 40g. Worth it, in my opinion, but it's your call."*
- `pendingDecisions`: `[{ id: "vet-bessie", choices: ["Call the vet (−40g)", "Wait and see"], trustDelta: [+5, −8] }]`
- Graph `interrupt()`s.

**Action 1 — Player:** `"call the vet"`

This message can reach the action pipeline via two routes — both are valid:

- **Route A — via `resolve_decision`:** `pendingDecisionId` is set from the
  briefing, so the interrupt routes to `resolve_decision`.
  - Interprets `choiceIndex: 0` ("Call the vet").
  - Applies `trustDelta: +5` → `moogpt.trust` crosses 70 threshold.
  - Routes to `update_assistant` → personality upgrades from `helpful` to `sassy`.
  - The chosen option maps to a `GameAction` (`buy_service: vet`), so
    `update_assistant` routes to `parse_intent` → `validate_action` →
    `execute_action`.
  - `execute_action` → deducts `−40g`, sets `bessie.health = healthy`, removes
    decision from `pendingDecisions`, `actionsRemaining: N−1`.

- **Route B — via `parse_intent`:** If the player's message is clear enough
  that `parse_intent` resolves it directly to `{ type: "buy_service",
  targets: ["vet", "bessie"] }`, the interrupt skips `resolve_decision` and
  flows through the normal action pipeline. The decision is resolved
  automatically as a side-effect of `execute_action`.

In both routes:
- `actionsRemaining` decreases by 1 — calling the vet is a `GameAction` and costs a budget slot.
- `generate_narrative`: *"Ooh, good call. Doc Hammersley says she'll be right as rain by tomorrow. I knew you'd make the right choice — you're getting the hang of this."*
- Graph `interrupt()`s.

---

## Scenario 4: Player Ends Turn Early

**Setup:** Day 9. Player has 2 actions remaining but doesn't want to use them.

**Action 1 — Player:** `"I'm done for the day"`
- `parse_intent` → `{ type: "end_turn" }`
- `validate_action` → always valid
- `execute_action` → sets `shouldEndTurn: true` (remaining actions are forfeited)
- End-of-turn nodes fire. `generate_journal_entry`: *"Day 9: A quiet one. Took it easy and called it early."*
- `generate_briefing` fires for Day 10.

---

## Scenario 5: Clarification Required

**Setup:** Day 3. Player has 3 cows: Bessie, Clover, Dot.

**Conversation move — Player:** `"feed the brown one"`
- `parse_intent` → `{ type: "clarify" }` (`ConversationMove` — ambiguous input)
- Short-circuits to `generate_narrative`: *"Hmm, I'm not sure which one you mean — Bessie, Clover, and Dot are all a bit brownish to be honest. Which one did you have in mind?"*
- Graph `interrupt()`s. `actionsRemaining` unchanged — no game event occurred.

**Action 1 — Player:** `"bessie"`
- `parse_intent` → `{ type: "feed_animal", targets: ["bessie"] }` (`GameAction`, model uses conversation history for context)
- Proceeds normally through `validate_action` → `execute_action`.

---

## Scenario 6: Multi-Turn Trust Arc

This scenario spans several turns to illustrate the trust/personality system.

**Day 1–5 (trust: 45, personality: helpful):**
- Player follows MooGPT's suggestions each turn. Trust drifts up +2/turn.

**Day 6 (trust: 55):**
- MooGPT suggests selling milk now (price spike). Player ignores and skips.
- End-of-turn trust drift: −3 (ignored suggestion). Trust → 52.

**Day 8 (trust: 48):**
- Another ignored suggestion. Trust → 45. Still `helpful`.

**Day 14 (trust: 31, after a string of ignored advice):**
- Trust crosses 30 threshold. `update_assistant` → `cautious`.
- MooGPT briefing tone shifts: *"Good morning. Market's... fine, I suppose. 
  Milk prices dropped a little. I do have some thoughts, if you're interested
  in hearing them this time."*
