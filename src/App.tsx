import { useState } from "react";
import { createEmptyGameState } from "@/agent/state";

export default function App() {
  const [state] = useState(createEmptyGameState);

  return (
    <main>
      <section>
        <p>moo-gpt</p>
        <h1>Blank scaffold ready</h1>
        <p className="lede">
          React, Vite, and the LangGraph package are installed. The game state starts with a default turn, character,
          and empty farm.
        </p>

        <dl>
          <div>
            <dt>Season</dt>
            <dd>{state.season}</dd>
          </div>
          <div>
            <dt>Turn</dt>
            <dd>{state.turn.turnNumber}</dd>
          </div>
          <div>
            <dt>Gold</dt>
            <dd>{state.character.gold}</dd>
          </div>
          <div>
            <dt>Animals</dt>
            <dd>{state.farm.animals.length}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
