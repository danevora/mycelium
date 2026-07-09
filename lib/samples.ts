/**
 * Bundled "Try a sample" wikis — one per template key. Unlike a real user source,
 * a sample is NOT run through the AI: it ships as a set of pre-authored, interlinked
 * pages that are seeded directly into the database. That makes the demo instant,
 * free, and deterministic — the graph is always the same and the planted
 * inconsistency is always present for the Consistency Check to find.
 *
 * `content`/`sourceTitle` are still recorded as the wiki's originating Source (so the
 * Sources list isn't empty and the provenance is visible), but the pages below are
 * the source of truth for what the seeded wiki contains.
 *
 * story-bible: deliberately authored with an internal contradiction — Kestrel Vane's
 * eyes are "pale grey" on her own page but "green" on the encounter page — so the
 * Consistency Check has a real contradiction to surface.
 */

export type SamplePage = { slug: string; title: string; content: string };

export type WikiSample = {
  templateKey: string;
  wikiName: string;
  sourceTitle: string;
  content: string;
  pages: SamplePage[];
};

const STORY_BIBLE: SamplePage[] = [
  {
    slug: "index",
    title: "Index",
    content: `# Index

_The Ashfall Chronicles — worldbuilding bible._

## Characters
- [[kestrel-vane]] — young lantern-keeper, protagonist
- [[ysolde-vane]] — Kestrel's late mother, former Chief Lantern-Keeper
- [[toril-ashgrave]] — Warden of the Ember Guild
- [[bram-locke]] — Tidewright Syndicate courier

## Places
- [[vael-harbor]] — cliffside port city
- [[mount-ordan]] — the volcano above the harbor

## Factions
- [[ember-guild]] — order of lantern-keepers
- [[tidewright-syndicate]] — shipping cartel
`,
  },
  {
    slug: "kestrel-vane",
    title: "Kestrel Vane",
    content: `# Kestrel Vane

Nineteen years old, sharp-featured, with cropped copper hair and **pale grey eyes** that miss nothing. Raised in the lantern-towers of [[vael-harbor]].

Daughter of [[ysolde-vane]], whom she succeeded as a keeper of the [[ember-guild]] after the fever took her mother. She inherited both the post and its debts.

Serves under Warden [[toril-ashgrave]], though her trust in him falters after her encounter with [[bram-locke]].`,
  },
  {
    slug: "ysolde-vane",
    title: "Ysolde Vane",
    content: `# Ysolde Vane

Former Chief Lantern-Keeper of [[vael-harbor]] and mother of [[kestrel-vane]]. Trained by Warden [[toril-ashgrave]] within the [[ember-guild]]. Died of the fever, leaving her post and debts to her daughter.`,
  },
  {
    slug: "toril-ashgrave",
    title: "Toril Ashgrave",
    content: `# Toril Ashgrave

Warden of the [[ember-guild]] — a heavy, patient man. Trained [[ysolde-vane]] and now watches over [[kestrel-vane]].

Accused by [[bram-locke]] of concealing a warning about an impending eruption of [[mount-ordan]] from the people of [[vael-harbor]].`,
  },
  {
    slug: "bram-locke",
    title: "Bram Locke",
    content: `# Bram Locke

A courier for the [[tidewright-syndicate]]. Slips into the highest lantern-tower of [[vael-harbor]] carrying a sealed letter.

Caught on the stair by [[kestrel-vane]]; in the lantern-light **her green eyes narrowed** as she read the seal — which bore the mark of the [[mount-ordan]] monastery, not the Syndicate. Bram claims to be only the messenger, warning that Warden [[toril-ashgrave]] has hidden news of a coming eruption.`,
  },
  {
    slug: "vael-harbor",
    title: "Vael Harbor",
    content: `# Vael Harbor

A port city clinging to the black cliffs where the Cinder Sea meets the land, beneath the volcano [[mount-ordan]]. Ash falls year-round; the [[ember-guild]]'s lantern-keepers burn it away with tide-oil each dawn and keep the harbor lit for incoming ships.

Home of [[kestrel-vane]] and the contested prize between the [[ember-guild]] and the [[tidewright-syndicate]].`,
  },
  {
    slug: "mount-ordan",
    title: "Mount Ordan",
    content: `# Mount Ordan

The volcano above [[vael-harbor]], source of the perpetual ashfall. A monastery on its slopes issued the sealed letter carried by [[bram-locke]]. Rumbling ominously as the story opens — an eruption may be near.`,
  },
  {
    slug: "ember-guild",
    title: "Ember Guild",
    content: `# Ember Guild

The order of lantern-keepers sworn to hold back the ash of [[mount-ordan]] and keep [[vael-harbor]]'s ships lit into port. Led by Warden [[toril-ashgrave]]; members include [[kestrel-vane]] and formerly [[ysolde-vane]].

Its old rival is the [[tidewright-syndicate]], which it has thwarted through the public Harbor Charter.`,
  },
  {
    slug: "tidewright-syndicate",
    title: "Tidewright Syndicate",
    content: `# Tidewright Syndicate

A shipping cartel and the old rival of the [[ember-guild]]. Wants the lantern-towers of [[vael-harbor]] privatized and resents the Harbor Charter that keeps them public. Employs the courier [[bram-locke]].`,
  },
];

