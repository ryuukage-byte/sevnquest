import React from "react";
import { Composition, Series } from "remotion";
import { FPS, HEIGHT, SCENES, TOTAL_FRAMES, WIDTH, T } from "./timeline";
import { Hook } from "./scenes/Hook";
import { Logo } from "./scenes/Logo";
import { Pillars } from "./scenes/Pillars";
import { Loop } from "./scenes/Loop";
import { World } from "./scenes/World";
import { Dungeon } from "./scenes/Dungeon";
import { Tiers } from "./scenes/Tiers";
import { Extras } from "./scenes/Extras";
import { Cta } from "./scenes/Cta";

const MAP: Record<(typeof SCENES)[number]["id"], React.FC> = {
  hook: Hook,
  logo: Logo,
  pillars: Pillars,
  loop: Loop,
  world: World,
  dungeon: Dungeon,
  tiers: Tiers,
  extras: Extras,
  cta: Cta,
};

const Promo: React.FC = () => (
  <Series>
    {SCENES.map((s) => {
      const Scene = MAP[s.id];
      return (
        <Series.Sequence key={s.id} durationInFrames={T[s.id].dur}>
          <Scene />
        </Series.Sequence>
      );
    })}
  </Series>
);

export const Root: React.FC = () => (
  <Composition id="SevnQuestPromo" component={Promo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