const RESEARCH: SamplePage[] = [
  {
    slug: "index",
    title: "Index",
    content: `# Index

_Sleep & memory consolidation — literature notes._

## Hypotheses
- [[active-systems-consolidation]] — sleep replays & relocates memories
- [[synaptic-homeostasis-hypothesis]] — sleep downscales synapses

## Methods
- [[targeted-memory-reactivation]] — cueing replay during sleep

## Concepts
- [[slow-wave-sleep]] — the proposed critical window
`,
  },
  {
    slug: "active-systems-consolidation",
    title: "Active Systems Consolidation",
    content: `# Active Systems Consolidation

Hypothesis (Born & Diekelmann, 2010) that during [[slow-wave-sleep]] the hippocampus repeatedly reactivates newly encoded traces and transfers them to neocortical long-term storage. Depends on coupling of slow oscillations, thalamocortical spindles, and hippocampal sharp-wave ripples.

**Contrast:** treats slow-wave sleep as *selectively strengthening* specific traces — the opposite of the global weakening proposed by the [[synaptic-homeostasis-hypothesis]]. Evidence from [[targeted-memory-reactivation]] is often read as support.`,
  },
  {
    slug: "synaptic-homeostasis-hypothesis",
    title: "Synaptic Homeostasis Hypothesis (SHY)",
    content: `# Synaptic Homeostasis Hypothesis (SHY)

Hypothesis (Tononi & Cirelli, 2014) that the core function of sleep is renormalization, not replay: waking potentiates synapses broadly, and sleep — especially [[slow-wave-sleep]] — globally downscales synaptic strength to a sustainable baseline, improving signal-to-noise.

**Conflict:** directly opposes [[active-systems-consolidation]] on whether slow-wave sleep strengthens specific memories or globally weakens synapses.`,
  },
  {
    slug: "targeted-memory-reactivation",
    title: "Targeted Memory Reactivation",
    content: `# Targeted Memory Reactivation

Experimental method: a cue (sound or smell) paired with learning is re-presented during [[slow-wave-sleep]] to bias which memories are replayed. Rasch et al. (2007) report improved retention for cued items — often cited in support of [[active-systems-consolidation]] over a purely global account like the [[synaptic-homeostasis-hypothesis]].`,
  },
  {
    slug: "slow-wave-sleep",
    title: "Slow-Wave Sleep",
    content: `# Slow-Wave Sleep

Deep non-REM sleep, treated as the critical window for memory effects by both major accounts — though they disagree on the mechanism. Central to [[active-systems-consolidation]], the [[synaptic-homeostasis-hypothesis]], and [[targeted-memory-reactivation]].`,
  },
];

const SECOND_BRAIN: SamplePage[] = [
  {
    slug: "index",
    title: "Index",
    content: `# Index

_Notes on note-taking systems._

- [[zettelkasten]] — atomic, densely linked notes
- [[collectors-fallacy]] — collecting mistaken for understanding
- [[progressive-summarization]] — distilling in layers
- [[evergreen-notes]] — notes written to be reused
- [[generation-effect]] — we remember what we produce
`,
  },
  {
    slug: "zettelkasten",
    title: "Zettelkasten",
    content: `# Zettelkasten

A method of atomic, densely linked notes developed by Niklas Luhmann. Core rule: one idea per note, every note explicitly linked, so structure emerges from links rather than folders. Formalizes the same principles as [[evergreen-notes]].`,
  },
  {
    slug: "collectors-fallacy",
    title: "Collector's Fallacy",
    content: `# Collector's Fallacy

The trap of saving articles and highlights you never process — mistaking collecting for understanding. Fails because it skips the [[generation-effect]] entirely. The antidote is [[progressive-summarization]].`,
  },
  {
    slug: "progressive-summarization",
    title: "Progressive Summarization",
    content: `# Progressive Summarization

Revisiting a note and distilling it in layers so the important parts surface over time. Works because it exploits the [[generation-effect]], and it counters the [[collectors-fallacy]]. A practice applied to [[evergreen-notes]].`,
  },
  {
    slug: "evergreen-notes",
    title: "Evergreen Notes",
    content: `# Evergreen Notes

Notes written to be developed and reused across contexts rather than filed once and forgotten. Should be atomic, concept-oriented, and densely linked — the principles the [[zettelkasten]] formalizes. Writing them deliberately exploits the [[generation-effect]].`,
  },
  {
    slug: "generation-effect",
    title: "Generation Effect",
    content: `# Generation Effect

We remember ideas far better when we produce them in our own words rather than copying them. The reason [[progressive-summarization]] works, why [[evergreen-notes]] are written by hand, and why the [[collectors-fallacy]] fails.`,
  },
];

export const WIKI_SAMPLES: WikiSample[] = [
  {
    templateKey: "story-bible",
    wikiName: "The Ashfall Chronicles",
    sourceTitle: "Ashfall — Chapter One",
    content: `The city of Vael Harbor clung to the black cliffs where the Cinder Sea met the land, beneath the volcano Mount Ordan. Kestrel Vane, a lantern-keeper of the Ember Guild, inherited her mother Ysolde's post. One night a Tidewright Syndicate courier, Bram Locke, slipped into the highest tower with a sealed letter bearing the mark of Mount Ordan's monastery — a warning of an eruption that Warden Toril Ashgrave had hidden.`,
    pages: STORY_BIBLE,
  },
  {
    templateKey: "research",
    wikiName: "Sleep & Memory Consolidation",
    sourceTitle: "Notes on sleep and memory consolidation",
    content: `Two ideas anchor the study of how sleep affects memory: the Active Systems Consolidation hypothesis (replay and relocation during slow-wave sleep) and the Synaptic Homeostasis Hypothesis (global synaptic downscaling). They partly conflict. Targeted Memory Reactivation is a common method used to probe them.`,
    pages: RESEARCH,
  },
  {
    templateKey: "second-brain",
    wikiName: "My Second Brain",
    sourceTitle: "Notes on note-taking systems",
    content: `Connected ideas about knowledge systems: the Zettelkasten (atomic linked notes), the Collector's Fallacy, Progressive Summarization, Evergreen Notes, and the Generation Effect.`,
    pages: SECOND_BRAIN,
  },
];

/** Sample offered on the empty-state, keyed by template. `blank` has no sample. */
export function sampleFor(templateKey: string): WikiSample | undefined {
  return WIKI_SAMPLES.find((s) => s.templateKey === templateKey);
}
